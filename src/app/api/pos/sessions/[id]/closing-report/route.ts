import { and, asc, eq, sum } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { branches, cashMovements, payments, posSessions, saleItems, sales, users } from "@/db/schema";
import { requireBranchAccess, requirePermission } from "@/modules/auth/authorization";
import { buildClosingReportPdf, closingReportFilename, type ClosingReportPayment } from "@/modules/pos/closing-report-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("pos:operate");
  const parsedId = z.uuid().safeParse((await params).id);
  if (!parsedId.success) return new Response("Closing report not found.", { status: 404 });

  const [session] = await db.select({
    id: posSessions.id,
    businessId: posSessions.businessId,
    branchId: posSessions.branchId,
    cashierId: posSessions.cashierId,
    cashierName: users.name,
    branchName: branches.name,
    branchCode: branches.code,
    openedAt: posSessions.openedAt,
    closedAt: posSessions.closedAt,
    openingCash: posSessions.openingCash,
    expectedCash: posSessions.expectedCash,
    actualCash: posSessions.actualCash,
    cashDifference: posSessions.cashDifference,
    status: posSessions.status,
  }).from(posSessions)
    .innerJoin(branches, eq(branches.id, posSessions.branchId))
    .innerJoin(users, eq(users.id, posSessions.cashierId))
    .where(and(eq(posSessions.id, parsedId.data), eq(posSessions.businessId, access.business.id)))
    .limit(1);

  if (!session) return new Response("Closing report not found.", { status: 404 });
  await requireBranchAccess(session.branchId);
  if (session.status !== "CLOSED" || !session.closedAt || session.expectedCash === null || session.actualCash === null || session.cashDifference === null) {
    return new Response("Close and reconcile this POS session before downloading its report.", { status: 409 });
  }

  const [saleRows, itemRows, paymentRows, movementRows] = await Promise.all([
    db.select({ id: sales.id, saleNumber: sales.saleNumber, completedAt: sales.completedAt, status: sales.status, subtotal: sales.subtotal, discount: sales.discountTotal, tax: sales.taxTotal, total: sales.total })
      .from(sales)
      .where(and(eq(sales.businessId, access.business.id), eq(sales.branchId, session.branchId), eq(sales.posSessionId, session.id)))
      .orderBy(asc(sales.completedAt)),
    db.select({ saleId: saleItems.saleId, quantity: sum(saleItems.quantity) })
      .from(saleItems)
      .innerJoin(sales, eq(sales.id, saleItems.saleId))
      .where(and(eq(sales.businessId, access.business.id), eq(sales.branchId, session.branchId), eq(sales.posSessionId, session.id)))
      .groupBy(saleItems.saleId),
    db.select({ saleId: payments.saleId, method: payments.paymentMethod, amount: payments.amount, status: payments.status })
      .from(payments)
      .where(and(eq(payments.businessId, access.business.id), eq(payments.branchId, session.branchId), eq(payments.posSessionId, session.id))),
    db.select({ type: cashMovements.type, amount: cashMovements.amount, reason: cashMovements.reason, createdAt: cashMovements.createdAt })
      .from(cashMovements)
      .where(and(eq(cashMovements.businessId, access.business.id), eq(cashMovements.branchId, session.branchId), eq(cashMovements.posSessionId, session.id)))
      .orderBy(asc(cashMovements.createdAt)),
  ]);

  const itemCounts = new Map(itemRows.map((row) => [row.saleId, Number(row.quantity ?? 0)]));
  const methodsBySale = new Map<string, Set<string>>();
  const paymentTotals = new Map<string, bigint>();
  for (const payment of paymentRows) {
    if (payment.status !== "COMPLETED") continue;
    const methods = methodsBySale.get(payment.saleId) ?? new Set<string>();
    methods.add(payment.method);
    methodsBySale.set(payment.saleId, methods);
    paymentTotals.set(payment.method, (paymentTotals.get(payment.method) ?? 0n) + payment.amount);
  }
  const paymentSummary: ClosingReportPayment[] = [...paymentTotals].map(([method, amount]) => ({ method, amount }));

  const report = {
    businessName: access.business.name,
    branchName: session.branchName,
    branchCode: session.branchCode,
    cashierName: session.cashierName,
    currency: access.business.currency,
    timezone: access.business.timezone,
    sessionId: session.id,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openingCash: session.openingCash,
    expectedCash: session.expectedCash,
    actualCash: session.actualCash,
    cashDifference: session.cashDifference,
    generatedAt: new Date(),
    sales: saleRows.map(({ id, ...sale }) => ({ ...sale, itemCount: itemCounts.get(id) ?? 0, paymentMethods: [...(methodsBySale.get(id) ?? [])] })),
    payments: paymentSummary,
    cashMovements: movementRows,
  };

  const pdf = await buildClosingReportPdf(report);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${closingReportFilename(report)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
