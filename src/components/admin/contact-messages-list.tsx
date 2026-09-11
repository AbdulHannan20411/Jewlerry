"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, cn } from "@/lib/utils";
import { markContactMessageReadAction, deleteContactMessageAction } from "@/lib/contact/actions";
import type { ContactMessageListResult } from "@/lib/contact/queries";

export function ContactMessagesList({ messages }: { messages: ContactMessageListResult["items"] }) {
  const router = useRouter();
  const [openId, setOpenId] = React.useState<number | null>(null);

  async function handleOpen(id: number, isRead: boolean) {
    setOpenId((prev) => (prev === id ? null : id));
    if (!isRead) {
      await markContactMessageReadAction(id);
      router.refresh();
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteContactMessageAction(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Message deleted.");
    router.refresh();
  }

  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">No messages.</p>;
  }

  return (
    <div className="space-y-2">
      {messages.map((msg) => (
        <Card key={msg.id} className={cn(!msg.isRead && "border-primary/40")}>
          <button
            type="button"
            onClick={() => handleOpen(msg.id, msg.isRead)}
            className="flex w-full items-start justify-between gap-3 p-4 text-left"
          >
            <div className="flex items-start gap-3">
              {msg.isRead ? (
                <MailOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              ) : (
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {msg.subject || "(No subject)"} {!msg.isRead && <Badge className="ml-1">New</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {msg.name} &lt;{msg.email}&gt;
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
          </button>
          {openId === msg.id && (
            <CardContent className="pt-0">
              <p className="whitespace-pre-line text-sm text-foreground">{msg.message}</p>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${msg.email}${msg.subject ? `?subject=Re: ${encodeURIComponent(msg.subject)}` : ""}`}>
                    Reply by email
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleDelete(msg.id)}>
                  <Trash2 className="size-4" /> Delete
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
