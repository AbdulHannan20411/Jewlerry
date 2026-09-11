import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchAllReviews } from "@/lib/reviews/queries";
import { FilterSelect } from "@/components/shared/filter-select";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { AdminReviewsTable } from "@/components/admin/admin-reviews-table";

export const metadata: Metadata = { title: "Reviews" };

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ visibility?: string; page?: string }>;
}) {
  await requireAdmin();
  const { visibility, page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchAllReviews(supabase, {
    visibility: visibility === "visible" || visibility === "hidden" ? visibility : undefined,
    page: page ? Number(page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          {result.totalCount} review{result.totalCount === 1 ? "" : "s"}
        </p>
      </div>

      <FilterSelect
        paramName="visibility"
        value={visibility}
        allLabel="All reviews"
        options={[
          { value: "visible", label: "Visible" },
          { value: "hidden", label: "Hidden" },
        ]}
        placeholder="Visibility"
      />

      <AdminReviewsTable reviews={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
