"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ORDER_STATUS_DESCRIPTIONS } from "@/constants";
import type { OrderStatusValue } from "@/types/database";

const CONFIG: Record<OrderStatusValue, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  unconfirmed: { label: "Unconfirmed", variant: "outline" },
  payment_pending: { label: "Payment Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "secondary" },
  in_process: { label: "Processing", variant: "secondary" },
  delivered: { label: "Delivered", variant: "success" },
  partial_completed: { label: "Partially Completed", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  return_initiated: { label: "Return Initiated", variant: "warning" },
  return_processing: { label: "Return Processing", variant: "secondary" },
  returned: { label: "Returned", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

/** Shared by both the admin and customer order pages, so the same hover explanation shows up everywhere a status is displayed. */
export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  const { label, variant } = CONFIG[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className="cursor-default">
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{ORDER_STATUS_DESCRIPTIONS[status]}</TooltipContent>
    </Tooltip>
  );
}
