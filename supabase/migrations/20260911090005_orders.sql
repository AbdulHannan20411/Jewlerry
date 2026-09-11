-- =============================================================================
-- 0005: orders, order_items, order_status_history + order-creation /
-- status-transition RPCs (the concurrency-safe core of the checkout flow).
-- =============================================================================

create sequence public.order_number_seq;
create sequence public.invoice_number_seq;

create or replace function public.generate_order_number()
returns text
language sql
as $$
  select 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
$$;

create or replace function public.generate_invoice_number()
returns text
language sql
as $$
  select 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0');
$$;

create table public.orders (
  id bigint generated always as identity primary key,
  order_number text not null default public.generate_order_number(),
  invoice_number text not null default public.generate_invoice_number(),
  -- Never cascaded/nulled on customer deletion: accounts are soft-deleted
  -- (profiles.deleted_at) precisely so this FK — and the business record it
  -- protects — always stays intact. Stays UUID: it points at profiles.id,
  -- which is fixed to Supabase Auth's UUID user id.
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'unconfirmed' check (
    status in ('unconfirmed', 'payment_pending', 'confirmed', 'in_process', 'delivered', 'completed', 'returned', 'cancelled')
  ),
  -- Snapshots: recomputed at order-creation time from live product/shipping
  -- data, then frozen. A later price or shipping-cost change must never
  -- alter an existing order's numbers (spec rules 9 & shipping snapshot).
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  shipping_cost numeric(12, 2) not null check (shipping_cost >= 0),
  total numeric(12, 2) not null check (total >= 0),
  currency_code text not null default 'PKR',
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  shipping_address text not null,
  shipping_city text,
  shipping_notes text,
  return_reason text,
  return_notes text,
  returned_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches_parts check (total = subtotal + shipping_cost)
);

create unique index orders_order_number_idx on public.orders (order_number);
create unique index orders_invoice_number_idx on public.orders (invoice_number);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name_snapshot text not null,
  product_image_snapshot_url text,
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) generated always as (unit_price_snapshot * quantity) stored,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------------
create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------------------------------------------------------------------------
-- Defense-in-depth: even a direct service-role UPDATE can't skip a status
-- forward through an illegal transition. This mirrors
-- ORDER_STATUS_TRANSITIONS in src/constants/index.ts — keep both in sync.
-- ---------------------------------------------------------------------------
create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'unconfirmed' then new.status in ('payment_pending', 'cancelled')
    when 'payment_pending' then new.status in ('confirmed', 'unconfirmed', 'cancelled')
    when 'confirmed' then new.status in ('in_process', 'cancelled')
    when 'in_process' then new.status in ('delivered', 'cancelled')
    when 'delivered' then new.status in ('completed', 'returned')
    when 'completed' then new.status in ('returned')
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger orders_validate_status_transition
  before update of status on public.orders
  for each row execute function public.validate_order_status_transition();

-- ---------------------------------------------------------------------------
-- change_order_status: the ONLY way an order's status changes. Atomically
-- (a) locks the order row, (b) updates status (firing the transition-
-- validation trigger above), (c) appends order_status_history. Callers
-- (Server Actions) are responsible for authorization — who is allowed to
-- request this particular transition — before invoking it.
-- ---------------------------------------------------------------------------
create or replace function public.change_order_status(
  p_order_id bigint,
  p_new_status text,
  p_changed_by uuid,
  p_reason text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_status text;
  v_order public.orders;
begin
  select status into v_old_status from public.orders where id = p_order_id for update;

  if not found then
    raise exception 'Order % not found', p_order_id using errcode = 'P0002';
  end if;

  update public.orders set status = p_new_status where id = p_order_id
    returning * into v_order;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by, reason)
  values (p_order_id, v_old_status, p_new_status, p_changed_by, p_reason);

  return v_order;
end;
$$;

revoke all on function public.change_order_status(bigint, text, uuid, text) from public;
grant execute on function public.change_order_status(bigint, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- create_order: the concurrency-safe checkout core.
--   p_items: jsonb array of { "product_id": bigint, "quantity": int }
-- Locks every referenced product row (in a fixed id order, to avoid
-- deadlocking against another concurrent checkout), validates each is
-- active with enough stock, computes the subtotal from *current*
-- server-side prices (never the client's), snapshots shipping cost from
-- site_settings, then decrements stock and writes order_items with frozen
-- price/name/image snapshots. All-or-nothing: any failure rolls back the
-- whole order, including the stock decrements.
--
-- The order row is inserted (letting its bigint identity auto-generate)
-- only after pass 1 validates everything — unlike a client-generated UUID,
-- an identity value can't be minted ahead of the INSERT, so the order
-- didn't exist yet during validation anyway; this ordering costs nothing.
-- ---------------------------------------------------------------------------
create or replace function public.create_order(
  p_customer_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_shipping_address text,
  p_shipping_city text default null,
  p_shipping_notes text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_product public.products%rowtype;
  v_subtotal numeric(12, 2) := 0;
  v_shipping numeric(12, 2);
  v_currency text;
  v_order public.orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_EMPTY' using errcode = '22023';
  end if;

  select shipping_cost, currency_code into v_shipping, v_currency
    from public.site_settings where id = 1;

  -- Pass 1: lock + validate every product, in a stable order, accumulate subtotal.
  for v_item in
    select (elem ->> 'product_id')::bigint as product_id, (elem ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as elem
    order by (elem ->> 'product_id')::bigint
  loop
    if v_item.product_id is null or v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'ORDER_INVALID_ITEM' using errcode = '22023';
    end if;

    select * into v_product from public.products
      where id = v_item.product_id and is_active = true
      for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND:%', v_item.product_id using errcode = 'P0002';
    end if;

    if v_product.quantity_in_stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%:%:%', v_product.id, v_product.name, v_product.quantity_in_stock
        using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + (v_product.price_after_discount * v_item.quantity);
  end loop;

  insert into public.orders (
    customer_id, status, subtotal, shipping_cost, total, currency_code,
    customer_name, customer_phone, customer_email, shipping_address, shipping_city, shipping_notes
  ) values (
    p_customer_id, 'unconfirmed', v_subtotal, v_shipping, v_subtotal + v_shipping,
    coalesce(v_currency, 'PKR'), p_customer_name, p_customer_phone, p_customer_email,
    p_shipping_address, p_shipping_city, p_shipping_notes
  ) returning * into v_order;

  -- Pass 2: decrement stock + write frozen line-item snapshots.
  for v_item in
    select (elem ->> 'product_id')::bigint as product_id, (elem ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as elem
  loop
    select * into v_product from public.products where id = v_item.product_id;

    update public.products
      set quantity_in_stock = quantity_in_stock - v_item.quantity
      where id = v_item.product_id;

    insert into public.order_items (
      order_id, product_id, product_name_snapshot, product_image_snapshot_url,
      unit_price_snapshot, quantity
    ) values (
      v_order.id, v_product.id, v_product.name,
      (select url from public.product_images where product_id = v_product.id order by display_order limit 1),
      v_product.price_after_discount, v_item.quantity
    );
  end loop;

  insert into public.order_status_history (order_id, old_status, new_status, changed_by, reason)
  values (v_order.id, null, 'unconfirmed', p_customer_id, 'Order created');

  return v_order;
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.create_order(uuid, jsonb, text, text, text, text, text, text) to service_role;

-- =============================================================================
-- RLS — all writes to these three tables go through the RPCs above (called
-- from Server Actions with the service-role client, after application-level
-- authorization). Client roles get read-only, own-records-only access.
-- =============================================================================

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create policy "orders_select_own_or_admin" on public.orders
  for select
  using (customer_id = auth.uid() or public.current_role_is_admin());

create policy "order_items_select_own_or_admin" on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or public.current_role_is_admin())
    )
  );

create policy "order_status_history_select_own_or_admin" on public.order_status_history
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (o.customer_id = auth.uid() or public.current_role_is_admin())
    )
  );
