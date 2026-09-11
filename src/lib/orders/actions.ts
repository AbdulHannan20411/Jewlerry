"use server";

import { z } from "zod";
import { refreshCartDetails, type CartLineDetail } from "@/lib/orders/queries";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

const cartItemsSchema = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(999),
    }),
  )
  .max(100);

/**
 * Public (no auth required — product data is public): re-fetches current
 * price/stock/name/image for whatever's in the client's localStorage cart.
 * Called whenever the cart drawer/page opens.
 */
export async function getCartDetailsAction(
  items: { productId: number; quantity: number }[],
): Promise<ActionResult<CartLineDetail[]>> {
  const parsed = cartItemsSchema.safeParse(items);
  if (!parsed.success) return actionError("Invalid cart data.");

  const details = await refreshCartDetails(parsed.data);
  return actionOk(details);
}
