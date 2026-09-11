import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchOrders } from "@/lib/orders/queries";
import { SearchInput } from "@/components/shared/search-input";
import { FilterSelect } from "@/components/shared/filter-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { OrdersTable } from "@/components/admin/orders-table";
import type { OrderStatusValue } from "@/types/database";

export const metadata: Metadata = { title: "Orders" };

const STATUS_OPTIONS: { value: OrderStatusValue; label: string }[] = [
  { value: "unconfirmed", label: "Unconfirmed" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_process", label: "Processing" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, status, page } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const result = await searchOrders(supabase, {
    q,
    status: status as OrderStatusValue | undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} order{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search by order or invoice number..." />
        <FilterSelect
          paramName="status"
          value={status}
          allLabel="All statuses"
          options={STATUS_OPTIONS}
          placeholder="Status"
        />
      </div>

      <OrdersTable orders={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
