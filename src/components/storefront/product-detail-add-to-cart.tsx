"use client";

import * as React from "react";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";

export function ProductDetailAddToCart({
  productId,
  availableStock,
}: {
  productId: number;
  availableStock: number;
}) {
  const [quantity, setQuantity] = React.useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const outOfStock = availableStock <= 0;

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }
  function increment() {
    setQuantity((q) => Math.min(availableStock, q + 1));
  }

  function handleAddToCart() {
    addItem(productId, quantity);
    toast.success(`Added ${quantity} to cart`);
  }

  if (outOfStock) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Out of stock
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center rounded-md border border-input">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={decrement}
          disabled={quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-10 text-center text-sm font-medium" aria-live="polite">
          {quantity}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={increment}
          disabled={quantity >= availableStock}
          aria-label="Increase quantity"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <Button type="button" onClick={handleAddToCart} className="flex-1 sm:flex-initial">
        <ShoppingBag className="size-4" />
        Add to cart
      </Button>
    </div>
  );
}
