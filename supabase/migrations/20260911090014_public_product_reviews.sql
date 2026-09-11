-- =============================================================================
-- 0014: get_product_reviews — public review display needs the reviewer's
-- name, but profiles RLS is deliberately locked to self/admin (a customer
-- must never read another customer's profile row). Rather than loosen that
-- broadly, this SECURITY DEFINER RPC exposes only a display name (never
-- email/phone/role/etc.) for reviews that are actually visible to the
-- caller (RLS-equivalent is_hidden filter re-implemented here explicitly,
-- since SECURITY DEFINER bypasses reviews RLS too).
-- =============================================================================

create or replace function public.get_product_reviews(
  p_product_id bigint,
  p_limit integer default 20
)
returns table (
  id bigint,
  rating smallint,
  title text,
  comment text,
  created_at timestamptz,
  customer_display_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.id,
    r.rating,
    r.title,
    r.comment,
    r.created_at,
    coalesce(nullif(p.full_name, ''), p.username, 'Customer') as customer_display_name
  from public.reviews r
  join public.profiles p on p.id = r.customer_id
  where r.product_id = p_product_id
    and r.is_hidden = false
  order by r.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_product_reviews(bigint, integer) to anon, authenticated;
