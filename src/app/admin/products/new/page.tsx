import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllCategories, getAllTags } from "@/lib/products/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "New Product" };

export default async function NewProductPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const [categories, tags] = await Promise.all([
    getAllCategories(supabase),
    getAllTags(supabase),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">New product</h1>
        <p className="text-sm text-muted-foreground">
          You can add images once the product is created.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="create"
            categories={categories}
            tags={tags}
            defaultValues={{
              name: "",
              description: "",
              categoryId: null,
              priceBeforeDiscount: 0,
              priceAfterDiscount: 0,
              quantityInStock: 0,
              isActive: true,
              tagIds: [],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
