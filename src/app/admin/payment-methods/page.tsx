import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPaymentMethods } from "@/lib/payments/queries";
import { PaymentMethodFormDialog } from "@/components/admin/payment-method-form-dialog";
import { PaymentMethodsTable } from "@/components/admin/payment-methods-table";

export const metadata: Metadata = { title: "Payment Methods" };

export default async function AdminPaymentMethodsPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const methods = await getPaymentMethods(supabase);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">
            {methods.length} method{methods.length === 1 ? "" : "s"} shown to customers at checkout
          </p>
        </div>
        <PaymentMethodFormDialog mode="create" />
      </div>

      <PaymentMethodsTable methods={methods} />
    </div>
  );
}
