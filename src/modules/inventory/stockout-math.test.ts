import { describe, expect, it } from "vitest";

import { assessStockoutRisk } from "./stockout-math";

describe("assessStockoutRisk", () => {
  it("marks unavailable fast-selling stock as critical", () => {
    expect(assessStockoutRisk({ onHand: 0, trailingUnits: 84, incomingQuantity: 0, windowDays: 28 })).toMatchObject({ risk: "CRITICAL", averageDailySales: 3, daysOfCover: 0 });
  });

  it("accounts for incoming purchase-order quantity without treating it as received stock", () => {
    expect(assessStockoutRisk({ onHand: 2, trailingUnits: 56, incomingQuantity: 20, windowDays: 28 })).toMatchObject({ risk: "HIGH", daysOfCover: 1 });
  });

  it("marks three days of cover as high risk when no replenishment is open", () => {
    expect(assessStockoutRisk({ onHand: 6, trailingUnits: 56, incomingQuantity: 0, windowDays: 28 })).toMatchObject({ risk: "HIGH", daysOfCover: 3 });
  });

  it("does not invent a stockout prediction without sales history", () => {
    expect(assessStockoutRisk({ onHand: 1, trailingUnits: 0, incomingQuantity: 0 })).toMatchObject({ risk: "NO_HISTORY", daysOfCover: null });
  });

  it("rejects invalid quantities", () => {
    expect(() => assessStockoutRisk({ onHand: -1, trailingUnits: 1, incomingQuantity: 0 })).toThrow("Stockout inputs");
  });
});
