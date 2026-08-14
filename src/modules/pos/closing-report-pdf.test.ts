import { describe, expect, it } from "vitest";

import { buildClosingReportPdf, closingReportFilename, summarizeClosingReport, type ClosingReportData } from "./closing-report-pdf";

function fixture(): ClosingReportData {
  return {
    businessName: "Retail Logic Demo",
    branchName: "Ikeja",
    branchCode: "IKJ",
    cashierName: "Demo Cashier",
    currency: "NGN",
    timezone: "Africa/Lagos",
    sessionId: "4b5adf80-4591-4c41-9890-bff82efea72f",
    openedAt: new Date("2026-08-14T07:00:00.000Z"),
    closedAt: new Date("2026-08-14T17:05:00.000Z"),
    openingCash: 1000000n,
    expectedCash: 2475000n,
    actualCash: 2470000n,
    cashDifference: -5000n,
    generatedAt: new Date("2026-08-14T17:06:00.000Z"),
    sales: [
      { saleNumber: "SAL-20260814-0001", completedAt: new Date("2026-08-14T08:15:00.000Z"), status: "COMPLETED", subtotal: 1500000n, discount: 25000n, tax: 0n, total: 1475000n, itemCount: 4, paymentMethods: ["CASH"] },
      { saleNumber: "SAL-20260814-0002", completedAt: new Date("2026-08-14T09:00:00.000Z"), status: "VOIDED", subtotal: 300000n, discount: 0n, tax: 0n, total: 300000n, itemCount: 1, paymentMethods: [] },
    ],
    payments: [{ method: "CASH", amount: 1475000n }],
    cashMovements: [
      { type: "CASH_IN", amount: 50000n, reason: "Change added", createdAt: new Date("2026-08-14T10:00:00.000Z") },
      { type: "CASH_OUT", amount: 25000n, reason: "Petty cash", createdAt: new Date("2026-08-14T12:00:00.000Z") },
    ],
  };
}

describe("POS closing report PDF", () => {
  it("summarizes only completed sales and reconciles cash movements", () => {
    expect(summarizeClosingReport(fixture())).toEqual({ transactions: 1, netSales: 1475000n, discounts: 25000n, items: 4, cashIn: 50000n, cashOut: 25000n });
  });

  it("builds a valid PDF document", async () => {
    const pdf = await buildClosingReportPdf(fixture());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
  });

  it("creates a branch and date specific download name", () => {
    expect(closingReportFilename(fixture())).toBe("pos-closing-ikj-2026-08-14.pdf");
  });
});
