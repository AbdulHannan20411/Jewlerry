-- =============================================================================
-- 0004: catalog — categories, products, product_images, tags, product_tags
-- =============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_slug_idx on public.categories (slug);
create unique index categories_name_lower_idx on public.categories (lower(name));

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text not null default '',
  -- Client-submitted prices/stock are never trusted; these columns are the
  -- server-side source of truth, recalculated/validated in lib/products.
  price_before_discount numeric(12, 2) not null check (price_before_discount >= 0),
  price_after_discount numeric(12, 2) not null check (price_after_discount >= 0),
  quantity_in_stock integer not null default 0 check (quantity_in_stock >= 0),
  is_active boolean not null default true,
  -- Maintained by a trigger on reviews (see 0006_reviews.sql) — never
  -- written directly by application code.
  average_rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_discount_not_greater check (price_after_discount <= price_before_discount)
);

create unique index products_slug_idx on public.products (slug);
create index products_is_active_idx on public.products (is_active);
create index products_created_at_idx on public.products (created_at desc);
create index products_category_idx on public.products (category_id);
create index products_price_after_discount_idx on public.products (price_after_discount);
create index products_average_rating_idx on public.products (average_rating desc);
create index products_search_vector_idx on public.products using gin (search_vector);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  storage_path text not null, -- bucket-relative path, used to delete from Storage
  alt_text text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, display_order);

-- ---------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now()
);

create unique index tags_slug_idx on public.tags (slug);
create unique index tags_name_lower_idx on public.tags (lower(name));

create table public.product_tags (
  product_id uuid not null references public.products(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

create index product_tags_tag_idx on public.product_tags (tag_id);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.tags enable row level security;
alter table public.product_tags enable row level security;

create policy "categories_public_read" on public.categories
  for select
  using (is_active or public.current_role_is_admin());

create policy "categories_admin_write" on public.categories
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "products_public_read" on public.products
  for select
  using (is_active or public.current_role_is_admin());

create policy "products_admin_write" on public.products
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "product_images_read" on public.product_images
  for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.is_active or public.current_role_is_admin())
    )
  );

create policy "product_images_admin_write" on public.product_images
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "tags_public_read" on public.tags
  for select
  using (true);

create policy "tags_admin_write" on public.tags
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());

create policy "product_tags_public_read" on public.product_tags
  for select
  using (true);

create policy "product_tags_admin_write" on public.product_tags
  for all
  using (public.current_role_is_admin())
  with check (public.current_role_is_admin());
