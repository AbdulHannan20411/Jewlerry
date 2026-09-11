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

  it("allows returns from delivered or completed", () => {
    expect(isValidTransition("delivered", "returned")).toBe(true);
    expect(isValidTransition("completed", "returned")).toBe(true);
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

  it("lets a customer request a return after delivery", () => {
    expect(canCustomerTransition("delivered", "returned")).toBe(true);
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
    expect(canAdminTransition("delivered", "completed")).toBe(true);
    expect(canAdminTransition("delivered", "returned")).toBe(true);
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

  it("lists both delivered exits", () => {
    expect(adminNextStatuses("delivered").sort()).toEqual(["completed", "returned"]);
  });

  it("is empty for terminal states", () => {
    expect(adminNextStatuses("cancelled")).toEqual([]);
    expect(adminNextStatuses("returned")).toEqual([]);
  });
});
