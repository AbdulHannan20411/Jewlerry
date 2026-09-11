-- =============================================================================
-- 0009: banners
-- =============================================================================

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  storage_path text not null,
  button_text text,
  button_url text,
  is_active boolean not null default true,
  start_date timestamptz,
  end_date timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint banners_date_range check (start_date is null or end_date is null or start_date <= end_date)
);

create index banners_active_idx on public.banners (is_active, display_order);
create index banners_date_range_idx on public.banners (start_date, end_date);

create trigger banners_set_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

-- The storefront additionally filters by start_date/end_date in the query
-- (a banner can be is_active=true but scheduled for the future/past) — RLS
-- just gates on the admin on/off switch so the admin list can still see
-- inactive banners.
create policy "banners_public_read" on public.banners
  for select
  using (is_active or public.current_role_is_admin());

create policy "banners_admin_write" on public.banners
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
