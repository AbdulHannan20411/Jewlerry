import { ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/constants";

/**
 * Mirrors the DB trigger (validate_order_status_transition, migration
 * 0005) — this is the app-layer check consulted before ever calling the
 * change_order_status RPC, so a disallowed request gets a clean error
 * instead of a raw Postgres exception. The DB trigger is still the real
 * backstop; keep both in sync.
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Rule 5: a customer may never directly move their own order to
 * confirmed/in_process/delivered/completed — those are admin- or
 * payment-approval-driven. Self-service is limited to cancelling (before
 * it ships) and requesting a return (after delivery).
 */
const CUSTOMER_ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  unconfirmed: ["cancelled"],
  payment_pending: ["cancelled"],
  delivered: ["returned"],
};

export function canCustomerTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (CUSTOMER_ALLOWED[from] ?? []).includes(to);
}

/**
 * Transitions that must only ever happen as a side effect of something
 * else, never as a bare manual admin status edit:
 *  - unconfirmed -> payment_pending happens when the customer submits
 *    proof; a manual admin toggle here would leave the order saying
 *    "payment pending" with no payment row for anyone to review.
 *  - payment_pending -> confirmed/unconfirmed happens when admin reviews
 *    that proof (approve/reject) — which also records who reviewed it
 *    and why, a trail a bare status edit would skip entirely.
 *  - delivered -> completed happens automatically when the customer
 *    submits a review for the order (see notifyOrderCreated's sibling,
 *    submitReviewAction in lib/reviews/actions.ts) — an admin manually
 *    marking an order "completed" before the customer has actually
 *    reviewed it defeats the point of gating the status on that signal.
 */
const ADMIN_EXCLUDED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  unconfirmed: ["payment_pending"],
  payment_pending: ["confirmed", "unconfirmed"],
  delivered: ["completed"],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (!isValidTransition(from, to)) return false;
  return !(ADMIN_EXCLUDED[from] ?? []).includes(to);
}

/** Statuses an admin can manually move this order to next, from the admin order page. */
export function adminNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from].filter((to) => canAdminTransition(from, to));
}
