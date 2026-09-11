import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchProducts } from "@/lib/products/queries";
import { productFiltersSchema } from "@/lib/validations/products";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-input";
import { SortSelect } from "@/components/shared/sort-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ProductsTable } from "@/components/admin/products-table";

export const metadata: Metadata = { title: "Products" };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Rating" },
];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const rawParams = await searchParams;
  const filters = productFiltersSchema.parse({
    q: rawParams.q,
    sort: rawParams.sort,
    page: rawParams.page,
  });

  const supabase = await createServerSupabaseClient();
  const { data: settings } = await supabase
    .from("site_settings")
    .select("low_stock_threshold")
    .single();

  const result = await searchProducts(supabase, filters, { includeInactive: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} product{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/categories">Manage categories</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" /> New product
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput placeholder="Search products..." />
        <SortSelect value={filters.sort} options={SORT_OPTIONS} />
      </div>

      <ProductsTable
        products={result.items}
        lowStockThreshold={settings?.low_stock_threshold}
      />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
