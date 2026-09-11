"use client";

import * as React from "react";
import { Bell, Package, CreditCard, Megaphone, Tag as TagIcon, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications/queries";
import type { NotificationTypeValue } from "@/types/database";

const TYPE_ICONS: Record<NotificationTypeValue, React.ComponentType<{ className?: string }>> = {
  order: Package,
  payment: CreditCard,
  announcement: Megaphone,
  promotion: TagIcon,
  system: Info,
};

export function NotificationList({ items: initialItems }: { items: NotificationItem[] }) {
  const [items, setItems] = React.useState(initialItems);
  const hasUnread = items.some((i) => !i.isRead);

  async function handleClick(item: NotificationItem) {
    if (item.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
    await markNotificationReadAction(item.id);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    await markAllNotificationsReadAction();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <Bell className="size-8" />
        <p className="text-sm">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="link" size="sm" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        </div>
      )}
      {items.map((item) => {
        const Icon = TYPE_ICONS[item.type];
        return (
          <Card
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => handleClick(item)}
            onKeyDown={(e) => e.key === "Enter" && handleClick(item)}
            className={item.isRead ? "opacity-70" : "border-primary/40"}
          >
            <CardContent className="flex items-start gap-3 py-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground/70">{formatDateTime(item.createdAt)}</p>
              </div>
              {!item.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
