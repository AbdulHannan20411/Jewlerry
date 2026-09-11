"use server";

import { contactFormSchema, type ContactFormInput } from "@/lib/validations/admin";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { enforceRateLimit, getRequestIp } from "@/lib/auth/rate-limit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function submitContactMessageAction(
  input: ContactFormInput,
): Promise<ActionResult> {
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const ip = await getRequestIp();
  const allowed = await enforceRateLimit("contact_form", ip, 5, 3600);
  if (!allowed) {
    return actionError("Too many messages sent. Please try again later.");
  }

  // Public submission (no auth) — RLS on contact_messages allows anon
  // insert, but the admin client keeps this consistent with the rest of
  // the app's write path and sidesteps any RLS edge cases for anon POSTs.
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
  });

  if (error) {
    console.error("[submitContactMessageAction] insert failed:", error);
    return actionError("Could not send your message. Please try again.");
  }

  return actionOk(undefined);
}
