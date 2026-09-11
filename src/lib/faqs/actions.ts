"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createFaq, updateFaq, deleteFaq } from "@/lib/faqs/mutations";
import { faqFormSchema, type FaqFormInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function createFaqAction(input: FaqFormInput): Promise<ActionResult> {
  const parsed = faqFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await createFaq(supabase, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "faq.created", entityType: "faqs", entityId: result.faq.id });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return actionOk(undefined);
}

export async function updateFaqAction(id: number, input: FaqFormInput): Promise<ActionResult> {
  const parsed = faqFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await updateFaq(supabase, id, parsed.data);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "faq.updated", entityType: "faqs", entityId: id });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return actionOk(undefined);
}

export async function deleteFaqAction(id: number): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await deleteFaq(supabase, id);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "faq.deleted", entityType: "faqs", entityId: id });

  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return actionOk(undefined);
}
