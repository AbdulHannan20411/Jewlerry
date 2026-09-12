import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchPaymentMethods } from "@/lib/payments/queries";
import { PaymentMethodFormDialog } from "@/components/admin/payment-method-form-dialog";
import { PaymentMethodsTable } from "@/components/admin/payment-methods-table";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata: Metadata = { title: "Payment Methods" };

export default async function AdminPaymentMethodsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchPaymentMethods(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} method{result.totalCount === 1 ? "" : "s"} shown to customers at checkout
          </p>
        </div>
        <PaymentMethodFormDialog mode="create" />
      </div>

      <PaymentMethodsTable methods={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
