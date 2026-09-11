import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Unlike orders/payments, reviews RLS lets a customer write their own rows
 * directly (`reviews_insert_own`/`reviews_update_own_or_admin`/
 * `reviews_delete_own_or_admin`), so these take the caller's own session
 * client — no service-role needed, and the `validate_review_eligibility`
 * trigger is the real enforcement either way.
 */
export async function createReview(
  supabase: SupabaseClient<Database>,
  params: { productId: number; orderId: number; customerId: string; rating: number; title: string; comment: string },
) {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: params.productId,
      order_id: params.orderId,
      customer_id: params.customerId,
      rating: params.rating,
      title: params.title,
      comment: params.comment,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("REVIEW_NOT_ELIGIBLE")) {
      return { ok: false as const, error: "You can only review products from a delivered or completed order." };
    }
    if (error.code === "23505") {
      return { ok: false as const, error: "You've already reviewed this product for this order." };
    }
    return { ok: false as const, error: "Could not submit your review." };
  }
  return { ok: true as const, review: data };
}

/** RLS scopes update/delete to the caller's own review (or admin), so a foreign id just matches 0 rows — treated as "not found," not a 403. */
export async function updateReview(
  supabase: SupabaseClient<Database>,
  reviewId: number,
  params: { rating: number; title: string; comment: string },
) {
  const { data, error } = await supabase
    .from("reviews")
    .update({ rating: params.rating, title: params.title, comment: params.comment })
    .eq("id", reviewId)
    .select()
    .maybeSingle();

  if (error) return { ok: false as const, error: "Could not update your review." };
  if (!data) return { ok: false as const, error: "Review not found." };
  return { ok: true as const };
}

export async function deleteReview(supabase: SupabaseClient<Database>, reviewId: number) {
  const { data, error } = await supabase.from("reviews").delete().eq("id", reviewId).select().maybeSingle();
  if (error) return { ok: false as const, error: "Could not delete your review." };
  if (!data) return { ok: false as const, error: "Review not found." };
  return { ok: true as const };
}
