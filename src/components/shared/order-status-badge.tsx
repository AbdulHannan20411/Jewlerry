import { Badge } from "@/components/ui/badge";
import type { OrderStatusValue } from "@/types/database";

const CONFIG: Record<OrderStatusValue, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
  unconfirmed: { label: "Unconfirmed", variant: "outline" },
  payment_pending: { label: "Payment Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "secondary" },
  in_process: { label: "Processing", variant: "secondary" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  returned: { label: "Returned", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatusValue }) {
  const { label, variant } = CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
