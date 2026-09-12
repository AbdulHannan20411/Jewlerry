import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchFaqs } from "@/lib/faqs/queries";
import { FaqFormDialog } from "@/components/admin/faq-form-dialog";
import { FaqsTable } from "@/components/admin/faqs-table";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata: Metadata = { title: "FAQs" };

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchFaqs(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">FAQs</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} question{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <FaqFormDialog mode="create" />
      </div>

      <FaqsTable faqs={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
