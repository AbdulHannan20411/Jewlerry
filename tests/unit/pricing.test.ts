import { describe, expect, it } from "vitest";
import { computeDiscount, hasDiscount } from "@/lib/products/pricing";

describe("computeDiscount", () => {
  it("computes zero discount when prices are equal", () => {
    expect(computeDiscount(100, 100)).toEqual({ amount: 0, percentage: 0 });
  });

  it("computes amount and rounded percentage for a discount", () => {
    expect(computeDiscount(19900, 14900)).toEqual({ amount: 5000, percentage: 25 });
  });

  it("rounds the percentage to the nearest whole number", () => {
    // 1/3 = 33.33...% -> rounds to 33
    expect(computeDiscount(300, 200)).toEqual({ amount: 100, percentage: 33 });
  });

  it("never returns a negative amount if priceAfter is (invalidly) greater", () => {
    // Defense-in-depth: the DB check constraint should prevent this, but
    // the pure function itself must not produce a nonsensical negative.
    expect(computeDiscount(100, 150).amount).toBe(0);
  });

  it("treats a zero original price as a 0% discount, not a division error", () => {
    expect(computeDiscount(0, 0)).toEqual({ amount: 0, percentage: 0 });
  });
});

describe("hasDiscount", () => {
  it("is false when prices are equal", () => {
    expect(hasDiscount(100, 100)).toBe(false);
  });

  it("is true when the after-price is lower", () => {
    expect(hasDiscount(100, 80)).toBe(true);
  });
});
