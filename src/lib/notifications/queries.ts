import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database, NotificationTypeValue } from "@/types/database";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: NotificationTypeValue;
  isRead: boolean;
  createdAt: string;
}

function mapNotification(row: {
  id: number;
  title: string;
  message: string;
  type: NotificationTypeValue;
  is_read: boolean;
  created_at: string;
}): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<{ items: NotificationItem[]; totalCount: number; page: number; pageSize: number; pageCount: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, is_read, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error || !data) {
    if (error) console.error("[getNotifications] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  return {
    items: data.map(mapNotification),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/** Latest few notifications for the header bell dropdown, plus the unread count. */
export async function getNotificationSummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 5,
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  if (error) console.error("[getNotificationSummary] failed:", error);

  return {
    items: (data ?? []).map(mapNotification),
    unreadCount: count ?? 0,
  };
}
