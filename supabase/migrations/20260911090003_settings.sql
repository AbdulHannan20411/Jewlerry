-- =============================================================================
-- 0003: site_settings (public store config) + admin_settings (internal config)
-- Both are singleton tables (id fixed to 1) so the app never has to handle
-- a "settings row doesn't exist yet" case.
-- =============================================================================

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Atelier Jewelry',
  store_email text,
  store_phone text,
  whatsapp_number text,
  address text,
  business_hours text,
  social_links jsonb not null default '[]'::jsonb, -- [{ "label": "Instagram", "url": "..." }]
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  shipping_cost numeric(12, 2) not null default 250 check (shipping_cost >= 0),
  currency_code text not null default 'PKR',
  dark_mode_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

create table public.admin_settings (
  id smallint primary key default 1 check (id = 1),
  invoice_prefix text not null default 'INV',
  -- Orders left in `unconfirmed` with no payment proof submitted for this
  -- many hours are eligible for the auto-cancel job to cancel them.
  order_auto_cancel_unconfirmed_hours integer not null default 48 check (order_auto_cancel_unconfirmed_hours > 0),
  notify_admin_on_new_order boolean not null default true,
  notify_admin_on_payment_submitted boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.admin_settings (id) values (1);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger admin_settings_set_updated_at
  before update on public.admin_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;
alter table public.admin_settings enable row level security;

-- Public storefront needs shipping cost, contact info, dark-mode-enabled,
-- etc. — readable by anyone, including anon.
create policy "site_settings_public_read" on public.site_settings
  for select
  using (true);

create policy "site_settings_admin_write" on public.site_settings
  for update
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "admin_settings_admin_only" on public.admin_settings
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
