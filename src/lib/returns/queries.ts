import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database, ReturnRequestStatusValue } from "@/types/database";

export interface ReturnRequestListItem {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  title: string;
  status: ReturnRequestStatusValue;
  createdAt: string;
}

export interface ReturnRequestSearchFilters {
  status?: ReturnRequestStatusValue;
  page?: number;
  pageSize?: number;
}

export interface ReturnRequestListResult {
  items: ReturnRequestListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function searchReturnRequests(
  supabase: SupabaseClient<Database>,
  filters: ReturnRequestSearchFilters = {},
): Promise<ReturnRequestListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("return_requests")
    .select("id, order_id, title, status, created_at, orders(order_number, customer_name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error || !data) {
    if (error) console.error("[searchReturnRequests] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  const rows = data as unknown as {
    id: number;
    order_id: number;
    title: string;
    status: ReturnRequestStatusValue;
    created_at: string;
    orders: { order_number: string; customer_name: string } | null;
  }[];

  return {
    items: rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      orderNumber: row.orders?.order_number ?? "—",
      customerName: row.orders?.customer_name ?? "—",
      title: row.title,
      status: row.status,
      createdAt: row.created_at,
    })),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export interface ReturnRequestDetail {
  id: number;
  orderId: number;
  orderNumber: string;
  customerName: string;
  title: string;
  reason: string;
  imagePaths: string[];
  status: ReturnRequestStatusValue;
  adminDecisionReason: string | null;
  decidedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

function mapReturnRequestDetail(row: {
  id: number;
  order_id: number;
  title: string;
  reason: string;
  image_paths: string[];
  status: ReturnRequestStatusValue;
  admin_decision_reason: string | null;
  decided_at: string | null;
  received_at: string | null;
  created_at: string;
  orders: { order_number: string; customer_name: string } | null;
}): ReturnRequestDetail {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    customerName: row.orders?.customer_name ?? "—",
    title: row.title,
    reason: row.reason,
    imagePaths: row.image_paths,
    status: row.status,
    adminDecisionReason: row.admin_decision_reason,
    decidedAt: row.decided_at,
    receivedAt: row.received_at,
    createdAt: row.created_at,
  };
}

const DETAIL_SELECT =
  "id, order_id, title, reason, image_paths, status, admin_decision_reason, decided_at, received_at, created_at, orders(order_number, customer_name)";

export async function getReturnRequestById(
  supabase: SupabaseClient<Database>,
  id: number,
): Promise<ReturnRequestDetail | null> {
  const { data, error } = await supabase.from("return_requests").select(DETAIL_SELECT).eq("id", id).single();
  if (error || !data) return null;
  return mapReturnRequestDetail(data as unknown as Parameters<typeof mapReturnRequestDetail>[0]);
}

/** All return requests for one order (a rejected one can be followed by a new request). */
export async function getReturnRequestsForOrder(
  supabase: SupabaseClient<Database>,
  orderId: number,
): Promise<ReturnRequestDetail[]> {
  const { data, error } = await supabase
    .from("return_requests")
    .select(DETAIL_SELECT)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    if (error) console.error("[getReturnRequestsForOrder] failed:", error);
    return [];
  }
  return (data as unknown as Parameters<typeof mapReturnRequestDetail>[0][]).map(mapReturnRequestDetail);
}
