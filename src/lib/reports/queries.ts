import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderStatusValue } from "@/types/database";

// "Revenue" only counts orders where payment has actually been
// confirmed at some point — unconfirmed/payment_pending/cancelled orders
// never decremented real money, so they're excluded everywhere below.
// A return in progress (return_initiated/return_processing) still counts
// until it's actually completed (`returned`), at which point it drops out.
const REVENUE_STATUSES: OrderStatusValue[] = [
  "confirmed",
  "in_process",
  "delivered",
  "partial_completed",
  "completed",
  "return_initiated",
  "return_processing",
];

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orderCount: number;
}

export async function getRevenueOverTime(
  supabase: SupabaseClient<Database>,
  days = 30,
): Promise<RevenuePoint[]> {
  // Bucketed entirely in UTC-calendar-day terms (Date.UTC / getUTCDate, not
  // the local-time setDate/setHours) so day boundaries line up with the UTC
  // dates Postgres timestamptz values serialize to — using local-time
  // methods on a server whose timezone isn't UTC (e.g. UTC+5) shifts the
  // bucket keys by a day, silently dropping "today"'s revenue.
  const now = new Date();
  const sinceUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1));
  const since = new Date(sinceUtcMs);

  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at")
    .in("status", REVENUE_STATUSES)
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("[getRevenueOverTime] failed:", error);
    return [];
  }

  const byDay = new Map<string, { revenue: number; orderCount: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(sinceUtcMs + i * 86_400_000);
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orderCount: 0 });
  }

  for (const row of data ?? []) {
    const key = row.created_at.slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.revenue += row.total;
      bucket.orderCount += 1;
    }
  }

  return Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
}

export interface OrdersByStatusPoint {
  status: OrderStatusValue;
  count: number;
}

export async function getOrdersByStatus(supabase: SupabaseClient<Database>): Promise<OrdersByStatusPoint[]> {
  const { data, error } = await supabase.from("orders").select("status");
  if (error) {
    console.error("[getOrdersByStatus] failed:", error);
    return [];
  }

  const counts = new Map<OrderStatusValue, number>();
  for (const row of data) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export interface TopProduct {
  productId: number | null;
  name: string;
  unitsSold: number;
  revenue: number;
}

export async function getTopProducts(supabase: SupabaseClient<Database>, limit = 5): Promise<TopProduct[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, product_name_snapshot, quantity, line_total, orders!inner(status)")
    .in("orders.status", REVENUE_STATUSES);

  if (error) {
    console.error("[getTopProducts] failed:", error);
    return [];
  }

  const rows = data as unknown as {
    product_id: number | null;
    product_name_snapshot: string;
    quantity: number;
    line_total: number;
  }[];

  const byProduct = new Map<string, TopProduct>();
  for (const row of rows) {
    const key = row.product_id != null ? String(row.product_id) : `deleted:${row.product_name_snapshot}`;
    const existing = byProduct.get(key);
    if (existing) {
      existing.unitsSold += row.quantity;
      existing.revenue += row.line_total;
    } else {
      byProduct.set(key, {
        productId: row.product_id,
        name: row.product_name_snapshot,
        unitsSold: row.quantity,
        revenue: row.line_total,
      });
    }
  }

  return Array.from(byProduct.values())
    .sort((a, b) => b.unitsSold - a.unitsSold)
    .slice(0, limit);
}

export interface QuickStats {
  pendingPayments: number;
  lowStockProducts: number;
  unreadContactMessages: number;
  unconfirmedOrders: number;
}

export async function getQuickStats(supabase: SupabaseClient<Database>): Promise<QuickStats> {
  const [{ count: pendingPayments }, { count: unreadContactMessages }, { count: unconfirmedOrders }, { data: settings }] =
    await Promise.all([
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "unconfirmed"),
      supabase.from("site_settings").select("low_stock_threshold").single(),
    ]);

  const threshold = settings?.low_stock_threshold ?? 5;
  const { count: lowStockProducts } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .lte("quantity_in_stock", threshold)
    .gt("quantity_in_stock", 0);

  return {
    pendingPayments: pendingPayments ?? 0,
    lowStockProducts: lowStockProducts ?? 0,
    unreadContactMessages: unreadContactMessages ?? 0,
    unconfirmedOrders: unconfirmedOrders ?? 0,
  };
}
