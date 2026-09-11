-- =============================================================================
-- 0006: reviews — purchase-gated, tied to the specific order that earned
-- eligibility, with product rating aggregates maintained by trigger.
-- =============================================================================

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null default '',
  comment text not null default '',
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One review per product per completed order (a customer who buys the
  -- same product again in a separate order may review that purchase too).
  unique (customer_id, product_id, order_id)
);

create index reviews_product_idx on public.reviews (product_id, is_hidden);
create index reviews_customer_idx on public.reviews (customer_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rule 6: only purchased products can be reviewed. "Purchased" means the
-- named order actually contains this product for this customer, and has
-- reached delivered/completed — enforced here so no application bug can
-- ever let an unpurchased-product review through.
-- ---------------------------------------------------------------------------
create or replace function public.validate_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eligible boolean;
begin
  select exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = new.order_id
      and o.customer_id = new.customer_id
      and oi.product_id = new.product_id
      and o.status in ('delivered', 'completed')
  ) into v_eligible;

  if not v_eligible then
    raise exception 'REVIEW_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger reviews_validate_eligibility
  before insert on public.reviews
  for each row execute function public.validate_review_eligibility();

-- ---------------------------------------------------------------------------
-- Keep products.average_rating / review_count in sync. Hidden reviews are
-- excluded from both, so an admin hiding an inappropriate review also
-- removes it from the displayed average immediately.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
    set average_rating = coalesce((
          select round(avg(r.rating)::numeric, 1) from public.reviews r
          where r.product_id = v_product_id and r.is_hidden = false
        ), 0),
        review_count = (
          select count(*) from public.reviews r
          where r.product_id = v_product_id and r.is_hidden = false
        )
    where p.id = v_product_id;
  return null;
end;
$$;

create trigger reviews_refresh_product_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ---------------------------------------------------------------------------
-- Column-level protection: the review owner may edit rating/title/comment
-- but not re-point the review at a different product/order/customer or
-- unhide it themselves; an admin may only toggle is_hidden, not rewrite the
-- customer's content.
-- ---------------------------------------------------------------------------
create or replace function public.protect_review_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_role_is_admin() then
    new.customer_id := old.customer_id;
    new.product_id := old.product_id;
    new.order_id := old.order_id;
    new.rating := old.rating;
    new.title := old.title;
    new.comment := old.comment;
    return new;
  end if;

  new.customer_id := old.customer_id;
  new.product_id := old.product_id;
  new.order_id := old.order_id;
  new.is_hidden := old.is_hidden;
  return new;
end;
$$;

create trigger reviews_protect_columns
  before update on public.reviews
  for each row execute function public.protect_review_columns();

alter table public.reviews enable row level security;

create policy "reviews_select_visible_or_own_or_admin" on public.reviews
  for select
  using (is_hidden = false or customer_id = auth.uid() or public.current_role_is_admin());

create policy "reviews_insert_own" on public.reviews
  for insert
  with check (customer_id = auth.uid());

create policy "reviews_update_own_or_admin" on public.reviews
  for update
  using (customer_id = auth.uid() or public.current_role_is_admin())
  with check (customer_id = auth.uid() or public.current_role_is_admin());

create policy "reviews_delete_own_or_admin" on public.reviews
  for delete
  using (customer_id = auth.uid() or public.current_role_is_admin());
