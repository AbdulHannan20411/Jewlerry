"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { blockCustomer, unblockCustomer } from "@/lib/customers/mutations";
import { searchCustomers } from "@/lib/customers/queries";
import { blockCustomerSchema, type BlockCustomerInput } from "@/lib/validations/admin";
import { notifyCustomerBlocked } from "@/lib/notifications/events";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

export async function blockCustomerAction(input: BlockCustomerInput): Promise<ActionResult> {
  const parsed = blockCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data: customerProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", parsed.data.customerId)
    .maybeSingle();

  const result = await blockCustomer(supabase, parsed.data.customerId, parsed.data.reason);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({
    actorId: admin.id,
    action: "customer.blocked",
    entityType: "profiles",
    entityId: parsed.data.customerId,
    metadata: { reason: parsed.data.reason },
  });

  if (customerProfile) {
    await notifyCustomerBlocked(createAdminSupabaseClient(), {
      customerId: parsed.data.customerId,
      customerEmail: customerProfile.email,
      reason: parsed.data.reason,
    });
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${parsed.data.customerId}`);
  return actionOk(undefined);
}

export async function unblockCustomerAction(customerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await unblockCustomer(supabase, customerId);
  if (!result.ok) return actionError(result.error);

  await writeAuditLog({ actorId: admin.id, action: "customer.unblocked", entityType: "profiles", entityId: customerId });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  return actionOk(undefined);
}

/**
 * Admin-triggered version of the customer's own self-delete
 * (`deleteAccountAction` in lib/auth/actions.ts) — same anonymize + ban
 * pair, minus the password re-entry (admin authority is already
 * established via requireAdmin(), there's no password to check).
 */
export async function adminDeleteCustomerAction(customerId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const adminClient = createAdminSupabaseClient();

  const { error: anonymizeError } = await adminClient.rpc("anonymize_profile", { p_profile_id: customerId });
  if (anonymizeError) {
    console.error("[adminDeleteCustomerAction] anonymize_profile failed:", anonymizeError);
    return actionError("Could not delete this customer.");
  }

  const { error: banError } = await adminClient.auth.admin.updateUserById(customerId, {
    ban_duration: "87600h",
  });
  if (banError) {
    console.error("[adminDeleteCustomerAction] failed to ban auth user:", banError);
  }

  await writeAuditLog({
    actorId: admin.id,
    action: "customer.deleted_by_admin",
    entityType: "profiles",
    entityId: customerId,
  });

  revalidatePath("/admin/customers");
  return actionOk(undefined);
}

/** Backs the customer picker in the admin notification composer. */
export async function searchCustomersForPickerAction(
  q: string,
): Promise<ActionResult<{ id: string; fullName: string; email: string }[]>> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const result = await searchCustomers(supabase, { q, pageSize: 10 });
  return actionOk(result.items.map((c) => ({ id: c.id, fullName: c.fullName, email: c.email })));
}
