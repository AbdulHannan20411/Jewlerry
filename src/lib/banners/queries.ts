import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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

/** Admin list — every banner regardless of active/date-window state. */
export async function getAllBanners(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("banners").select("*").order("display_order");
  if (error) {
    console.error("[getAllBanners] failed:", error);
    return [];
  }
  return data;
}
