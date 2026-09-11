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

export interface MyReview {
  id: number;
  productId: number;
  orderId: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The current customer's own review for one product (across any of their
 * orders) — reviews RLS lets a customer always select their own row
 * regardless of `is_hidden`, so this is a direct table query, not the
 * public RPC. Used to show edit/delete controls instead of a "write a
 * review" CTA on the product detail page.
 */
export async function getMyReviewForProduct(
  supabase: SupabaseClient<Database>,
  customerId: string,
  productId: number,
): Promise<MyReview | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, order_id, rating, title, comment, created_at, updated_at")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    productId: data.product_id,
    orderId: data.order_id,
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * The order id to submit a *new* review against for this product — the
 * earliest delivered/completed order containing the product that the
 * customer hasn't already reviewed. Mirrors validate_review_eligibility's
 * SQL trigger exactly, so the UI never offers a review the RPC would
 * reject (belt-and-suspenders: the trigger is still the real guarantee).
 */
export async function getEligibleReviewOrderId(
  supabase: SupabaseClient<Database>,
  customerId: string,
  productId: number,
): Promise<number | null> {
  const [{ data: orderItems }, { data: reviewedOrderIds }] = await Promise.all([
    supabase
      .from("order_items")
      .select("order_id, orders!inner(customer_id, status, created_at)")
      .eq("product_id", productId)
      .eq("orders.customer_id", customerId)
      .in("orders.status", ["delivered", "completed"]),
    supabase.from("reviews").select("order_id").eq("customer_id", customerId).eq("product_id", productId),
  ]);

  const reviewed = new Set((reviewedOrderIds ?? []).map((r) => r.order_id));
  const eligible = (orderItems ?? [])
    .filter((oi) => !reviewed.has(oi.order_id))
    .sort(
      (a, b) =>
        new Date((a.orders as unknown as { created_at: string }).created_at).getTime() -
        new Date((b.orders as unknown as { created_at: string }).created_at).getTime(),
    );

  return eligible[0]?.order_id ?? null;
}

/** For the account order-detail page: has this exact (customer, order, product) already been reviewed? */
export async function getReviewForOrderItem(
  supabase: SupabaseClient<Database>,
  customerId: string,
  orderId: number,
  productId: number,
): Promise<MyReview | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, order_id, rating, title, comment, created_at, updated_at")
    .eq("customer_id", customerId)
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    productId: data.product_id,
    orderId: data.order_id,
    rating: data.rating,
    title: data.title,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export interface MyReviewListItem extends MyReview {
  productName: string;
  productImageUrl: string | null;
  productSlug: string;
}

export async function getCustomerReviews(
  supabase: SupabaseClient<Database>,
  customerId: string,
): Promise<MyReviewListItem[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, product_id, order_id, rating, title, comment, created_at, updated_at, products(name, slug, product_images(url, display_order))",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    if (error) console.error("[getCustomerReviews] failed:", error);
    return [];
  }

  return (
    data as unknown as {
      id: number;
      product_id: number;
      order_id: number;
      rating: number;
      title: string;
      comment: string;
      created_at: string;
      updated_at: string;
      products: { name: string; slug: string; product_images: { url: string; display_order: number }[] } | null;
    }[]
  ).map((row) => {
    const images = [...(row.products?.product_images ?? [])].sort((a, b) => a.display_order - b.display_order);
    return {
      id: row.id,
      productId: row.product_id,
      orderId: row.order_id,
      rating: row.rating,
      title: row.title,
      comment: row.comment,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      productName: row.products?.name ?? "Product",
      productSlug: row.products?.slug ?? "",
      productImageUrl: images[0]?.url ?? null,
    };
  });
}
