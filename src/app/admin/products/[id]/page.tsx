import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllCategories, getAllTags, getProductForEdit } from "@/lib/products/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [result, categories, tags] = await Promise.all([
    getProductForEdit(supabase, id),
    getAllCategories(supabase),
    getAllTags(supabase),
  ]);

  if (!result) notFound();
  const { product, tagIds, images } = result;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">Edit product details and images.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductImageManager productId={product.id} initialImages={images} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="edit"
            productId={product.id}
            categories={categories}
            tags={tags}
            defaultValues={{
              name: product.name,
              description: product.description,
              categoryId: product.category_id,
              priceBeforeDiscount: product.price_before_discount,
              priceAfterDiscount: product.price_after_discount,
              quantityInStock: product.quantity_in_stock,
              isActive: product.is_active,
              tagIds,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
