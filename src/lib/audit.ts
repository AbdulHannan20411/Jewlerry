import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

/**
 * Appends one row to audit_logs. Never throws — an audit-log failure
 * should not fail the underlying admin action it's recording; it just
 * logs loudly so the gap is visible in server logs.
 */
export async function writeAuditLog(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, Json>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error("[audit_logs] insert failed:", entry.action, error);
  }
}
