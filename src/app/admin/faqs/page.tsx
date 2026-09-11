import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllFaqs } from "@/lib/faqs/queries";
import { FaqFormDialog } from "@/components/admin/faq-form-dialog";
import { FaqsTable } from "@/components/admin/faqs-table";

export const metadata: Metadata = { title: "FAQs" };

export default async function AdminFaqsPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const faqs = await getAllFaqs(supabase);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">FAQs</h1>
          <p className="text-sm text-muted-foreground">
            {faqs.length} question{faqs.length === 1 ? "" : "s"}
          </p>
        </div>
        <FaqFormDialog mode="create" />
      </div>

      <FaqsTable faqs={faqs} />
    </div>
  );
}
