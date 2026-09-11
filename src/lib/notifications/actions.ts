"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { markNotificationRead, markAllNotificationsRead, createNotificationsForUsers } from "@/lib/notifications/mutations";
import { sendEmail } from "@/lib/email/send";
import { genericNotificationEmail } from "@/lib/email/templates";
import { sendNotificationSchema, type SendNotificationInput } from "@/lib/validations/admin";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function markNotificationReadAction(id: number): Promise<ActionResult> {
  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const ok = await markNotificationRead(supabase, id, profile.id);
  if (!ok) return actionError("Could not update this notification.");
  revalidatePath("/account/notifications");
  return actionOk(undefined);
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const ok = await markAllNotificationsRead(supabase, profile.id);
  if (!ok) return actionError("Could not update your notifications.");
  revalidatePath("/account/notifications");
  return actionOk(undefined);
}

/** Admin broadcast/targeted composer (single customer, a selected list, or every customer). */
export async function sendNotificationAction(input: SendNotificationInput): Promise<ActionResult> {
  const parsed = sendNotificationSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const serviceClient = createAdminSupabaseClient();

  let recipientIds: string[] = [];
  if (parsed.data.recipientType === "all") {
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("role", "customer")
      .is("deleted_at", null);
    if (error) return actionError("Could not load recipients.");
    recipientIds = data.map((row) => row.id);
  } else {
    recipientIds = parsed.data.recipientIds;
  }

  if (recipientIds.length === 0) {
    return actionError("No recipients to send to.");
  }

  await createNotificationsForUsers(serviceClient, recipientIds, {
    title: parsed.data.title,
    message: parsed.data.message,
    type: parsed.data.type,
  });

  const { data: recipients } = await serviceClient
    .from("profiles")
    .select("email")
    .in("id", recipientIds);
  const { subject, html } = genericNotificationEmail({ title: parsed.data.title, message: parsed.data.message });
  await Promise.all((recipients ?? []).map((r) => sendEmail({ to: r.email, subject, html })));

  await writeAuditLog({
    actorId: admin.id,
    action: "notification.sent",
    entityType: "notifications",
    metadata: { recipient_count: recipientIds.length, recipient_type: parsed.data.recipientType },
  });

  return actionOk(undefined);
}
