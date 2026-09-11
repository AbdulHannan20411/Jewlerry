import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import type { ProductListItem } from "@/lib/products/queries";

export function ProductSection({
  title,
  viewAllHref,
  products,
  lowStockThreshold,
}: {
  title: string;
  viewAllHref: Route;
  products: ProductListItem[];
  lowStockThreshold?: number;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-10">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold">{title}</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} lowStockThreshold={lowStockThreshold} />
        ))}
      </div>
    </section>
  );
}
