import Link from "next/link";
import Image from "next/image";
import { Star, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computeDiscount } from "@/lib/products/pricing";
import { getStockStatus, STOCK_STATUS, DEFAULT_LOW_STOCK_THRESHOLD } from "@/constants";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import type { ProductListItem } from "@/lib/products/queries";

export function ProductCard({
  product,
  lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
}: {
  product: ProductListItem;
  lowStockThreshold?: number;
}) {
  const { percentage } = computeDiscount(product.price_before_discount, product.price_after_discount);
  const stockStatus = getStockStatus(product.quantity_in_stock, lowStockThreshold);
  const outOfStock = stockStatus === STOCK_STATUS.OUT_OF_STOCK;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-shadow hover:shadow-md">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-muted"
      >
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden="true" />
          </div>
        )}
        {percentage > 0 && !outOfStock && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            -{percentage}%
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="outline">Out of Stock</Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-[10px]">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 text-sm font-medium text-foreground hover:underline"
        >
          {product.name}
        </Link>

        {product.review_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
            <span>
              {product.average_rating.toFixed(1)} ({product.review_count})
            </span>
          </div>
        )}

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-sans text-base font-semibold text-foreground">
            {formatCurrency(product.price_after_discount)}
          </span>
          {percentage > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.price_before_discount)}
            </span>
          )}
        </div>

        <AddToCartButton productId={product.id} disabled={outOfStock} className="mt-2" />
      </div>
    </div>
  );
}
