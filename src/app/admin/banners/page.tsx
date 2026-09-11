import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllBanners } from "@/lib/banners/queries";
import { BannerFormDialog } from "@/components/admin/banner-form-dialog";
import { BannersTable } from "@/components/admin/banners-table";

export const metadata: Metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const banners = await getAllBanners(supabase);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Banners</h1>
          <p className="text-sm text-muted-foreground">
            {banners.length} banner{banners.length === 1 ? "" : "s"} in the home page carousel
          </p>
        </div>
        <BannerFormDialog mode="create" />
      </div>

      <BannersTable banners={banners} />
    </div>
  );
}
