import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface ProductReview {
  id: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  customerName: string;
}

/**
 * Read-only for now (Phase 5) — just enough to show existing reviews on
 * the product detail page. Submission/edit/delete (which need purchase
 * eligibility) land in Phase 10. Uses the get_product_reviews RPC rather
 * than a direct join because profiles RLS (deliberately) blocks reading
 * another customer's profile row — the RPC exposes only a display name.
 */
export async function getProductReviews(
  supabase: SupabaseClient<Database>,
  productId: number,
  limit = 20,
): Promise<ProductReview[]> {
  const { data, error } = await supabase.rpc("get_product_reviews", {
    p_product_id: productId,
    p_limit: limit,
  });

  if (error || !data) {
    if (error) console.error("[getProductReviews] failed:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    createdAt: row.created_at,
    customerName: row.customer_display_name,
  }));
}
