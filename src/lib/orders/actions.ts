"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { refreshCartDetails, getOrderById, type CartLineDetail } from "@/lib/orders/queries";
import {
  createOrderRpc,
  changeOrderStatusRpc,
  friendlyCreateOrderError,
} from "@/lib/orders/mutations";
import { canCustomerTransition, canAdminTransition } from "@/lib/orders/transitions";
import { checkoutSchema, requestReturnSchema, updateOrderStatusSchema } from "@/lib/validations/orders";
import type { CheckoutInput, RequestReturnInput, UpdateOrderStatusInput } from "@/lib/validations/orders";
import { requireUser, requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { actionOk, actionError, type ActionResult } from "@/lib/action-result";

const cartItemsSchema = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(999),
    }),
  )
  .max(100);

/**
 * Public (no auth required — product data is public): re-fetches current
 * price/stock/name/image for whatever's in the client's localStorage cart.
 * Called whenever the cart drawer/page opens.
 */
export async function getCartDetailsAction(
  items: { productId: number; quantity: number }[],
): Promise<ActionResult<CartLineDetail[]>> {
  const parsed = cartItemsSchema.safeParse(items);
  if (!parsed.success) return actionError("Invalid cart data.");

  const details = await refreshCartDetails(parsed.data);
  return actionOk(details);
}

/**
 * Checkout submission. Requires sign-in (orders.customer_id is a NOT NULL
 * FK to profiles — there's no guest checkout in this schema). All the
 * actual validation (stock, current prices, active/inactive) happens
 * inside the create_order RPC itself — this action just authenticates the
 * caller and translates the RPC's structured errors into something a
 * customer can act on.
 */
export async function createOrderAction(
  input: CheckoutInput,
): Promise<ActionResult<{ orderId: number }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireUser({ returnTo: "/checkout" });

  const admin = createAdminSupabaseClient();
  const result = await createOrderRpc(admin, {
    customerId: profile.id,
    items: parsed.data.items,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    customerEmail: parsed.data.customerEmail,
    shippingAddress: parsed.data.shippingAddress,
    shippingCity: parsed.data.shippingCity,
    shippingNotes: parsed.data.shippingNotes,
  });

  if (!result.ok) {
    return actionError(friendlyCreateOrderError(result.message));
  }

  revalidatePath("/account/orders");
  return actionOk({ orderId: result.order.id });
}

/** Customer or admin cancelling an order still in a cancellable state. */
export async function cancelOrderAction(
  orderId: number,
  reason?: string,
): Promise<ActionResult> {
  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const order = await getOrderById(supabase, orderId);
  if (!order) return actionError("Order not found.");

  const isOwner = order.customerId === profile.id;
  const isAdmin = profile.role === "admin";
  if (!isOwner && !isAdmin) return actionError("You don't have access to this order.");

  const allowed = isAdmin
    ? canAdminTransition(order.status, "cancelled")
    : canCustomerTransition(order.status, "cancelled");
  if (!allowed) return actionError("This order can no longer be cancelled.");

  const admin = createAdminSupabaseClient();
  const finalReason = reason || (isAdmin ? "Cancelled by admin" : "Cancelled by customer");
  await admin.from("orders").update({ cancelled_reason: finalReason }).eq("id", orderId);

  const result = await changeOrderStatusRpc(admin, {
    orderId,
    newStatus: "cancelled",
    changedBy: profile.id,
    reason: finalReason,
  });
  if (!result.ok) return actionError("Could not cancel this order.");

  await writeAuditLog({
    actorId: profile.id,
    action: isAdmin ? "order.cancelled_by_admin" : "order.cancelled_by_customer",
    entityType: "orders",
    entityId: orderId,
  });

  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return actionOk(undefined);
}

/**
 * Customer-initiated return request on an eligible (delivered) order.
 * Directly transitions to `returned` — per spec, a formal approval
 * workflow can be layered on top of return_reason/return_notes/
 * returned_at later without a schema change.
 */
export async function requestReturnAction(input: RequestReturnInput): Promise<ActionResult> {
  const parsed = requestReturnSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const profile = await requireUser();
  const supabase = await createServerSupabaseClient();
  const order = await getOrderById(supabase, parsed.data.orderId);
  if (!order) return actionError("Order not found.");
  if (order.customerId !== profile.id) return actionError("You don't have access to this order.");
  if (!canCustomerTransition(order.status, "returned")) {
    return actionError("This order isn't eligible for a return request.");
  }

  const admin = createAdminSupabaseClient();
  await admin
    .from("orders")
    .update({
      return_reason: parsed.data.reason,
      return_notes: parsed.data.notes ?? null,
      returned_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.orderId);

  const result = await changeOrderStatusRpc(admin, {
    orderId: parsed.data.orderId,
    newStatus: "returned",
    changedBy: profile.id,
    reason: parsed.data.reason,
  });
  if (!result.ok) return actionError("Could not submit your return request.");

  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  revalidatePath("/admin/orders");
  return actionOk(undefined);
}

/** Admin manual status change (dashboard order management). */
export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput,
): Promise<ActionResult> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the errors below.", parsed.error.flatten().fieldErrors);
  }

  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const order = await getOrderById(supabase, parsed.data.orderId);
  if (!order) return actionError("Order not found.");

  if (!canAdminTransition(order.status, parsed.data.newStatus)) {
    return actionError(
      `Cannot move this order from "${order.status}" to "${parsed.data.newStatus}".`,
    );
  }

  const serviceClient = createAdminSupabaseClient();

  if (parsed.data.newStatus === "cancelled" && parsed.data.reason) {
    await serviceClient
      .from("orders")
      .update({ cancelled_reason: parsed.data.reason })
      .eq("id", parsed.data.orderId);
  }
  if (parsed.data.newStatus === "returned") {
    await serviceClient
      .from("orders")
      .update({
        return_reason: parsed.data.reason ?? "Marked returned by admin",
        returned_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.orderId);
  }

  const result = await changeOrderStatusRpc(serviceClient, {
    orderId: parsed.data.orderId,
    newStatus: parsed.data.newStatus,
    changedBy: admin.id,
    reason: parsed.data.reason,
  });
  if (!result.ok) return actionError("Could not update order status.");

  await writeAuditLog({
    actorId: admin.id,
    action: "order.status_changed",
    entityType: "orders",
    entityId: parsed.data.orderId,
    metadata: { from: order.status, to: parsed.data.newStatus, reason: parsed.data.reason ?? null },
  });

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  return actionOk(undefined);
}
