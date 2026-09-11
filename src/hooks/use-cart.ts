"use client";

import { useCartStore } from "@/store/cart-store";
import { useMounted } from "@/hooks/use-mounted";

/**
 * Item count for the header badge. Gated on useMounted() — the persisted
 * (localStorage) cart is empty on the server and during the first client
 * render, so rendering the real count immediately would cause a hydration
 * mismatch. Same pattern as the theme toggle.
 */
export function useCartItemCount(): number {
  const mounted = useMounted();
  const count = useCartStore((s) => s.totalItemCount());
  return mounted ? count : 0;
}
