import { describe, expect, it } from "vitest";
import { getStockStatus, STOCK_STATUS } from "@/constants";

describe("getStockStatus", () => {
  it("is out_of_stock at zero", () => {
    expect(getStockStatus(0)).toBe(STOCK_STATUS.OUT_OF_STOCK);
  });

  it("is low_stock at or below the threshold", () => {
    expect(getStockStatus(5, 5)).toBe(STOCK_STATUS.LOW_STOCK);
    expect(getStockStatus(1, 5)).toBe(STOCK_STATUS.LOW_STOCK);
  });

  it("is in_stock above the threshold", () => {
    expect(getStockStatus(6, 5)).toBe(STOCK_STATUS.IN_STOCK);
  });
});
