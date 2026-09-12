import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database } from "@/types/database";

/** Paginated — for the admin FAQs list page (the public /faq page queries `faqs` directly, unpaginated by design — it shows every active FAQ on one page). */
export async function searchFaqs(
  supabase: SupabaseClient<Database>,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("faqs")
    .select("*", { count: "exact" })
    .order("display_order")
    .range(from, from + pageSize - 1);

  if (error) {
    console.error("[searchFaqs] failed:", error);
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
