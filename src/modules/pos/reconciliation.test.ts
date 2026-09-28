import { describe, expect, it } from "vitest";

import { calculateExpectedTillCash, formatTillAmount } from "./reconciliation";

describe("POS till reconciliation", () => {
  it("derives expected physical cash from opening cash, cash payments, and movements", () => {
    expect(calculateExpectedTillCash(20_000n, 175_050n, [
      { type: "CASH_IN", amount: 10_000n },
      { type: "CASH_OUT", amount: 25_000n },
    ])).toBe(180_050n);
  });

  it("formats minor units for a cashier-facing mismatch message", () => {
    expect(formatTillAmount(1_842_300n)).toBe("18,423.00");
  });
});
