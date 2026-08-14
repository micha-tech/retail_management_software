import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { auditLogs, branchInventory, products, stockMovements, stockReceiptItems, stockReceipts } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { activeInventoryCount, inventoryBranchLock } from "./count-guard";

export type ReceiptItem = { productId: string; quantity: number; unitCost: bigint };
export async function receiveStock(input: { businessId: string; branchId: string; userId: string; supplierReference?: string; notes?: string; items: ReceiptItem[] }) {
  if (!input.items.length || new Set(input.items.map((i) => i.productId)).size !== input.items.length) throw new ApplicationError("Receipt items must be unique.", "INVALID_RECEIPT");
  return db.transaction(async (tx) => {
    await tx.execute(inventoryBranchLock(input.branchId)); const activeCount=await tx.execute<{id:string;count_number:string}>(activeInventoryCount(input.branchId)); if(activeCount[0])throw new ApplicationError(`Inventory count ${activeCount[0].count_number} is active. Stock receiving is paused.`,"INVENTORY_COUNT_ACTIVE",409);
    const catalogue = await tx.select({ id: products.id, active: products.active, costPrice: products.costPrice }).from(products).where(and(eq(products.businessId, input.businessId), inArray(products.id, input.items.map((i) => i.productId))));
    if (catalogue.length !== input.items.length || catalogue.some((p) => !p.active)) throw new ApplicationError("One or more products are unavailable.", "INVALID_PRODUCT");
    const receiptNumber = `RCV-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const [receipt] = await tx.insert(stockReceipts).values({ businessId: input.businessId, branchId: input.branchId, receiptNumber, supplierReference: input.supplierReference || null, notes: input.notes || null, receivedBy: input.userId }).returning({ id: stockReceipts.id });
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.unitCost < 0n) throw new ApplicationError("Receipt quantities and costs are invalid.", "INVALID_RECEIPT");
      await tx.insert(stockReceiptItems).values({ receiptId: receipt.id, ...item });
      const [balance] = await tx.insert(branchInventory).values({ businessId: input.businessId, branchId: input.branchId, productId: item.productId, quantityOnHand: item.quantity }).onConflictDoUpdate({ target: [branchInventory.branchId, branchInventory.productId], set: { quantityOnHand: sql`${branchInventory.quantityOnHand} + ${item.quantity}`, updatedAt: new Date() } }).returning({ after: branchInventory.quantityOnHand });
      await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: input.branchId, productId: item.productId, movementType: "STOCK_RECEIVED", quantity: item.quantity, quantityBefore: balance.after - item.quantity, quantityAfter: balance.after, referenceType: "stock_receipt", referenceId: receipt.id, performedBy: input.userId });
      const priorCost = catalogue.find((product) => product.id === item.productId)?.costPrice ?? 0n;
      if (item.unitCost > 0n && item.unitCost !== priorCost) { await tx.update(products).set({ costPrice: item.unitCost, updatedAt: new Date() }).where(and(eq(products.id, item.productId), eq(products.businessId, input.businessId))); await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.userId, action: "product.cost_changed", entityType: "product", entityId: item.productId, metadata: { oldCost: priorCost.toString(), newCost: item.unitCost.toString(), receiptId: receipt.id } }); }
    }
    await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.userId, action: "stock.received", entityType: "stock_receipt", entityId: receipt.id, metadata: { receiptNumber, lineCount: input.items.length } });
    return { id: receipt.id, receiptNumber };
  });
}

export async function adjustStock(input: { businessId: string; branchId: string; productId: string; userId: string; newQuantity: number; reason: string }) {
  if (!Number.isInteger(input.newQuantity) || input.newQuantity < 0 || input.reason.trim().length < 3) throw new ApplicationError("A valid quantity and reason are required.", "INVALID_ADJUSTMENT");
  return db.transaction(async (tx) => {
    await tx.execute(inventoryBranchLock(input.branchId)); const activeCount=await tx.execute<{id:string;count_number:string}>(activeInventoryCount(input.branchId)); if(activeCount[0])throw new ApplicationError(`Inventory count ${activeCount[0].count_number} is active. Adjustments are paused.`,"INVENTORY_COUNT_ACTIVE",409);
    const [product] = await tx.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.businessId, input.businessId), eq(products.active, true), eq(products.trackInventory, true))).limit(1);
    if (!product) throw new ApplicationError("Product is unavailable or does not track inventory.", "INVALID_PRODUCT", 409);
    await tx.insert(branchInventory).values({ businessId: input.businessId, branchId: input.branchId, productId: input.productId, quantityOnHand: 0 }).onConflictDoNothing();
    const rows = await tx.execute<{ quantity_on_hand: number }>(sql`select quantity_on_hand from branch_inventory where business_id = ${input.businessId} and branch_id = ${input.branchId} and product_id = ${input.productId} for update`);
    const before = rows[0]?.quantity_on_hand;
    if (before === undefined) throw new ApplicationError("Inventory record not found.", "INVENTORY_NOT_FOUND", 404);
    const delta = input.newQuantity - before;
    if (delta === 0) throw new ApplicationError("The quantity has not changed.", "NO_CHANGE");
    await tx.update(branchInventory).set({ quantityOnHand: input.newQuantity, updatedAt: new Date() }).where(and(eq(branchInventory.branchId, input.branchId), eq(branchInventory.productId, input.productId)));
    const [movement] = await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: input.branchId, productId: input.productId, movementType: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT", quantity: delta, quantityBefore: before, quantityAfter: input.newQuantity, referenceType: "manual_adjustment", referenceId: randomUUID(), reason: input.reason.trim(), performedBy: input.userId }).returning({ id: stockMovements.id });
    await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.userId, action: "stock.adjusted", entityType: "stock_movement", entityId: movement.id, metadata: { productId: input.productId, before, after: input.newQuantity, reason: input.reason.trim() } });
    return movement;
  });
}
