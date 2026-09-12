import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchCategories } from "@/lib/products/queries";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { CategoriesTable } from "@/components/admin/categories-table";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchCategories(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} categor{result.totalCount === 1 ? "y" : "ies"}
          </p>
        </div>
        <CategoryFormDialog mode="create" />
      </div>

      <CategoriesTable categories={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
