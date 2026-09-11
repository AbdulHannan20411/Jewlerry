import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface CartLineDetail {
  productId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  priceBeforeDiscount: number;
  requestedQuantity: number;
  availableStock: number;
  isActive: boolean;
  /** False if the product was deleted since it was added to the cart. */
  exists: boolean;
}

/**
 * Rule 8: the cart itself lives in localStorage (just productId +
 * quantity), and is NEVER trusted for price or stock — this re-fetches
 * both fresh from the server every time the cart/checkout is opened. A
 * missing or inactive product is flagged (exists/isActive: false) so the
 * UI can prompt the customer to remove it rather than silently dropping it.
 */
export async function refreshCartDetails(
  items: { productId: number; quantity: number }[],
  supabaseClient?: SupabaseClient<Database>,
): Promise<CartLineDetail[]> {
  if (items.length === 0) return [];

  const supabase = supabaseClient ?? (await createServerSupabaseClient());
  const ids = items.map((i) => i.productId);

  const [{ data: products }, { data: images }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price_after_discount, price_before_discount, quantity_in_stock, is_active")
      .in("id", ids),
    supabase
      .from("product_images")
      .select("product_id, url, display_order")
      .in("product_id", ids)
      .order("display_order"),
  ]);

  const imageByProduct = new Map<number, string>();
  for (const img of images ?? []) {
    if (!imageByProduct.has(img.product_id)) imageByProduct.set(img.product_id, img.url);
  }
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return items.map((item): CartLineDetail => {
    const product = productById.get(item.productId);

    if (!product || !product.is_active) {
      return {
        productId: item.productId,
        name: "Product no longer available",
        slug: "",
        imageUrl: null,
        unitPrice: 0,
        priceBeforeDiscount: 0,
        requestedQuantity: item.quantity,
        availableStock: 0,
        isActive: false,
        exists: !!product,
      };
    }

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: imageByProduct.get(product.id) ?? null,
      unitPrice: product.price_after_discount,
      priceBeforeDiscount: product.price_before_discount,
      requestedQuantity: item.quantity,
      availableStock: product.quantity_in_stock,
      isActive: true,
      exists: true,
    };
  });
}
