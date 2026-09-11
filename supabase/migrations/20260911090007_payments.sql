-- =============================================================================
-- 0007: payment_methods, payment_method_details, payments + the payment
-- submission/review RPCs that orchestrate payment + order status together.
-- =============================================================================

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('mobile_wallet', 'bank_transfer', 'other')),
  name text not null,
  account_holder_name text,
  account_number text,
  iban text,
  bank_name text,
  instructions text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payment_methods_active_idx on public.payment_methods (is_active, display_order);

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

-- 1:1 extension for less-common, type-specific fields, so the common case
-- (payment_methods alone) stays simple while still being extensible without
-- another migration for every new payment method quirk.
create table public.payment_method_details (
  payment_method_id uuid primary key references public.payment_methods(id) on delete cascade,
  swift_code text,
  branch_code text,
  qr_code_url text,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger payment_method_details_set_updated_at
  before update on public.payment_method_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  transaction_reference text,
  -- Bucket-relative path in the PRIVATE payment-proofs bucket. Never a
  -- public URL — always resolved server-side to a short-lived signed URL.
  screenshot_path text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  rejection_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create index payments_status_idx on public.payments (status);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Defense-in-depth: even if a client role ever got table access, it could
-- never self-approve a payment or edit another customer's review fields.
-- In normal operation all writes go through submit_payment/review_payment
-- below (service-role only), so this rarely fires — but it's cheap insurance.
create or replace function public.protect_payment_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_role_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.rejection_reason := null;
    new.rejection_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  new.status := old.status;
  new.rejection_reason := old.rejection_reason;
  new.rejection_note := old.rejection_note;
  new.reviewed_by := old.reviewed_by;
  new.reviewed_at := old.reviewed_at;
  new.order_id := old.order_id;
  new.amount := old.amount;
  return new;
end;
$$;

create trigger payments_protect_columns
  before insert or update on public.payments
  for each row execute function public.protect_payment_columns();

-- ---------------------------------------------------------------------------
-- submit_payment: customer submits payment proof for an order. Locks the
-- order, refuses if it's not in a payable state, records the payment, and
-- (only the first time) advances unconfirmed -> payment_pending.
-- ---------------------------------------------------------------------------
create or replace function public.submit_payment(
  p_order_id uuid,
  p_customer_id uuid,
  p_payment_method_id uuid,
  p_amount numeric,
  p_transaction_reference text,
  p_screenshot_path text,
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_payment public.payments;
begin
  select * into v_order from public.orders
    where id = p_order_id and customer_id = p_customer_id
    for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.status not in ('unconfirmed', 'payment_pending') then
    raise exception 'ORDER_NOT_PAYABLE:%', v_order.status using errcode = '22023';
  end if;

  insert into public.payments (
    order_id, payment_method_id, amount, transaction_reference, screenshot_path, note, status
  ) values (
    p_order_id, p_payment_method_id, p_amount, p_transaction_reference, p_screenshot_path, p_note, 'pending'
  ) returning * into v_payment;

  if v_order.status = 'unconfirmed' then
    perform public.change_order_status(p_order_id, 'payment_pending', p_customer_id, 'Payment proof submitted');
  end if;

  return v_payment;
end;
$$;

revoke all on function public.submit_payment(uuid, uuid, uuid, numeric, text, text, text) from public;
grant execute on function public.submit_payment(uuid, uuid, uuid, numeric, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- review_payment: admin approves/rejects. Atomically updates the payment
-- and drives the matching order-status transition (confirmed, or back to
-- unconfirmed). Refuses to double-review an already-decided payment.
-- ---------------------------------------------------------------------------
create or replace function public.review_payment(
  p_payment_id uuid,
  p_new_status text,
  p_reviewer_id uuid,
  p_rejection_reason text default null,
  p_rejection_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments;
begin
  if p_new_status not in ('approved', 'rejected') then
    raise exception 'INVALID_PAYMENT_STATUS' using errcode = '22023';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'PAYMENT_ALREADY_REVIEWED' using errcode = '22023';
  end if;

  update public.payments
    set status = p_new_status,
        rejection_reason = case when p_new_status = 'rejected' then p_rejection_reason else null end,
        rejection_note = case when p_new_status = 'rejected' then p_rejection_note else null end,
        reviewed_by = p_reviewer_id,
        reviewed_at = now()
    where id = p_payment_id
    returning * into v_payment;

  if p_new_status = 'approved' then
    perform public.change_order_status(v_payment.order_id, 'confirmed', p_reviewer_id, 'Payment approved');
  else
    perform public.change_order_status(
      v_payment.order_id, 'unconfirmed', p_reviewer_id,
      'Payment rejected: ' || coalesce(p_rejection_reason, 'no reason given')
    );
  end if;

  return v_payment;
end;
$$;

revoke all on function public.review_payment(uuid, text, uuid, text, text) from public;
grant execute on function public.review_payment(uuid, text, uuid, text, text) to service_role;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.payment_methods enable row level security;
alter table public.payment_method_details enable row level security;
alter table public.payments enable row level security;

create policy "payment_methods_public_read" on public.payment_methods
  for select
  using (is_active or public.current_role_is_admin());

create policy "payment_methods_admin_write" on public.payment_methods
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "payment_method_details_read" on public.payment_method_details
  for select
  using (
    exists (
      select 1 from public.payment_methods pm
      where pm.id = payment_method_details.payment_method_id
        and (pm.is_active or public.current_role_is_admin())
    )
  );

create policy "payment_method_details_admin_write" on public.payment_method_details
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

-- payments: read-only for client roles (own order, or admin). All writes
-- go through submit_payment/review_payment (service-role only).
create policy "payments_select_own_or_admin" on public.payments
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and (o.customer_id = auth.uid() or public.current_role_is_admin())
    )
  );
