import type { Metadata } from "next";
import { requireUser } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/notifications/queries";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { NotificationList } from "@/components/storefront/notification-list";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const profile = await requireUser();
  const { page } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const result = await getNotifications(supabase, profile.id, { page: page ? Number(page) : 1 });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {result.totalCount} notification{result.totalCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <NotificationList items={result.items} />

      <div className="mt-6">
        <PaginationControls page={result.page} pageCount={result.pageCount} totalCount={result.totalCount} />
      </div>
    </div>
  );
}
