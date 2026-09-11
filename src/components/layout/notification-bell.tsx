import { getCurrentProfile } from "@/lib/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getNotificationSummary } from "@/lib/notifications/queries";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";

/** Renders nothing when signed out — notifications only ever exist for a signed-in profile. */
export async function NotificationBell() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createServerSupabaseClient();
  const { items, unreadCount } = await getNotificationSummary(supabase, profile.id);

  return <NotificationDropdown initialItems={items} initialUnreadCount={unreadCount} />;
}
