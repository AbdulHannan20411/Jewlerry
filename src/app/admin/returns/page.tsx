import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchReturnRequests } from "@/lib/returns/queries";
import { FilterSelect } from "@/components/shared/filter-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ReturnsTable } from "@/components/admin/returns-table";
import type { ReturnRequestStatusValue } from "@/types/database";

export const metadata: Metadata = { title: "Returns" };

const STATUS_OPTIONS: { value: ReturnRequestStatusValue; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default async function AdminReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { status, page } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const result = await searchReturnRequests(supabase, {
    status: status as ReturnRequestStatusValue | undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Returns</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} return request{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <FilterSelect
        paramName="status"
        value={status}
        allLabel="All statuses"
        options={STATUS_OPTIONS}
        placeholder="Status"
      />

      <ReturnsTable requests={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
