import { describe, expect, it } from "vitest";
import { calculateCashDifference, calculateGrossProfit, calculateLineTotal, calculateSaleTotal, formatMoney, parseMoney } from "./money";

describe("exact money", () => {
  it("parses and formats minor units without floating point", () => { expect(parseMoney("1,250.50")).toBe(125050n); expect(formatMoney(125050n, "NGN")).toBe("₦1,250.50"); });
  it("calculates lines and profit exactly", () => { expect(calculateLineTotal(3, 50000n)).toBe(150000n); expect(calculateGrossProfit(150000n, 90000n)).toBe(60000n); });
  it("applies discounts and taxes without floating point", () => { expect(calculateSaleTotal(150000n, 5000n, 725n)).toBe(145725n); expect(() => calculateSaleTotal(100n, 101n)).toThrow(); });
  it("calculates shortage and overage", () => { expect(calculateCashDifference(9900n, 10000n)).toBe(-100n); expect(calculateCashDifference(10100n, 10000n)).toBe(100n); });
  it("rejects fractions smaller than minor units", () => expect(() => parseMoney("1.001")).toThrow());
});
