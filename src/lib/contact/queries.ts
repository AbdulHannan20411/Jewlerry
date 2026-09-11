import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database } from "@/types/database";

export interface ContactMessageListResult {
  items: Array<{
    id: number;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function searchContactMessages(
  supabase: SupabaseClient<Database>,
  filters: { onlyUnread?: boolean; page?: number; pageSize?: number } = {},
): Promise<ContactMessageListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.onlyUnread) query = query.eq("is_read", false);

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error || !data) {
    if (error) console.error("[searchContactMessages] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  return {
    items: data.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      subject: row.subject,
      message: row.message,
      isRead: row.is_read,
      createdAt: row.created_at,
    })),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getUnreadContactCount(supabase: SupabaseClient<Database>): Promise<number> {
  const { count } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  return count ?? 0;
}
