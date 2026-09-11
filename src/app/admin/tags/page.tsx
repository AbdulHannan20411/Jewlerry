import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchTags } from "@/lib/products/queries";
import { SearchInput } from "@/components/shared/search-input";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { TagFormDialog } from "@/components/admin/tag-form-dialog";
import { TagsTable } from "@/components/admin/tags-table";

export const metadata: Metadata = { title: "Tags" };

export default async function AdminTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchTags(supabase, { q, page: page ? Number(page) : 1 });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} tag{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <TagFormDialog mode="create" />
      </div>

      <SearchInput placeholder="Search tags..." />

      <TagsTable tags={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
