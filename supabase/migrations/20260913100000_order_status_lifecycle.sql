-- =============================================================================
-- 0019: Extends the order status lifecycle with:
--   - partial_completed: an order with more than one product where the
--     customer has reviewed some but not all of them (delivered/
--     partial_completed -> completed once every product is reviewed).
--   - return_initiated / return_processing: a formal return-approval
--     workflow ahead of the existing terminal `returned` status —
--     initiated by the customer (with proof), reviewed by an admin
--     (approve/reject), then marked received once the parcel is back.
--
-- orders.status has no ENUM type (plain text + CHECK), so widening it is a
-- CHECK-constraint swap, not an ALTER TYPE — no transaction-boundary
-- restrictions, safe to do together with the transition-trigger update in
-- one migration.
-- =============================================================================

-- Drop whatever the status CHECK constraint happens to be named (found by
-- content, not assumed name) and replace it with the widened list.
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'orders'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%status%unconfirmed%'
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.orders add constraint orders_status_check check (
  status in (
    'unconfirmed', 'payment_pending', 'confirmed', 'in_process', 'delivered',
    'partial_completed', 'completed',
    'return_initiated', 'return_processing', 'returned',
    'cancelled'
  )
);

-- Captured when an order enters return_initiated, so a rejected return
-- request can put the order back exactly where it was (delivered,
-- partial_completed, or completed) instead of guessing.
alter table public.orders add column pre_return_status text;

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
    when 'delivered' then new.status in ('completed', 'partial_completed', 'return_initiated')
    when 'partial_completed' then new.status in ('completed', 'return_initiated')
    when 'completed' then new.status in ('return_initiated')
    -- return_initiated's target is either the approval step, or a revert
    -- back to whichever of the three pre-return states this order was in
    -- (review_return_request picks the exact one; the trigger just bounds
    -- the state space as defense-in-depth).
    when 'return_initiated' then new.status in ('return_processing', 'delivered', 'partial_completed', 'completed')
    when 'return_processing' then new.status in ('returned')
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status
      using errcode = '22023';
  end if;

  return new;
end;
$$;

-- Review eligibility now also covers partial_completed — a customer with
-- some products already reviewed must still be able to review the rest.
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
      and o.status in ('delivered', 'partial_completed', 'completed')
  ) into v_eligible;

  if not v_eligible then
    raise exception 'REVIEW_NOT_ELIGIBLE' using errcode = '22023';
  end if;

  return new;
end;
$$;
