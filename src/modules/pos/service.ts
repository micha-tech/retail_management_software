import "server-only";
import { and, eq, inArray, sql, sum } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { auditLogs, branchInventory, cashMovements, payments, posSessions, products, saleItems, sales, stockMovements, type PaymentMethod } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { activeInventoryCount, inventoryBranchLock } from "@/modules/inventory/count-guard";
import { calculateLineTotal, calculateSaleTotal } from "@/lib/money";

export type CheckoutInput = { businessId: string; branchId: string; cashierId: string; sessionId: string; idempotencyKey: string; discountTotal?: bigint; items: { productId: string; quantity: number }[]; payments: { method: PaymentMethod; amount: bigint; reference?: string }[] };

export async function checkout(input: CheckoutInput) {
  if (!input.items.length || new Set(input.items.map((i) => i.productId)).size !== input.items.length) throw new ApplicationError("Cart items must be unique.", "INVALID_CART");
  if (!input.payments.length || input.idempotencyKey.length < 12 || input.idempotencyKey.length > 100) throw new ApplicationError("Checkout details are invalid.", "INVALID_CHECKOUT");
  const existing = await db.select().from(sales).where(and(eq(sales.businessId, input.businessId), eq(sales.idempotencyKey, input.idempotencyKey))).limit(1);
  if (existing[0]) return existing[0];
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(inventoryBranchLock(input.branchId));
      const activeCount=await tx.execute<{id:string;count_number:string}>(activeInventoryCount(input.branchId));
      if(activeCount[0])throw new ApplicationError(`Inventory count ${activeCount[0].count_number} is active. Checkout is paused for this branch.`,"INVENTORY_COUNT_ACTIVE",409);
      const [session] = await tx.select().from(posSessions).where(and(eq(posSessions.id, input.sessionId), eq(posSessions.businessId, input.businessId), eq(posSessions.branchId, input.branchId), eq(posSessions.cashierId, input.cashierId), eq(posSessions.status, "OPEN"))).limit(1);
      if (!session) throw new ApplicationError("POS session is closed or unavailable.", "POS_SESSION_CLOSED", 409);
      const sortedItems = [...input.items].sort((a, b) => a.productId.localeCompare(b.productId));
      if (sortedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100_000)) throw new ApplicationError("Cart quantity is invalid.", "INVALID_CART");
      const catalogue = await tx.select().from(products).where(and(eq(products.businessId, input.businessId), eq(products.active, true), inArray(products.id, sortedItems.map((i) => i.productId))));
      if (catalogue.length !== sortedItems.length) throw new ApplicationError("A product is no longer active.", "PRODUCT_UNAVAILABLE", 409);
      const byId = new Map(catalogue.map((p) => [p.id, p]));
      const calculated = sortedItems.map((item) => { const product = byId.get(item.productId)!; return { product, quantity: item.quantity, lineTotal: calculateLineTotal(item.quantity, product.sellingPrice) }; });
      const subtotal = calculated.reduce((total, line) => total + line.lineTotal, 0n); const discountTotal = input.discountTotal ?? 0n; let total: bigint; try { total = calculateSaleTotal(subtotal, discountTotal); } catch { throw new ApplicationError("Discount cannot exceed the sale subtotal.", "INVALID_DISCOUNT"); }
      if (input.payments.some((p) => p.amount <= 0n) || input.payments.reduce((amount, p) => amount + p.amount, 0n) !== total) throw new ApplicationError("Payment amount does not match sale total.", "PAYMENT_MISMATCH");
      for (const line of calculated.filter((line) => line.product.trackInventory)) {
        const locked = await tx.execute<{ quantity_on_hand: number }>(sql`select quantity_on_hand from branch_inventory where business_id = ${input.businessId} and branch_id = ${input.branchId} and product_id = ${line.product.id} for update`);
        if (!locked[0] || locked[0].quantity_on_hand < line.quantity) throw new ApplicationError(`Insufficient inventory for ${line.product.name}.`, "INSUFFICIENT_INVENTORY", 409);
      }
      const saleNumber = `SAL-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const [sale] = await tx.insert(sales).values({ businessId: input.businessId, branchId: input.branchId, posSessionId: input.sessionId, cashierId: input.cashierId, saleNumber, subtotal, discountTotal, total, idempotencyKey: input.idempotencyKey }).returning();
      for (const line of calculated) {
        await tx.insert(saleItems).values({ saleId: sale.id, productId: line.product.id, productNameSnapshot: line.product.name, skuSnapshot: line.product.sku, quantity: line.quantity, unitPrice: line.product.sellingPrice, costPriceSnapshot: line.product.costPrice, lineTotal: line.lineTotal });
        if (line.product.trackInventory) { const [balance] = await tx.update(branchInventory).set({ quantityOnHand: sql`${branchInventory.quantityOnHand} - ${line.quantity}`, updatedAt: new Date() }).where(and(eq(branchInventory.branchId, input.branchId), eq(branchInventory.productId, line.product.id))).returning({ after: branchInventory.quantityOnHand }); await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: input.branchId, productId: line.product.id, movementType: "SALE", quantity: -line.quantity, quantityBefore: balance.after + line.quantity, quantityAfter: balance.after, referenceType: "sale", referenceId: sale.id, performedBy: input.cashierId }); }
      }
      await tx.insert(payments).values(input.payments.map((payment) => ({ businessId: input.businessId, branchId: input.branchId, saleId: sale.id, posSessionId: input.sessionId, paymentMethod: payment.method, amount: payment.amount, reference: payment.reference || null, receivedBy: input.cashierId })));
      await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.cashierId, action: "sale.completed", entityType: "sale", entityId: sale.id, metadata: { saleNumber, subtotal: subtotal.toString(), discountTotal: discountTotal.toString(), total: total.toString(), itemCount: calculated.length } });
      return sale;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") { const duplicate = await db.select().from(sales).where(and(eq(sales.businessId, input.businessId), eq(sales.idempotencyKey, input.idempotencyKey))).limit(1); if (duplicate[0]) return duplicate[0]; }
    logger.error("checkout.failed",error,{businessId:input.businessId,branchId:input.branchId,cashierId:input.cashierId,sessionId:input.sessionId,itemCount:input.items.length,applicationCode:error instanceof ApplicationError?error.code:undefined});
    throw error;
  }
}

export async function openPosSession(input: { businessId: string; branchId: string; cashierId: string; openingCash: bigint }) { if (input.openingCash < 0n) throw new ApplicationError("Opening cash cannot be negative.", "INVALID_OPENING_CASH"); return db.transaction(async (tx) => { await tx.execute(inventoryBranchLock(input.branchId));const activeCount=await tx.execute<{id:string;count_number:string}>(activeInventoryCount(input.branchId));if(activeCount[0])throw new ApplicationError(`Inventory count ${activeCount[0].count_number} is active. POS cannot be opened.`,"INVENTORY_COUNT_ACTIVE",409);const [session] = await tx.insert(posSessions).values({ ...input }).returning(); await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.cashierId, action: "pos_session.opened", entityType: "pos_session", entityId: session.id, metadata: { openingCash: input.openingCash.toString() } }); return session; }); }

export async function closePosSession(input: { businessId: string; branchId: string; cashierId: string; sessionId: string; actualCash: bigint }) { if (input.actualCash < 0n) throw new ApplicationError("Actual cash cannot be negative.", "INVALID_CASH"); return db.transaction(async (tx) => { const locked = await tx.execute<{ id: string; opening_cash: string }>(sql`select id, opening_cash from pos_sessions where id = ${input.sessionId} and business_id = ${input.businessId} and branch_id = ${input.branchId} and cashier_id = ${input.cashierId} and status = 'OPEN' for update`); if (!locked[0]) throw new ApplicationError("POS session is already closed.", "POS_SESSION_CLOSED", 409); const [cashSales] = await tx.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.posSessionId, input.sessionId), eq(payments.paymentMethod, "CASH"), eq(payments.status, "COMPLETED"))); const movements = await tx.select().from(cashMovements).where(eq(cashMovements.posSessionId, input.sessionId)); const netMovement = movements.reduce((total, movement) => total + (movement.type === "CASH_IN" ? movement.amount : -movement.amount), 0n); const expectedCash = BigInt(locked[0].opening_cash) + BigInt(cashSales?.total ?? 0) + netMovement; const difference = input.actualCash - expectedCash; const [session] = await tx.update(posSessions).set({ status: "CLOSED", closedAt: new Date(), expectedCash, actualCash: input.actualCash, cashDifference: difference }).where(eq(posSessions.id, input.sessionId)).returning(); await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.cashierId, action: "pos_session.closed", entityType: "pos_session", entityId: input.sessionId, metadata: { expectedCash: expectedCash.toString(), actualCash: input.actualCash.toString(), difference: difference.toString() } }); return session; }); }

export async function recordCashMovement(input: { businessId: string; branchId: string; cashierId: string; sessionId: string; type: "CASH_IN" | "CASH_OUT"; amount: bigint; reason: string }) {
  if (input.amount <= 0n || input.reason.trim().length < 3) throw new ApplicationError("Enter a positive amount and a clear reason.", "INVALID_CASH_MOVEMENT");
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string; opening_cash: string }>(sql`select id,opening_cash from pos_sessions where id=${input.sessionId} and business_id=${input.businessId} and branch_id=${input.branchId} and cashier_id=${input.cashierId} and status='OPEN' for update`);
    if (!locked[0]) throw new ApplicationError("POS session is closed or unavailable.", "POS_SESSION_CLOSED", 409);
    if (input.type === "CASH_OUT") {
      const [cashSales] = await tx.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.posSessionId, input.sessionId), eq(payments.paymentMethod, "CASH"), eq(payments.status, "COMPLETED")));
      const prior = await tx.select().from(cashMovements).where(eq(cashMovements.posSessionId, input.sessionId));
      const expected = BigInt(locked[0].opening_cash) + BigInt(cashSales?.total ?? 0) + prior.reduce((total, movement) => total + (movement.type === "CASH_IN" ? movement.amount : -movement.amount), 0n);
      if (input.amount > expected) throw new ApplicationError("Cash removed cannot exceed the expected till balance.", "INSUFFICIENT_TILL_CASH", 409);
    }
    const [movement] = await tx.insert(cashMovements).values({ businessId: input.businessId, branchId: input.branchId, posSessionId: input.sessionId, type: input.type, amount: input.amount, reason: input.reason.trim(), performedBy: input.cashierId }).returning();
    await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.cashierId, action: input.type === "CASH_IN" ? "pos_session.cash_added" : "pos_session.cash_removed", entityType: "cash_movement", entityId: movement.id, metadata: { sessionId: input.sessionId, amount: input.amount.toString(), reason: input.reason.trim() } });
    return movement;
  });
}
