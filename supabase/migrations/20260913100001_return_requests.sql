-- =============================================================================
-- 0020: return_requests — the formal return-approval workflow that sits
-- ahead of the (still terminal) `returned` order status. Mirrors the
-- payments table's shape closely (submit -> pending -> admin approve/
-- reject), since it's the same "customer submits evidence, admin reviews"
-- pattern already established there.
-- =============================================================================

create table public.return_requests (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  reason text not null,
  -- Bucket-relative paths in the PRIVATE return-proofs bucket (mirrors
  -- payments.screenshot_path) — never public URLs, always resolved
  -- server-side to short-lived signed URLs.
  image_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_decision_reason text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint return_requests_has_proof check (array_length(image_paths, 1) >= 1)
);

create index return_requests_order_idx on public.return_requests (order_id);
create index return_requests_status_idx on public.return_requests (status);

create trigger return_requests_set_updated_at
  before update on public.return_requests
  for each row execute function public.set_updated_at();

-- Defense-in-depth, same shape as protect_payment_columns: even a direct
-- service-role UPDATE can't self-approve/edit another customer's request
-- outside request_return/review_return_request/mark_return_received.
create or replace function public.protect_return_request_columns()
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
    new.admin_decision_reason := null;
    new.decided_by := null;
    new.decided_at := null;
    new.received_at := null;
    return new;
  end if;

  new.status := old.status;
  new.admin_decision_reason := old.admin_decision_reason;
  new.decided_by := old.decided_by;
  new.decided_at := old.decided_at;
  new.received_at := old.received_at;
  new.order_id := old.order_id;
  new.customer_id := old.customer_id;
  return new;
end;
$$;

create trigger return_requests_protect_columns
  before insert or update on public.return_requests
  for each row execute function public.protect_return_request_columns();

-- ---------------------------------------------------------------------------
-- request_return: customer-initiated. Locks the order, refuses unless it's
-- in an eligible post-delivery state, snapshots that state into
-- pre_return_status (so a later rejection can restore it precisely), inserts
-- the request, and moves the order to return_initiated.
-- ---------------------------------------------------------------------------
create or replace function public.request_return(
  p_order_id bigint,
  p_customer_id uuid,
  p_title text,
  p_reason text,
  p_image_paths text[]
)
returns public.return_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_request public.return_requests;
begin
  select * into v_order from public.orders
    where id = p_order_id and customer_id = p_customer_id
    for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_order.status not in ('delivered', 'partial_completed', 'completed') then
    raise exception 'ORDER_NOT_RETURNABLE:%', v_order.status using errcode = '22023';
  end if;

  insert into public.return_requests (order_id, customer_id, title, reason, image_paths, status)
  values (p_order_id, p_customer_id, p_title, p_reason, p_image_paths, 'pending')
  returning * into v_request;

  update public.orders set pre_return_status = v_order.status where id = p_order_id;
  perform public.change_order_status(p_order_id, 'return_initiated', p_customer_id, p_reason);

  return v_request;
end;
$$;

revoke all on function public.request_return(bigint, uuid, text, text, text[]) from public;
grant execute on function public.request_return(bigint, uuid, text, text, text[]) to service_role;

-- ---------------------------------------------------------------------------
-- review_return_request: admin approve/reject. Approved moves the order to
-- return_processing (awaiting the physical parcel); rejected restores
-- whichever status the order was in before the request (pre_return_status).
-- ---------------------------------------------------------------------------
create or replace function public.review_return_request(
  p_request_id bigint,
  p_new_status text,
  p_reviewer_id uuid,
  p_admin_reason text default null
)
returns public.return_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.return_requests;
  v_order public.orders;
begin
  if p_new_status not in ('approved', 'rejected') then
    raise exception 'INVALID_RETURN_STATUS' using errcode = '22023';
  end if;

  select * into v_request from public.return_requests where id = p_request_id for update;
  if not found then
    raise exception 'RETURN_REQUEST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'RETURN_REQUEST_ALREADY_REVIEWED' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = v_request.order_id for update;

  update public.return_requests
    set status = p_new_status,
        admin_decision_reason = p_admin_reason,
        decided_by = p_reviewer_id,
        decided_at = now()
    where id = p_request_id
    returning * into v_request;

  if p_new_status = 'approved' then
    perform public.change_order_status(
      v_order.id, 'return_processing', p_reviewer_id,
      coalesce(p_admin_reason, 'Return request approved')
    );
  else
    perform public.change_order_status(
      v_order.id, coalesce(v_order.pre_return_status, 'delivered'), p_reviewer_id,
      'Return request rejected: ' || coalesce(p_admin_reason, 'no reason given')
    );
  end if;

  return v_request;
end;
$$;

revoke all on function public.review_return_request(bigint, text, uuid, text) from public;
grant execute on function public.review_return_request(bigint, text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- mark_return_received: admin confirms the physical parcel arrived back.
-- Final step — moves the order to the terminal `returned` status and
-- stamps the approved request's received_at.
-- ---------------------------------------------------------------------------
create or replace function public.mark_return_received(
  p_order_id bigint,
  p_admin_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'return_processing' then
    raise exception 'ORDER_NOT_AWAITING_RETURN:%', v_order.status using errcode = '22023';
  end if;

  update public.return_requests
    set received_at = now()
    where order_id = p_order_id and status = 'approved' and received_at is null;

  update public.orders set return_reason = null, returned_at = now() where id = p_order_id;
  return public.change_order_status(p_order_id, 'returned', p_admin_id, 'Return received');
end;
$$;

revoke all on function public.mark_return_received(bigint, uuid) from public;
grant execute on function public.mark_return_received(bigint, uuid) to service_role;

-- =============================================================================
-- RLS — read-only for client roles (own order, or admin); all writes go
-- through the three RPCs above (service-role only).
-- =============================================================================

alter table public.return_requests enable row level security;

create policy "return_requests_select_own_or_admin" on public.return_requests
  for select
  using (customer_id = auth.uid() or public.current_role_is_admin());

-- ---------------------------------------------------------------------------
-- Storage: return-proofs bucket, same private/owner-scoped shape as
-- payment-proofs (path convention: return-proofs/{user_id}/{order_id}/{filename}).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('return-proofs', 'return-proofs', false)
on conflict (id) do nothing;

create policy "return_proofs_owner_insert" on storage.objects
  for insert
  with check (
    bucket_id = 'return-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "return_proofs_owner_or_admin_select" on storage.objects
  for select
  using (
    bucket_id = 'return-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role_is_admin()
    )
  );

create policy "return_proofs_admin_delete" on storage.objects
  for delete
  using (
    bucket_id = 'return-proofs'
    and public.current_role_is_admin()
  );
