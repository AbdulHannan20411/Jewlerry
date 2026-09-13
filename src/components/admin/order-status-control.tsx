"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateOrderStatusAction } from "@/lib/orders/actions";
import { adminNextStatuses } from "@/lib/orders/transitions";
import { OrderStatusBadge } from "@/components/shared/order-status-badge";
import { ORDER_STATUS_LABELS as STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from "@/constants";
import type { OrderStatusValue } from "@/types/database";

// Statuses whose transition benefits from (or requires) a reason.
const REASON_RECOMMENDED: OrderStatusValue[] = ["cancelled", "returned"];

export function OrderStatusControl({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: OrderStatusValue;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<OrderStatusValue | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const nextStatuses = adminNextStatuses(currentStatus);

  function openDialog(status: OrderStatusValue) {
    setTarget(status);
    setReason("");
    setOpen(true);
  }

  function handleConfirm() {
    if (!target) return;
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, newStatus: target, reason: reason || undefined });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order moved to ${STATUS_LABELS[target]}.`);
      setOpen(false);
      router.refresh();
    });
  }

  if (nextStatuses.length === 0) {
    return <OrderStatusBadge status={currentStatus} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OrderStatusBadge status={currentStatus} />
      <span className="text-sm text-muted-foreground">Move to:</span>
      {nextStatuses.map((status) => (
        <Tooltip key={status}>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => openDialog(status)}>
              {STATUS_LABELS[status]}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{ORDER_STATUS_DESCRIPTIONS[status]}</TooltipContent>
        </Tooltip>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move order to &quot;{target ? STATUS_LABELS[target] : ""}&quot;?</DialogTitle>
            <DialogDescription>
              This is recorded in the order&apos;s status history and visible to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-reason">
              Reason {target && REASON_RECOMMENDED.includes(target) ? "" : "(optional)"}
            </Label>
            <Textarea
              id="status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={pending}>
              {pending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
