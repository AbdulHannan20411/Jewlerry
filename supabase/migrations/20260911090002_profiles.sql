-- =============================================================================
-- 0002: profiles (1:1 with auth.users) + role helpers + audit_logs
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  full_name text not null default '',
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  theme_preference text not null default 'system' check (theme_preference in ('light', 'dark', 'system')),
  -- Forced on the bootstrap admin account; cleared once the password is changed.
  must_change_password boolean not null default false,
  blocked_at timestamptz,
  blocked_reason text,
  -- Soft-delete: row is anonymized + kept (not removed) so historical
  -- orders/reviews/payments retain a valid customer_id. The matching
  -- auth.users row is banned (not deleted) via the Auth admin API — see
  -- lib/auth/delete-account.ts.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 30),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_.]+$')
);

create unique index profiles_username_lower_idx on public.profiles (lower(username));
create unique index profiles_email_lower_idx on public.profiles (lower(email));
create index profiles_role_idx on public.profiles (role);
create index profiles_deleted_at_idx on public.profiles (deleted_at);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role helpers used throughout RLS policies (this file onward). SECURITY
-- DEFINER + fixed search_path so they can't be tricked by a caller-controlled
-- search_path, and so they can read profiles regardless of the caller's own
-- row-level grants (avoids infinite recursion in profiles' own policies).
-- ---------------------------------------------------------------------------
create or replace function public.current_role_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and deleted_at is null
  );
$$;

create or replace function public.current_profile_is_blocked()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (blocked_at is not null or deleted_at is not null)
  );
$$;

-- ---------------------------------------------------------------------------
-- Prevent a non-admin, non-service-role caller from writing role / block /
-- delete / must_change_password columns directly, even if a bug in RLS or
-- application code ever let an UPDATE statement through. This is
-- defense-in-depth on top of (not instead of) server-side authorization.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.current_role_is_admin() then
    return new;
  end if;

  new.role := old.role;
  new.blocked_at := old.blocked_at;
  new.blocked_reason := old.blocked_reason;
  new.deleted_at := old.deleted_at;
  new.must_change_password := old.must_change_password;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new Supabase Auth user is created.
-- signUp() is called with options.data = { username, full_name, phone } from
-- the registration form; this trigger reads that metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Username-or-email login: Supabase Auth only signs in by email, so the
-- login server action looks up the email first via this SECURITY DEFINER
-- RPC (service-role only — never exposed to the anon/authenticated client
-- directly) and then calls signInWithPassword with the resolved email.
-- Always returns a row shape (or null) — never distinguishes "no such user"
-- from "wrong password" to the caller.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_email_for_login(p_identifier text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.profiles
  where (lower(username) = lower(p_identifier) or lower(email) = lower(p_identifier))
    and deleted_at is null
  limit 1;
$$;

revoke all on function public.lookup_email_for_login(text) from public;
grant execute on function public.lookup_email_for_login(text) to service_role;

-- ---------------------------------------------------------------------------
-- audit_logs — append-only trail of sensitive admin actions. Written from
-- application code (server actions/route handlers) via the service-role
-- client, not triggers, so it can carry a human-readable `action` string
-- plus free-form metadata.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select
  using (id = auth.uid() or public.current_role_is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update
  using (id = auth.uid() or public.current_role_is_admin())
  with check (id = auth.uid() or public.current_role_is_admin());

-- No insert/delete policy: rows are created only by the on_auth_user_created
-- trigger and never hard-deleted from the client.

create policy "audit_logs_admin_read" on public.audit_logs
  for select
  using (public.current_role_is_admin());
-- Writes to audit_logs go through the service-role client only.
