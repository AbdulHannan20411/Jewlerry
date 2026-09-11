import type { Metadata } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchProducts, getAllTags, getAllCategories } from "@/lib/products/queries";
import { getSiteSettings } from "@/lib/settings/queries";
import { productFiltersSchema } from "@/lib/validations/products";
import { SearchInput } from "@/components/shared/search-input";
import { SortSelect } from "@/components/shared/sort-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductFilters } from "@/components/storefront/product-filters";
import { ProductFiltersSheet } from "@/components/storefront/product-filters-sheet";

export const metadata: Metadata = {
  title: "All Products",
  description: "Shop rings, necklaces, earrings and bracelets.",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = productFiltersSchema.parse({
    q: raw.q,
    tag: raw.tag,
    category: raw.category,
    minPrice: raw.minPrice,
    maxPrice: raw.maxPrice,
    minRating: raw.minRating,
    inStockOnly: raw.inStockOnly,
    newWithinDays: raw.newWithinDays,
    sort: raw.sort,
    page: raw.page,
  });

  const supabase = await createServerSupabaseClient();
  const [result, tags, categories, settings] = await Promise.all([
    searchProducts(supabase, filters),
    getAllTags(supabase),
    getAllCategories(supabase, { activeOnly: true }),
    getSiteSettings(),
  ]);

  const tagOptions = tags.map((t) => ({ slug: t.slug, name: t.name }));
  const categoryOptions = categories.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Shop All</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.totalCount} product{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search products..." />
          <ProductFiltersSheet tags={tagOptions} categories={categoryOptions} />
        </div>
        <SortSelect value={filters.sort} options={SORT_OPTIONS} />
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <ProductFilters tags={tagOptions} categories={categoryOptions} />
        </aside>

        <div className="min-w-0 flex-1">
          {result.items.length === 0 ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
              <p className="font-heading text-lg font-medium">No products found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lowStockThreshold={settings?.low_stock_threshold}
                />
              ))}
            </div>
          )}

          <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
        </div>
      </div>
    </div>
  );
}
