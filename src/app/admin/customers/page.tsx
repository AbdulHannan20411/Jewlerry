import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchCustomers } from "@/lib/customers/queries";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { CustomersTable } from "@/components/admin/customers-table";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, status, page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchCustomers(supabase, {
    q,
    status: status === "active" || status === "blocked" ? status : undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} customer{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search by name, username, or email..." />
        <FilterSelect
          paramName="status"
          value={status}
          allLabel="All customers"
          options={[
            { value: "active", label: "Active" },
            { value: "blocked", label: "Blocked" },
          ]}
          placeholder="Status"
        />
      </div>

      <CustomersTable customers={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
