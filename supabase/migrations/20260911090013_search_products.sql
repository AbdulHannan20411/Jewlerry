-- =============================================================================
-- 0013: search_products — the single query behind both the storefront
-- listing (search + filter + sort + pagination) and the admin product
-- table. Deliberately NOT security definer: it runs with the caller's own
-- privileges, so the existing products RLS policy (is_active OR admin)
-- still applies on top of p_include_inactive — a non-admin passing that
-- flag simply gets nothing extra, RLS still hides inactive rows.
-- =============================================================================

create or replace function public.search_products(
  p_query text default null,
  p_tag_slug text default null,
  p_category_slug text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_rating numeric default null,
  p_in_stock_only boolean default false,
  p_new_within_days integer default null,
  p_sort text default 'newest',
  p_page integer default 1,
  p_page_size integer default 20,
  p_include_inactive boolean default false
)
returns table (
  id bigint,
  category_id bigint,
  name text,
  slug text,
  description text,
  price_before_discount numeric,
  price_after_discount numeric,
  quantity_in_stock integer,
  is_active boolean,
  average_rating numeric,
  review_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  primary_image_url text,
  total_count bigint
)
language sql
stable
as $$
  select
    p.id, p.category_id, p.name, p.slug, p.description,
    p.price_before_discount, p.price_after_discount, p.quantity_in_stock,
    p.is_active, p.average_rating, p.review_count, p.created_at, p.updated_at,
    (
      select pi.url from public.product_images pi
      where pi.product_id = p.id
      order by pi.display_order
      limit 1
    ) as primary_image_url,
    count(*) over() as total_count
  from public.products p
  where (p_include_inactive or p.is_active)
    and (p_query is null or p_query = '' or p.search_vector @@ websearch_to_tsquery('english', p_query))
    and (
      p_category_slug is null
      or p.category_id = (select c.id from public.categories c where c.slug = p_category_slug)
    )
    and (
      p_tag_slug is null
      or exists (
        select 1 from public.product_tags pt
        join public.tags t on t.id = pt.tag_id
        where pt.product_id = p.id and t.slug = p_tag_slug
      )
    )
    and (p_min_price is null or p.price_after_discount >= p_min_price)
    and (p_max_price is null or p.price_after_discount <= p_max_price)
    and (p_min_rating is null or p.average_rating >= p_min_rating)
    and (not p_in_stock_only or p.quantity_in_stock > 0)
    and (p_new_within_days is null or p.created_at >= now() - make_interval(days => p_new_within_days))
  order by
    -- p_sort is a single constant argument, so exactly one of these case
    -- expressions is non-null across every row for a given call; the rest
    -- are uniformly null and so no-ops as sort keys. p.created_at desc is
    -- the always-applied final tiebreaker.
    case when p_sort = 'newest' then p.created_at end desc,
    case when p_sort = 'oldest' then p.created_at end asc,
    case when p_sort = 'name_asc' then p.name end asc,
    case when p_sort = 'name_desc' then p.name end desc,
    case when p_sort = 'price_asc' then p.price_after_discount end asc,
    case when p_sort = 'price_desc' then p.price_after_discount end desc,
    case when p_sort = 'rating' then p.average_rating end desc,
    p.created_at desc
  limit greatest(p_page_size, 1)
  offset (greatest(p_page, 1) - 1) * greatest(p_page_size, 1);
$$;

grant execute on function public.search_products(
  text, text, text, numeric, numeric, numeric, boolean, integer, text, integer, integer, boolean
) to anon, authenticated;
