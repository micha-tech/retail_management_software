import { describe, expect, it } from "vitest";

import { recommendPurchaseQuantity } from "./recommendation-math";

describe("recommendPurchaseQuantity", () => {
  it("uses current and incoming inventory in the recommendation", () => {
    expect(recommendPurchaseQuantity({ averageDailySales: 5, onHand: 12, incomingQuantity: 8, targetCoverageDays: 14 })).toMatchObject({ targetQuantity: 70, inventoryPosition: 20, suggestedQuantity: 50 });
  });

  it("does not suggest purchase when inventory position meets the target", () => {
    expect(recommendPurchaseQuantity({ averageDailySales: 2, onHand: 20, incomingQuantity: 10, targetCoverageDays: 14 }).suggestedQuantity).toBe(0);
  });

  it("rejects invalid values", () => {
    expect(() => recommendPurchaseQuantity({ averageDailySales: -1, onHand: 0, incomingQuantity: 0 })).toThrow("Procurement recommendation inputs");
  });
});
