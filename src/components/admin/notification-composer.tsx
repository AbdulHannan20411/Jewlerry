"use client";

import * as React from "react";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendNotificationAction } from "@/lib/notifications/actions";
import { searchCustomersForPickerAction } from "@/lib/customers/actions";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const TYPE_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "promotion", label: "Promotion" },
  { value: "system", label: "System" },
  { value: "order", label: "Order" },
  { value: "payment", label: "Payment" },
];

export function NotificationComposer() {
  const [recipientType, setRecipientType] = React.useState<"all" | "selected">("all");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ id: string; fullName: string; email: string }[]>([]);
  const [selected, setSelected] = React.useState<{ id: string; fullName: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [type, setType] = React.useState("announcement");
  const [pending, startTransition] = React.useTransition();

  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    const result = await searchCustomersForPickerAction(q.trim());
    setSearching(false);
    if (result.success) setResults(result.data);
  }, 300);

  function handleQueryChange(next: string) {
    setQuery(next);
    setSearching(true);
    debouncedSearch(next);
  }

  function addCustomer(customer: { id: string; fullName: string }) {
    if (!selected.some((s) => s.id === customer.id)) {
      setSelected((prev) => [...prev, customer]);
    }
    setQuery("");
    setResults([]);
  }

  function removeCustomer(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recipientType === "selected" && selected.length === 0) {
      toast.error("Select at least one customer.");
      return;
    }
    startTransition(async () => {
      const result = await sendNotificationAction({
        recipientType,
        recipientIds: recipientType === "selected" ? selected.map((s) => s.id) : [],
        title,
        message,
        type: type as "order" | "payment" | "announcement" | "promotion" | "system",
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Notification sent.");
      setTitle("");
      setMessage("");
      setSelected([]);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Recipients</Label>
        <Select value={recipientType} onValueChange={(v) => setRecipientType(v as "all" | "selected")}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            <SelectItem value="selected">Specific customers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recipientType === "selected" && (
        <div className="space-y-2">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((s) => (
                <Badge key={s.id} variant="secondary" className="gap-1">
                  {s.fullName}
                  <button type="button" onClick={() => removeCustomer(s.id)} aria-label={`Remove ${s.fullName}`}>
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="relative">
            <Input
              placeholder="Search customers by name, username, or email..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
            {searching && <Loader2 className="absolute top-2.5 right-2.5 size-4 animate-spin text-muted-foreground" />}
          </div>
          {query.trim() !== "" && results.length > 0 && (
            <div className="rounded-md border border-border">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addCustomer(r)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="font-medium text-foreground">{r.fullName}</span>
                  <span className="text-xs text-muted-foreground">{r.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-title">Title</Label>
        <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notif-message">Message</Label>
        <Textarea id="notif-message" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={2} rows={4} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send notification"}
      </Button>
    </form>
  );
}
