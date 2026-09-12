import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database, SearchProductsRow } from "@/types/database";
import type { ProductFilters } from "@/lib/validations/products";

export interface ProductListItem extends Omit<SearchProductsRow, "total_count"> {
  tags: { id: number; name: string; slug: string }[];
}

export interface ProductListResult {
  items: ProductListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * The one query behind both the storefront listing and the admin product
 * table (pass includeInactive: true for the latter — RLS still hides
 * inactive rows from a non-admin caller regardless of that flag, see
 * migration 0013). Batches a second query for tags per product rather
 * than embedding them in the RPC, since PostgREST RPC calls can't easily
 * return nested arrays typed the way a normal `.select()` embed can.
 */
export async function searchProducts(
  supabase: SupabaseClient<Database>,
  filters: ProductFilters,
  options: { includeInactive?: boolean; pageSize?: number } = {},
): Promise<ProductListResult> {
  const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, 100);

  const { data, error } = await supabase.rpc("search_products", {
    p_query: filters.q || null,
    p_tag_slug: filters.tag || null,
    p_category_slug: filters.category || null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_min_rating: filters.minRating ?? null,
    p_in_stock_only: filters.inStockOnly ?? false,
    p_new_within_days: filters.newWithinDays ?? null,
    p_sort: filters.sort,
    p_page: filters.page,
    p_page_size: pageSize,
    p_include_inactive: options.includeInactive ?? false,
  });

  if (error) {
    console.error("[searchProducts] RPC failed:", error);
    return { items: [], totalCount: 0, page: filters.page, pageSize, pageCount: 0 };
  }

  const rows = (data ?? []) as SearchProductsRow[];
  const totalCount = rows[0]?.total_count ?? 0;

  const tagsByProduct = await batchFetchTags(
    supabase,
    rows.map((r) => r.id),
  );

  // total_count is only needed for the pagination math above; the rest of
  // each row is spread as-is (the extra field just isn't part of the
  // ProductListItem type, harmless to still carry at runtime).
  const items: ProductListItem[] = rows.map((row) => ({
    ...row,
    tags: tagsByProduct.get(row.id) ?? [],
  }));

  return {
    items,
    totalCount,
    page: filters.page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

async function batchFetchTags(
  supabase: SupabaseClient<Database>,
  productIds: number[],
): Promise<Map<number, { id: number; name: string; slug: string }[]>> {
  const map = new Map<number, { id: number; name: string; slug: string }[]>();
  if (productIds.length === 0) return map;

  const { data, error } = await supabase
    .from("product_tags")
    .select("product_id, tags(id, name, slug)")
    .in("product_id", productIds);

  if (error || !data) {
    if (error) console.error("[batchFetchTags] failed:", error);
    return map;
  }

  for (const row of data as unknown as {
    product_id: number;
    tags: { id: number; name: string; slug: string } | null;
  }[]) {
    if (!row.tags) continue;
    const list = map.get(row.product_id) ?? [];
    list.push(row.tags);
    map.set(row.product_id, list);
  }
  return map;
}

export interface ProductDetail {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string;
  priceBeforeDiscount: number;
  priceAfterDiscount: number;
  quantityInStock: number;
  isActive: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  images: { id: number; url: string; altText: string; displayOrder: number }[];
  tags: { id: number; name: string; slug: string }[];
}

export async function getProductBySlug(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<ProductDetail | null> {
  const { data: product, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("slug", slug)
    .single();

  if (error || !product) return null;

  const [{ data: images }, { data: tagLinks }] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, url, alt_text, display_order")
      .eq("product_id", product.id)
      .order("display_order"),
    supabase
      .from("product_tags")
      .select("tags(id, name, slug)")
      .eq("product_id", product.id),
  ]);

  return {
    id: product.id,
    categoryId: product.category_id,
    categoryName: (product as unknown as { categories: { name: string } | null }).categories
      ?.name ?? null,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceBeforeDiscount: product.price_before_discount,
    priceAfterDiscount: product.price_after_discount,
    quantityInStock: product.quantity_in_stock,
    isActive: product.is_active,
    averageRating: product.average_rating,
    reviewCount: product.review_count,
    createdAt: product.created_at,
    images: (images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.alt_text,
      displayOrder: img.display_order,
    })),
    tags: (
      (tagLinks ?? []) as unknown as { tags: { id: number; name: string; slug: string } | null }[]
    )
      .map((t) => t.tags)
      .filter((t): t is { id: number; name: string; slug: string } => t !== null),
  };
}

export interface ProductImageRow {
  id: number;
  url: string;
  altText: string;
  displayOrder: number;
}

/** Product data shaped for the admin edit form + image manager, in one query pass. */
export async function getProductForEdit(supabase: SupabaseClient<Database>, id: number) {
  const [{ data: product, error }, { data: tagLinks }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("product_tags").select("tag_id").eq("product_id", id),
    supabase
      .from("product_images")
      .select("id, url, alt_text, display_order")
      .eq("product_id", id)
      .order("display_order"),
  ]);

  if (error || !product) return null;

  return {
    product,
    tagIds: (tagLinks ?? []).map((t) => t.tag_id),
    images: (images ?? []).map(
      (img): ProductImageRow => ({
        id: img.id,
        url: img.url,
        altText: img.alt_text,
        displayOrder: img.display_order,
      }),
    ),
  };
}

export async function getProductById(supabase: SupabaseClient<Database>, id: number) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

export async function searchTags(
  supabase: SupabaseClient<Database>,
  options: { q?: string; page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase.from("tags").select("*", { count: "exact" }).order("name");
  if (options.q) query = query.ilike("name", `%${options.q}%`);

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) {
    console.error("[searchTags] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  return {
    items: data ?? [],
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getAllTags(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) {
    console.error("[getAllTags] failed:", error);
    return [];
  }
  return data;
}

/** Unpaginated — used to populate dropdowns/filters (product form, storefront nav) that need every category, not one page of them. */
export async function getAllCategories(
  supabase: SupabaseClient<Database>,
  options: { activeOnly?: boolean } = {},
) {
  let query = supabase.from("categories").select("*").order("display_order");
  if (options.activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) {
    console.error("[getAllCategories] failed:", error);
    return [];
  }
  return data;
}

/** Paginated — for the admin categories list page. */
export async function searchCategories(
  supabase: SupabaseClient<Database>,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("categories")
    .select("*", { count: "exact" })
    .order("display_order")
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("[searchCategories] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  return {
    items: data ?? [],
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
