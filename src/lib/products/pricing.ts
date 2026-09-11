/**
 * Discount math lives in exactly one place, server-side. Never trust a
 * discount amount/percentage computed on the client — recompute it here
 * from the two server-side price columns whenever it needs to be shown.
 */
export function computeDiscount(
  priceBeforeDiscount: number,
  priceAfterDiscount: number,
): { amount: number; percentage: number } {
  const amount = Math.max(0, priceBeforeDiscount - priceAfterDiscount);
  const percentage =
    priceBeforeDiscount > 0 ? Math.round((amount / priceBeforeDiscount) * 100) : 0;
  return { amount, percentage };
}

export function hasDiscount(priceBeforeDiscount: number, priceAfterDiscount: number): boolean {
  return priceAfterDiscount < priceBeforeDiscount;
}
