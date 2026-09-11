import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deletePublicImage } from "@/lib/storage/images";
import { STORAGE_BUCKETS } from "@/constants";
import type { Database } from "@/types/database";
import type { ProductFormInput, CategoryFormInput, TagFormInput } from "@/lib/validations/products";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Appends a short random suffix if the base slug is already taken. */
async function uniqueSlug(
  supabase: SupabaseClient<Database>,
  table: "products" | "categories" | "tags",
  base: string,
  excludeId?: number,
): Promise<string> {
  const baseSlug = slugify(base) || "item";
  let candidate = baseSlug;
  let attempt = 0;

  while (attempt < 20) {
    let query = supabase.from(table).select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

export async function createProduct(
  supabase: SupabaseClient<Database>,
  input: ProductFormInput,
) {
  const slug = await uniqueSlug(supabase, "products", input.name);

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      name: input.name,
      slug,
      description: input.description,
      category_id: input.categoryId ?? null,
      price_before_discount: input.priceBeforeDiscount,
      price_after_discount: input.priceAfterDiscount,
      quantity_in_stock: input.quantityInStock,
      is_active: input.isActive,
    })
    .select()
    .single();

  if (error || !product) {
    return { ok: false as const, error: error?.message ?? "Failed to create product" };
  }

  if (input.tagIds.length > 0) {
    await supabase
      .from("product_tags")
      .insert(input.tagIds.map((tagId) => ({ product_id: product.id, tag_id: tagId })));
  }

  return { ok: true as const, product };
}

export async function updateProduct(
  supabase: SupabaseClient<Database>,
  id: number,
  input: ProductFormInput,
) {
  const { data: existing } = await supabase
    .from("products")
    .select("slug, name")
    .eq("id", id)
    .single();

  const slug =
    existing && existing.name === input.name
      ? existing.slug
      : await uniqueSlug(supabase, "products", input.name, id);

  const { data: product, error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug,
      description: input.description,
      category_id: input.categoryId ?? null,
      price_before_discount: input.priceBeforeDiscount,
      price_after_discount: input.priceAfterDiscount,
      quantity_in_stock: input.quantityInStock,
      is_active: input.isActive,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !product) {
    return { ok: false as const, error: error?.message ?? "Failed to update product" };
  }

  // Sync product_tags: delete all, re-insert selected (simplest correct
  // approach for a form that submits the full desired tag set each time).
  await supabase.from("product_tags").delete().eq("product_id", id);
  if (input.tagIds.length > 0) {
    await supabase
      .from("product_tags")
      .insert(input.tagIds.map((tagId) => ({ product_id: id, tag_id: tagId })));
  }

  return { ok: true as const, product };
}

export async function deleteProduct(supabase: SupabaseClient<Database>, id: number) {
  // Historical orders keep their own snapshot (name/price/image URL) in
  // order_items independent of this row, and order_items.product_id is
  // ON DELETE SET NULL — so a hard delete here never corrupts an order.
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  for (const img of images ?? []) {
    await deletePublicImage(supabase, STORAGE_BUCKETS.PRODUCT_IMAGES, img.storage_path);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function addProductImage(
  supabase: SupabaseClient<Database>,
  productId: number,
  image: { url: string; storagePath: string; altText: string },
) {
  const { data: existing } = await supabase
    .from("product_images")
    .select("display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.display_order ?? -1) + 1;

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    url: image.url,
    storage_path: image.storagePath,
    alt_text: image.altText,
    display_order: nextOrder,
  });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteProductImage(supabase: SupabaseClient<Database>, imageId: number) {
  const { data: image } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (image) {
    await deletePublicImage(supabase, STORAGE_BUCKETS.PRODUCT_IMAGES, image.storage_path);
  }

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function reorderProductImages(
  supabase: SupabaseClient<Database>,
  orderedImageIds: number[],
) {
  await Promise.all(
    orderedImageIds.map((imageId, index) =>
      supabase.from("product_images").update({ display_order: index }).eq("id", imageId),
    ),
  );
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategory(
  supabase: SupabaseClient<Database>,
  input: CategoryFormInput,
) {
  const slug = await uniqueSlug(supabase, "categories", input.name);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: input.name, slug, display_order: input.displayOrder, is_active: input.isActive })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, category: data };
}

export async function updateCategory(
  supabase: SupabaseClient<Database>,
  id: number,
  input: CategoryFormInput,
) {
  const { error } = await supabase
    .from("categories")
    .update({ name: input.name, display_order: input.displayOrder, is_active: input.isActive })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteCategory(supabase: SupabaseClient<Database>, id: number) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function createTag(supabase: SupabaseClient<Database>, input: TagFormInput) {
  const slug = await uniqueSlug(supabase, "tags", input.name);
  const { data, error } = await supabase
    .from("tags")
    .insert({ name: input.name, slug })
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, tag: data };
}

export async function updateTag(
  supabase: SupabaseClient<Database>,
  id: number,
  input: TagFormInput,
) {
  const { error } = await supabase.from("tags").update({ name: input.name }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteTag(supabase: SupabaseClient<Database>, id: number) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
