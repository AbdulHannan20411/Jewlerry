import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database } from "@/types/database";

export interface CustomerListItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string | null;
  blockedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}

export interface CustomerListResult {
  items: CustomerListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function searchCustomers(
  supabase: SupabaseClient<Database>,
  filters: { q?: string; status?: "active" | "blocked"; page?: number; pageSize?: number } = {},
): Promise<CustomerListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("profiles")
    .select("id, full_name, username, email, phone, blocked_at, deleted_at, created_at", { count: "exact" })
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  if (filters.status === "blocked") query = query.not("blocked_at", "is", null);
  if (filters.status === "active") query = query.is("blocked_at", null);
  if (filters.q) {
    query = query.or(`full_name.ilike.%${filters.q}%,username.ilike.%${filters.q}%,email.ilike.%${filters.q}%`);
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error || !data) {
    if (error) console.error("[searchCustomers] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      username: row.username,
      email: row.email,
      phone: row.phone,
      blockedAt: row.blocked_at,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
    })),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export interface CustomerDetail extends CustomerListItem {
  blockedReason: string | null;
  orderCount: number;
  totalSpent: number;
}

export async function getCustomerById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<CustomerDetail | null> {
  const [{ data: profile, error }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, email, phone, blocked_at, blocked_reason, deleted_at, created_at")
      .eq("id", id)
      .eq("role", "customer")
      .maybeSingle(),
    supabase
      .from("orders")
      .select("total")
      .eq("customer_id", id)
      .in("status", [
        "confirmed",
        "in_process",
        "delivered",
        "partial_completed",
        "completed",
        "return_initiated",
        "return_processing",
      ]),
  ]);

  if (error || !profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    username: profile.username,
    email: profile.email,
    phone: profile.phone,
    blockedAt: profile.blocked_at,
    blockedReason: profile.blocked_reason,
    deletedAt: profile.deleted_at,
    createdAt: profile.created_at,
    orderCount: orders?.length ?? 0,
    totalSpent: (orders ?? []).reduce((sum, o) => sum + o.total, 0),
  };
}
