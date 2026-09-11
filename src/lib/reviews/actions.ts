"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createReview, updateReview, deleteReview, setReviewHidden } from "@/lib/reviews/mutations";
import { writeAuditLog } from "@/lib/audit";
import { reviewFormSchema, updateReviewSchema, type ReviewFormInput, type UpdateReviewInput } from "@/lib/validations/reviews";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

async function revalidateProductBySlug(productId: number) {
  const supabase = await createServerSupabaseClient();
  // No direct id->slug lookup helper exists; product detail pages are
  // revalidated by path, so look the slug up the one place it's indexed.
  const { data } = await supabase.from("products").select("slug").eq("id", productId).maybeSingle();
  if (data?.slug) revalidatePath(`/products/${data.slug}`);
}

export async function submitReviewAction(input: ReviewFormInput): Promise<ActionResult> {
  const parsed = reviewFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const result = await createReview(supabase, {
    productId: parsed.data.productId,
    orderId: parsed.data.orderId,
    customerId: profile.id,
    rating: parsed.data.rating,
    title: parsed.data.title,
    comment: parsed.data.comment,
  });
  if (!result.ok) return actionError(result.error);

  await revalidateProductBySlug(parsed.data.productId);
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  revalidatePath("/account/reviews");
  return actionOk(undefined);
}

export async function updateReviewAction(input: UpdateReviewInput): Promise<ActionResult> {
  const parsed = updateReviewSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  await requireUser();
  const supabase = await createServerSupabaseClient();
  const result = await updateReview(supabase, parsed.data.reviewId, {
    rating: parsed.data.rating,
    title: parsed.data.title,
    comment: parsed.data.comment,
  });
  if (!result.ok) return actionError(result.error);

  revalidatePath("/account/reviews");
  return actionOk(undefined);
}

export async function deleteReviewAction(reviewId: number): Promise<ActionResult> {
  await requireUser();
  const supabase = await createServerSupabaseClient();
  const result = await deleteReview(supabase, reviewId);
  if (!result.ok) return actionError(result.error);

  revalidatePath("/account/reviews");
  return actionOk(undefined);
}

export async function toggleReviewHiddenAction(reviewId: number, isHidden: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await setReviewHidden(supabase, reviewId, isHidden);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: isHidden ? "review.hidden" : "review.unhidden",
    entityType: "reviews",
    entityId: reviewId,
  });

  revalidatePath("/admin/reviews");
  return actionOk(undefined);
}
