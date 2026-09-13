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
 * it ships) and requesting a return (after delivery) — which only ever
 * lands on return_initiated, never straight to returned; see
 * request_return / review_return_request.
 */
const CUSTOMER_ALLOWED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  unconfirmed: ["cancelled"],
  payment_pending: ["cancelled"],
  delivered: ["return_initiated"],
  partial_completed: ["return_initiated"],
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
 *  - delivered/partial_completed -> partial_completed/completed happens
 *    automatically as the customer reviews the order's products (see
 *    submitReviewAction in lib/reviews/actions.ts) — an admin manually
 *    marking an order "completed" before every product is actually
 *    reviewed defeats the point of gating the status on that signal.
 *  - return_initiated -> (return_processing | delivered | partial_completed
 *    | completed) only ever happens via review_return_request's approve/
 *    reject, which records the reviewing admin and their reason — a bare
 *    status edit would skip the return_requests record entirely.
 *  - return_processing -> returned only ever happens via
 *    mark_return_received, which also stamps the return request's
 *    received_at — a bare status edit would leave that unset.
 */
const ADMIN_EXCLUDED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  unconfirmed: ["payment_pending"],
  payment_pending: ["confirmed", "unconfirmed"],
  delivered: ["completed", "partial_completed", "return_initiated"],
  partial_completed: ["completed", "return_initiated"],
  completed: ["return_initiated"],
  return_initiated: ["return_processing", "delivered", "partial_completed", "completed"],
  return_processing: ["returned"],
};

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (!isValidTransition(from, to)) return false;
  return !(ADMIN_EXCLUDED[from] ?? []).includes(to);
}

/** Statuses an admin can manually move this order to next, from the admin order page. */
export function adminNextStatuses(from: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[from].filter((to) => canAdminTransition(from, to));
}
