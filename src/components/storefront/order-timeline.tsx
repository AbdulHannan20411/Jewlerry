import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { OrderStatusEvent } from "@/lib/orders/queries";

const STATUS_LABELS: Record<string, string> = {
  unconfirmed: "Order placed",
  payment_pending: "Payment submitted",
  confirmed: "Payment approved — order confirmed",
  in_process: "Order processing",
  delivered: "Order delivered",
  completed: "Order completed",
  returned: "Order returned",
  cancelled: "Order cancelled",
};

/**
 * Renders only stages that have actually happened — order_status_history
 * only ever contains real transitions, so there's nothing to filter here.
 */
export function OrderTimeline({ events }: { events: OrderStatusEvent[] }) {
  if (events.length === 0) return null;

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < events.length - 1 && (
            <span className="absolute top-6 left-[11px] h-full w-px bg-border" aria-hidden="true" />
          )}
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {STATUS_LABELS[event.newStatus] ?? event.newStatus}
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
            {event.reason && <p className="mt-0.5 text-xs text-muted-foreground">{event.reason}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
