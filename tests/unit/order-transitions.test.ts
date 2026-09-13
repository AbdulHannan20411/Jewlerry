import { describe, expect, it } from "vitest";
import {
  isValidTransition,
  canCustomerTransition,
  canAdminTransition,
  adminNextStatuses,
} from "@/lib/orders/transitions";

describe("isValidTransition", () => {
  it("allows the documented happy path", () => {
    expect(isValidTransition("unconfirmed", "payment_pending")).toBe(true);
    expect(isValidTransition("payment_pending", "confirmed")).toBe(true);
    expect(isValidTransition("confirmed", "in_process")).toBe(true);
    expect(isValidTransition("in_process", "delivered")).toBe(true);
    expect(isValidTransition("delivered", "completed")).toBe(true);
  });

  it("allows payment rejection to fall back to unconfirmed", () => {
    expect(isValidTransition("payment_pending", "unconfirmed")).toBe(true);
  });

  it("allows cancellation from any pre-delivery state", () => {
    expect(isValidTransition("unconfirmed", "cancelled")).toBe(true);
    expect(isValidTransition("payment_pending", "cancelled")).toBe(true);
    expect(isValidTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidTransition("in_process", "cancelled")).toBe(true);
  });

  it("allows a delivered order to go straight to partial_completed (a review that doesn't cover every product)", () => {
    expect(isValidTransition("delivered", "partial_completed")).toBe(true);
    expect(isValidTransition("partial_completed", "completed")).toBe(true);
  });

  it("allows return_initiated from any post-delivery state, and rejects skipping the approval step", () => {
    expect(isValidTransition("delivered", "return_initiated")).toBe(true);
    expect(isValidTransition("partial_completed", "return_initiated")).toBe(true);
    expect(isValidTransition("completed", "return_initiated")).toBe(true);
    expect(isValidTransition("delivered", "return_processing")).toBe(false);
    expect(isValidTransition("delivered", "returned")).toBe(false);
  });

  it("allows return_initiated to move to return_processing (approved) or revert to any pre-return state (rejected)", () => {
    expect(isValidTransition("return_initiated", "return_processing")).toBe(true);
    expect(isValidTransition("return_initiated", "delivered")).toBe(true);
    expect(isValidTransition("return_initiated", "partial_completed")).toBe(true);
    expect(isValidTransition("return_initiated", "completed")).toBe(true);
  });

  it("only allows return_processing to move to returned", () => {
    expect(isValidTransition("return_processing", "returned")).toBe(true);
    expect(isValidTransition("return_processing", "delivered")).toBe(false);
  });

  it("rejects skipping stages", () => {
    expect(isValidTransition("unconfirmed", "delivered")).toBe(false);
    expect(isValidTransition("unconfirmed", "confirmed")).toBe(false);
    expect(isValidTransition("confirmed", "completed")).toBe(false);
  });

  it("rejects moving backward", () => {
    expect(isValidTransition("delivered", "in_process")).toBe(false);
    expect(isValidTransition("confirmed", "payment_pending")).toBe(false);
  });

  it("rejects any transition out of terminal states", () => {
    expect(isValidTransition("cancelled", "unconfirmed")).toBe(false);
    expect(isValidTransition("returned", "delivered")).toBe(false);
  });
});

describe("canCustomerTransition (Rule 5: customers can't self-advance an order)", () => {
  it("lets a customer cancel before it ships", () => {
    expect(canCustomerTransition("unconfirmed", "cancelled")).toBe(true);
    expect(canCustomerTransition("payment_pending", "cancelled")).toBe(true);
  });

  it("lets a customer request a return after delivery (which only ever lands on return_initiated)", () => {
    expect(canCustomerTransition("delivered", "return_initiated")).toBe(true);
    expect(canCustomerTransition("partial_completed", "return_initiated")).toBe(true);
    expect(canCustomerTransition("delivered", "returned")).toBe(false);
  });

  it("never lets a customer request a return once the order is already fully completed", () => {
    expect(canCustomerTransition("completed", "return_initiated")).toBe(false);
  });

  it("never lets a customer confirm/process/deliver/complete their own order", () => {
    expect(canCustomerTransition("payment_pending", "confirmed")).toBe(false);
    expect(canCustomerTransition("confirmed", "in_process")).toBe(false);
    expect(canCustomerTransition("in_process", "delivered")).toBe(false);
    expect(canCustomerTransition("delivered", "completed")).toBe(false);
  });

  it("doesn't let a customer cancel a confirmed/processing order", () => {
    expect(canCustomerTransition("confirmed", "cancelled")).toBe(false);
    expect(canCustomerTransition("in_process", "cancelled")).toBe(false);
  });
});

describe("canAdminTransition", () => {
  it("blocks payment_pending -> confirmed/unconfirmed as a manual edit (must go through review_payment)", () => {
    expect(canAdminTransition("payment_pending", "confirmed")).toBe(false);
    expect(canAdminTransition("payment_pending", "unconfirmed")).toBe(false);
  });

  it("blocks unconfirmed -> payment_pending as a manual edit (must go through submit_payment)", () => {
    expect(canAdminTransition("unconfirmed", "payment_pending")).toBe(false);
  });

  it("allows the operational transitions", () => {
    expect(canAdminTransition("confirmed", "in_process")).toBe(true);
    expect(canAdminTransition("in_process", "delivered")).toBe(true);
  });

  it("blocks delivered -> completed/partial_completed as a manual edit (only earned by the customer submitting reviews)", () => {
    expect(canAdminTransition("delivered", "completed")).toBe(false);
    expect(canAdminTransition("delivered", "partial_completed")).toBe(false);
    expect(canAdminTransition("partial_completed", "completed")).toBe(false);
  });

  it("blocks every manual edit into/out of the return workflow (must go through request_return/review_return_request/mark_return_received)", () => {
    expect(canAdminTransition("delivered", "return_initiated")).toBe(false);
    expect(canAdminTransition("completed", "return_initiated")).toBe(false);
    expect(canAdminTransition("return_initiated", "return_processing")).toBe(false);
    expect(canAdminTransition("return_initiated", "delivered")).toBe(false);
    expect(canAdminTransition("return_processing", "returned")).toBe(false);
  });

  it("still rejects structurally-invalid transitions for admin too", () => {
    expect(canAdminTransition("unconfirmed", "delivered")).toBe(false);
  });
});

describe("adminNextStatuses", () => {
  it("excludes the payment-RPC-only transitions from payment_pending", () => {
    expect(adminNextStatuses("payment_pending")).toEqual(["cancelled"]);
  });

  it("excludes payment_pending itself from unconfirmed's manual options", () => {
    expect(adminNextStatuses("unconfirmed")).toEqual(["cancelled"]);
  });

  it("offers nothing from delivered — completion is earned by customer reviews and returns are customer-initiated, never a manual admin edit", () => {
    expect(adminNextStatuses("delivered")).toEqual([]);
  });

  it("offers nothing from the review-completion or return-workflow states either — all of them require the dedicated flow", () => {
    expect(adminNextStatuses("partial_completed")).toEqual([]);
    expect(adminNextStatuses("completed")).toEqual([]);
    expect(adminNextStatuses("return_initiated")).toEqual([]);
    expect(adminNextStatuses("return_processing")).toEqual([]);
  });

  it("is empty for terminal states", () => {
    expect(adminNextStatuses("cancelled")).toEqual([]);
    expect(adminNextStatuses("returned")).toEqual([]);
  });
});
