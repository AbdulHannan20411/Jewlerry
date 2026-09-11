"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBanner, updateBanner, deleteBanner } from "@/lib/banners/mutations";
import { bannerFormSchema, type BannerFormInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function createBannerAction(input: BannerFormInput, formData: FormData): Promise<ActionResult> {
  const parsed = bannerFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return actionError("Please choose a banner image.");

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await createBanner(supabase, parsed.data, file);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "banner.created",
    entityType: "banners",
    entityId: result.banner.id,
  });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return actionOk(undefined);
}

export async function updateBannerAction(
  id: number,
  input: BannerFormInput,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = bannerFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const file = formData.get("file");
  const result = await updateBanner(supabase, id, parsed.data, file instanceof File ? file : null);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "banner.updated", entityType: "banners", entityId: id });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return actionOk(undefined);
}

export async function deleteBannerAction(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await deleteBanner(supabase, id);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "banner.deleted", entityType: "banners", entityId: id });

  revalidatePath("/admin/banners");
  revalidatePath("/");
  return actionOk(undefined);
}
