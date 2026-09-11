import type { Metadata } from "next";
import { requireAdmin } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationComposer } from "@/components/admin/notification-composer";

export const metadata: Metadata = { title: "Send Notification" };

export default async function AdminNotificationsPage() {
  await requireAdmin();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Send an in-app notification and email to customers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>Delivered as an in-app notification and an email.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationComposer />
        </CardContent>
      </Card>
    </div>
  );
}
