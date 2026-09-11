-- =============================================================================
-- 0008: notifications — in-app only. No Realtime/WebSockets; the client
-- polls/refetches (see hooks/use-notifications.ts in a later phase).
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system' check (
    type in ('order', 'payment', 'announcement', 'promotion', 'system')
  ),
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where is_read = false;

-- Owner may only toggle is_read/read_at — not rewrite the notification's
-- content, type, or reassign it to someone else.
create or replace function public.protect_notification_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_role_is_admin() then
    return new;
  end if;

  new.user_id := old.user_id;
  new.title := old.title;
  new.message := old.message;
  new.type := old.type;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_protect_columns
  before update on public.notifications
  for each row execute function public.protect_notification_columns();

alter table public.notifications enable row level security;

create policy "notifications_select_own_or_admin" on public.notifications
  for select
  using (user_id = auth.uid() or public.current_role_is_admin());

-- Broadcast/targeted sends are written by admin server actions via the
-- service-role client; this policy just lets an authenticated admin session
-- do the same directly if ever needed.
create policy "notifications_insert_admin" on public.notifications
  for insert
  with check (public.current_role_is_admin());

create policy "notifications_update_own_or_admin" on public.notifications
  for update
  using (user_id = auth.uid() or public.current_role_is_admin())
  with check (user_id = auth.uid() or public.current_role_is_admin());

create policy "notifications_delete_own_or_admin" on public.notifications
  for delete
  using (user_id = auth.uid() or public.current_role_is_admin());
