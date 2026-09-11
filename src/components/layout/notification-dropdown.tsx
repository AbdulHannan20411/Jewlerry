"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/notifications/actions";
import { formatDate } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications/queries";

export function NotificationDropdown({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);

  async function handleItemClick(item: NotificationItem) {
    if (item.isRead) return;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationReadAction(item.id);
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="size-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="flex flex-col items-start gap-0.5 whitespace-normal"
            >
              <div className="flex w-full items-center gap-2">
                {!item.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                <span className="text-sm font-medium text-foreground">{item.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.message}</span>
              <span className="text-[11px] text-muted-foreground/70">{formatDate(item.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/notifications" className="justify-center text-sm">
            View all
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
