import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database } from "@/types/database";

/**
 * Currently-active banners for the storefront: is_active=true AND within
 * [start_date, end_date] (both optional). RLS only gates the is_active
 * flag (so admin can still see inactive ones in the admin list) — the
 * date-window check is applied here, in the query itself.
 */
export async function getActiveBanners(supabase: SupabaseClient<Database>) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .or(`start_date.is.null,start_date.lte.${nowIso}`)
    .or(`end_date.is.null,end_date.gte.${nowIso}`)
    .order("display_order");

  if (error) {
    console.error("[getActiveBanners] failed:", error);
    return [];
  }
  return data;
}

/** Admin list — every banner regardless of active/date-window state, paginated. */
export async function searchBanners(
  supabase: SupabaseClient<Database>,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("banners")
    .select("*", { count: "exact" })
    .order("display_order")
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("[searchBanners] failed:", error);
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
