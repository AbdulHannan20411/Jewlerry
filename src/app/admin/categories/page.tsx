import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllCategories } from "@/lib/products/queries";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";
import { CategoriesTable } from "@/components/admin/categories-table";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const categories = await getAllCategories(supabase);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <CategoryFormDialog mode="create" />
      </div>

      <CategoriesTable categories={categories} />
    </div>
  );
}
