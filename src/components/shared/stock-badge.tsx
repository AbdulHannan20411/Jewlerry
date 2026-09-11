import { Badge } from "@/components/ui/badge";
import { getStockStatus, STOCK_STATUS, DEFAULT_LOW_STOCK_THRESHOLD } from "@/constants";

const config = {
  [STOCK_STATUS.IN_STOCK]: { label: "In Stock", variant: "success" as const },
  [STOCK_STATUS.LOW_STOCK]: { label: "Low Stock", variant: "warning" as const },
  [STOCK_STATUS.OUT_OF_STOCK]: { label: "Out of Stock", variant: "destructive" as const },
};

export function StockBadge({
  quantity,
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
}: {
  quantity: number;
  threshold?: number;
}) {
  const status = getStockStatus(quantity, threshold);
  const { label, variant } = config[status];
  const suffix = status === STOCK_STATUS.LOW_STOCK ? ` (${quantity})` : "";

  return (
    <Badge variant={variant}>
      {label}
      {suffix}
    </Badge>
  );
}
