"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { uploadPublicImage } from "@/lib/storage/images";
import { STORAGE_BUCKETS } from "@/constants";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";
import {
  productFormSchema,
  categoryFormSchema,
  tagFormSchema,
  type ProductFormInput,
  type CategoryFormInput,
  type TagFormInput,
} from "@/lib/validations/products";
import * as mutations from "@/lib/products/mutations";

export async function createProductAction(
  input: ProductFormInput,
): Promise<ActionResult<{ id: number }>> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const result = await mutations.createProduct(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "product.created",
    entityType: "products",
    entityId: result.product.id,
    metadata: { name: result.product.name },
  });

  revalidatePath("/admin/products");
  return actionOk({ id: result.product.id });
}

export async function updateProductAction(
  id: number,
  input: ProductFormInput,
): Promise<ActionResult> {
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const result = await mutations.updateProduct(supabase, id, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "product.updated",
    entityType: "products",
    entityId: id,
    metadata: {
      price_before_discount: parsed.data.priceBeforeDiscount,
      price_after_discount: parsed.data.priceAfterDiscount,
      quantity_in_stock: parsed.data.quantityInStock,
      is_active: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/products/${result.product.slug}`);
  return actionOk(undefined);
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();

  const result = await mutations.deleteProduct(supabase, id);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "product.deleted",
    entityType: "products",
    entityId: id,
  });

  revalidatePath("/admin/products");
  return actionOk(undefined);
}

export async function uploadProductImageAction(
  productId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return actionError("No file provided.");

  const supabase = await createServerSupabaseClient();
  const result = await uploadPublicImage(
    supabase,
    STORAGE_BUCKETS.PRODUCT_IMAGES,
    String(productId),
    file,
  );

  if (!result.ok) {
    const messages: Record<string, string> = {
      FILE_TOO_LARGE: "Image must be 5MB or smaller.",
      INVALID_FILE_TYPE: "Only JPEG, PNG, or WebP images are allowed.",
      EMPTY_FILE: "The selected file is empty.",
      UPLOAD_FAILED: "Upload failed. Please try again.",
    };
    return actionError(messages[result.error]);
  }

  const added = await mutations.addProductImage(supabase, productId, {
    url: result.url,
    storagePath: result.path,
    altText: file.name,
  });
  if (!added.ok) return actionError(added.error);

  revalidatePath(`/admin/products/${productId}`);
  return actionOk(undefined);
}

export async function deleteProductImageAction(
  productId: number,
  imageId: number,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.deleteProductImage(supabase, imageId);
  if (!result.ok) return actionError(result.error);

  revalidatePath(`/admin/products/${productId}`);
  return actionOk(undefined);
}

export async function reorderProductImagesAction(
  productId: number,
  orderedImageIds: number[],
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  await mutations.reorderProductImages(supabase, orderedImageIds);
  revalidatePath(`/admin/products/${productId}`);
  return actionOk(undefined);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function createCategoryAction(input: CategoryFormInput): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.createCategory(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "category.created",
    entityType: "categories",
    entityId: result.category.id,
  });
  revalidatePath("/admin/categories");
  return actionOk(undefined);
}

export async function updateCategoryAction(
  id: number,
  input: CategoryFormInput,
): Promise<ActionResult> {
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.updateCategory(supabase, id, parsed.data);
  if (!result.ok) return actionError(result.error);

  revalidatePath("/admin/categories");
  return actionOk(undefined);
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.deleteCategory(supabase, id);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "category.deleted",
    entityType: "categories",
    entityId: id,
  });
  revalidatePath("/admin/categories");
  return actionOk(undefined);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
export async function createTagAction(input: TagFormInput): Promise<ActionResult> {
  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.createTag(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "tag.created",
    entityType: "tags",
    entityId: result.tag.id,
  });
  revalidatePath("/admin/tags");
  return actionOk(undefined);
}

export async function updateTagAction(id: number, input: TagFormInput): Promise<ActionResult> {
  const parsed = tagFormSchema.safeParse(input);
  if (!parsed.success) return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);

  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.updateTag(supabase, id, parsed.data);
  if (!result.ok) return actionError(result.error);

  revalidatePath("/admin/tags");
  return actionOk(undefined);
}

export async function deleteTagAction(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await mutations.deleteTag(supabase, id);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "tag.deleted",
    entityType: "tags",
    entityId: id,
  });
  revalidatePath("/admin/tags");
  return actionOk(undefined);
}
