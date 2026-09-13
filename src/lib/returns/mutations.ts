import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function requestReturnRpc(
  supabase: SupabaseClient<Database>,
  params: { orderId: number; customerId: string; title: string; reason: string; imagePaths: string[] },
) {
  const { data, error } = await supabase.rpc("request_return", {
    p_order_id: params.orderId,
    p_customer_id: params.customerId,
    p_title: params.title,
    p_reason: params.reason,
    p_image_paths: params.imagePaths,
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, request: data };
}

export async function reviewReturnRequestRpc(
  supabase: SupabaseClient<Database>,
  params: { requestId: number; newStatus: "approved" | "rejected"; reviewerId: string; adminReason?: string | null },
) {
  const { data, error } = await supabase.rpc("review_return_request", {
    p_request_id: params.requestId,
    p_new_status: params.newStatus,
    p_reviewer_id: params.reviewerId,
    p_admin_reason: params.adminReason ?? null,
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, request: data };
}

export async function markReturnReceivedRpc(
  supabase: SupabaseClient<Database>,
  params: { orderId: number; adminId: string },
) {
  const { data, error } = await supabase.rpc("mark_return_received", {
    p_order_id: params.orderId,
    p_admin_id: params.adminId,
  });
  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const, order: data };
}

export function friendlyRequestReturnError(message: string): string {
  if (message === "ORDER_NOT_FOUND") return "Order not found.";
  if (message.startsWith("ORDER_NOT_RETURNABLE")) {
    return "This order is no longer eligible for a return request.";
  }
  return "Could not submit your return request. Please try again.";
}
