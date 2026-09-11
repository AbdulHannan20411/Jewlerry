-- =============================================================================
-- 0010: contact_messages + faqs
-- =============================================================================

create table public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index contact_messages_is_read_idx on public.contact_messages (is_read);

alter table public.contact_messages enable row level security;

-- Anyone (including a signed-out visitor) can submit the contact form.
-- Application-level rate limiting (check_rate_limit, keyed by IP) guards
-- against spam since RLS alone can't throttle.
create policy "contact_messages_public_insert" on public.contact_messages
  for insert
  with check (true);

create policy "contact_messages_admin_read" on public.contact_messages
  for select
  using (public.current_role_is_admin());

create policy "contact_messages_admin_update" on public.contact_messages
  for update
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "contact_messages_admin_delete" on public.contact_messages
  for delete
  using (public.current_role_is_admin());

-- ---------------------------------------------------------------------------
create table public.faqs (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_active_idx on public.faqs (is_active, display_order);

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

alter table public.faqs enable row level security;

create policy "faqs_public_read" on public.faqs
  for select
  using (is_active or public.current_role_is_admin());

create policy "faqs_admin_write" on public.faqs
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
