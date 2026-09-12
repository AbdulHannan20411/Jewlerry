import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchAuditLog } from "@/lib/audit-log/queries";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchAuditLog(supabase, { q, page: page ? Number(page) : 1 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} recorded action{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <SearchInput placeholder="Search by action or entity type..." />

      <AuditLogTable entries={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
