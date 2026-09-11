"use client";

import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";

export function AddToCartButton({
  productId,
  quantity = 1,
  disabled,
  className,
  size = "sm",
}: {
  productId: number;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const addItem = useCartStore((s) => s.addItem);

  function handleClick(e: React.MouseEvent) {
    // Product cards wrap the whole tile in a <Link>; stop this button
    // press from also triggering navigation.
    e.preventDefault();
    e.stopPropagation();
    addItem(productId, quantity);
    toast.success("Added to cart");
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={disabled}
      onClick={handleClick}
      className={cn("w-full", className)}
    >
      <ShoppingBag className="size-4" />
      {disabled ? "Out of stock" : "Add to cart"}
    </Button>
  );
}
