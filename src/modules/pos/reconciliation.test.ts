import { describe, expect, it } from "vitest";

import { calculateExpectedTillCash, cashReconciliationMessage, formatTillAmount } from "./reconciliation";

describe("POS till reconciliation", () => {
  it("derives expected physical cash from opening cash, cash payments, and movements", () => {
    expect(calculateExpectedTillCash(20_000n, 175_050n, [
      { type: "CASH_IN", amount: 10_000n },
      { type: "CASH_OUT", amount: 25_000n },
    ])).toBe(180_050n);
  });

  it("formats minor units for privileged reconciliation details", () => {
    expect(formatTillAmount(1_842_300n)).toBe("18,423.00");
  });

  it("does not expose reconciliation amounts to cashiers", () => {
    const message = cashReconciliationMessage(150_000n, 140_000n, "NGN", false);
    expect(message).toBe("Expected cash and actual cash do not reconcile. Recount the drawer and verify the recorded cash movements.");
    expect(message).not.toContain("1,500");
    expect(message).not.toContain("100");
  });

  it("shows the exact difference to privileged roles", () => {
    expect(cashReconciliationMessage(150_000n, 140_000n, "NGN", true)).toBe(
      "Till cannot be closed. Expected ₦1,500.00, entered ₦1,400.00, difference -₦100.00.",
    );
  });
});
