import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchPayments } from "@/lib/payments/queries";
import { FilterSelect } from "@/components/shared/filter-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PaymentsTable } from "@/components/admin/payments-table";
import type { PaymentStatusValue } from "@/types/database";

export const metadata: Metadata = { title: "Payments" };

const STATUS_OPTIONS: { value: PaymentStatusValue; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { status, page } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const result = await searchPayments(supabase, {
    status: status as PaymentStatusValue | undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} payment{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <FilterSelect
        paramName="status"
        value={status}
        allLabel="All statuses"
        options={STATUS_OPTIONS}
        placeholder="Status"
      />

      <PaymentsTable payments={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
