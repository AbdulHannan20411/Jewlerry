import { Badge } from "@/components/ui/badge";
import type { PaymentStatusValue } from "@/types/database";

const CONFIG: Record<
  PaymentStatusValue,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }
> = {
  pending: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatusValue }) {
  const { label, variant } = CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
