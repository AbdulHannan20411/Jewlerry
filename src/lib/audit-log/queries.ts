import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import type { Database, Json } from "@/types/database";

export interface AuditLogEntry {
  id: number;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Json;
  createdAt: string;
}

export interface AuditLogListResult {
  items: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Admin-only (RLS: `audit_logs_admin_read`). Left-joins `profiles` for a
 * display name — `actor_id` is nullable (system/cron actions, or an
 * actor whose profile was later deleted, per `on delete set null`), so
 * "System" is shown instead of blank.
 */
export async function searchAuditLog(
  supabase: SupabaseClient<Database>,
  filters: { q?: string; page?: number; pageSize?: number } = {},
): Promise<AuditLogListResult> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles(full_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (filters.q) {
    query = query.or(`action.ilike.%${filters.q}%,entity_type.ilike.%${filters.q}%`);
  }

  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error || !data) {
    if (error) console.error("[searchAuditLog] failed:", error);
    return { items: [], totalCount: 0, page, pageSize, pageCount: 1 };
  }

  const totalCount = count ?? 0;
  const rows = data as unknown as {
    id: number;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Json;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];

  return {
    items: rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.profiles?.full_name ?? (row.actor_id ? null : "System"),
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      createdAt: row.created_at,
    })),
    totalCount,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
