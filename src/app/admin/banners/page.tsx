import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { searchBanners } from "@/lib/banners/queries";
import { BannerFormDialog } from "@/components/admin/banner-form-dialog";
import { BannersTable } from "@/components/admin/banners-table";
import { PaginationControls } from "@/components/shared/pagination-controls";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await searchBanners(supabase, { page: page ? Number(page) : 1 });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Banners</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} banner{result.totalCount === 1 ? "" : "s"} in the home page carousel
          </p>
        </div>
        <BannerFormDialog mode="create" />
      </div>

      <BannersTable banners={result.items} />

      <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
    </div>
  );
}
