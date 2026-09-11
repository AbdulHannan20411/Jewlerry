import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchContactMessages } from "@/lib/contact/queries";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ContactMessagesList } from "@/components/admin/contact-messages-list";

export const metadata: Metadata = { title: "Contact Messages" };

export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchContactMessages(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Contact Messages</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} message{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <ContactMessagesList messages={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
