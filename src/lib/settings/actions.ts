"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateSiteSettings, updateAdminSettings } from "@/lib/settings/mutations";
import {
  siteSettingsFormSchema,
  adminSettingsFormSchema,
  type SiteSettingsFormInput,
  type AdminSettingsFormInput,
} from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function updateSiteSettingsAction(input: SiteSettingsFormInput): Promise<ActionResult> {
  const parsed = siteSettingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await updateSiteSettings(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "settings.store_updated", entityType: "site_settings" });

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return actionOk(undefined);
}

export async function updateAdminSettingsAction(input: AdminSettingsFormInput): Promise<ActionResult> {
  const parsed = adminSettingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await updateAdminSettings(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "settings.automation_updated", entityType: "admin_settings" });

  revalidatePath("/admin/settings");
  return actionOk(undefined);
}
