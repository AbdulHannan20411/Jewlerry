"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartItemCount } from "@/hooks/use-cart";

export function CartBadge() {
  const count = useCartItemCount();

  return (
    <Link
      href="/cart"
      className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <ShoppingBag className="size-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
