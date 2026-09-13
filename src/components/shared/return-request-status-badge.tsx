import { Badge } from "@/components/ui/badge";
import type { ReturnRequestStatusValue } from "@/types/database";

const CONFIG: Record<
  ReturnRequestStatusValue,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }
> = {
  pending: { label: "Pending review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function ReturnRequestStatusBadge({ status }: { status: ReturnRequestStatusValue }) {
  const { label, variant } = CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
