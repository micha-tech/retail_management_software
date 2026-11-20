import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { psInventory, psInventoryMovements, psOrderEvents, psOrders, psOrderItems, psVariants } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { isReservationExpired } from "./lib/commerce";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type MovementInput = {
  storeId: string; businessId: string; productId: string; variantId: string;
  quantity: number; quantityBefore: number; quantityAfter: number;
  movementType: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RESERVE" | "RELEASE" | "IMPORT" | "REFUND";
  referenceType: string; referenceId?: string | null; actorUserId?: string | null; note?: string | null;
};

async function recordMovement(tx: Tx, input: MovementInput) {
  await tx.insert(psInventoryMovements).values({
    storeId: input.storeId, businessId: input.businessId, productId: input.productId, variantId: input.variantId,
    quantity: input.quantity, quantityBefore: input.quantityBefore, quantityAfter: input.quantityAfter,
    movementType: input.movementType, referenceType: input.referenceType, referenceId: input.referenceId ?? null,
    actorUserId: input.actorUserId ?? null, note: input.note?.slice(0, 300) ?? null,
  });
}

export async function adjustStock(input: { inventoryId: string; storeId: string; businessId: string; quantity: number; note: string; actorUserId: string }) {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) throw new ApplicationError("Enter a non-zero whole number.", "INVALID_ADJUSTMENT");
  if (input.note.trim().length < 3) throw new ApplicationError("Add a short reason for the adjustment.", "INVALID_ADJUSTMENT");
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(psInventory).where(and(eq(psInventory.id, input.inventoryId), eq(psInventory.storeId, input.storeId), eq(psInventory.businessId, input.businessId))).limit(1);
    if (!row) throw new ApplicationError("Inventory record not found.", "NOT_FOUND", 404);
    const [updated] = await tx.update(psInventory)
      .set({ quantityOnHand: sql`${psInventory.quantityOnHand} + ${input.quantity}`, updatedAt: new Date() })
      .where(and(eq(psInventory.id, row.id), sql`${psInventory.quantityOnHand} + ${input.quantity} >= 0`))
      .returning({ after: psInventory.quantityOnHand, before: sql<number>`${psInventory.quantityOnHand} - ${input.quantity}` });
    if (!updated) throw new ApplicationError("Stock cannot fall below zero.", "INSUFFICIENT_STOCK", 409);
    await recordMovement(tx, {
      storeId: input.storeId, businessId: input.businessId, productId: row.productId, variantId: row.variantId,
      quantity: input.quantity, quantityBefore: updated.before, quantityAfter: updated.after,
      movementType: input.quantity > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      referenceType: "manual_adjustment", actorUserId: input.actorUserId, note: input.note,
    });
    return updated.after;
  });
}

export type ReserveLine = { variantId: string; productId: string; quantity: number };

/** Conditional single-statement update: two buyers can never both take the last unit. */
export async function reserveStock(tx: Tx, input: { storeId: string; businessId: string; orderId: string; lines: ReserveLine[] }) {
  for (const line of input.lines) {
    const [variant] = await tx.select({ id: psVariants.id, active: psVariants.active }).from(psVariants)
      .where(and(eq(psVariants.id, line.variantId), eq(psVariants.storeId, input.storeId), eq(psVariants.businessId, input.businessId))).limit(1);
    if (!variant?.active) throw new ApplicationError("A selected variant is no longer available.", "VARIANT_UNAVAILABLE", 409);
    const [updated] = await tx.update(psInventory)
      .set({
        quantityOnHand: sql`${psInventory.quantityOnHand} - ${line.quantity}`,
        reserved: sql`${psInventory.reserved} + ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(psInventory.variantId, line.variantId),
        eq(psInventory.storeId, input.storeId),
        eq(psInventory.businessId, input.businessId),
        sql`${psInventory.quantityOnHand} >= ${line.quantity}`,
      ))
      .returning({ after: psInventory.quantityOnHand, before: sql<number>`${psInventory.quantityOnHand} - ${line.quantity}` });
    if (!updated) throw new ApplicationError("An item is out of stock. Please review your cart.", "INSUFFICIENT_STOCK", 409);
    await recordMovement(tx, {
      storeId: input.storeId, businessId: input.businessId, productId: line.productId, variantId: line.variantId,
      quantity: -line.quantity, quantityBefore: updated.before, quantityAfter: updated.after,
      movementType: "RESERVE", referenceType: "order", referenceId: input.orderId, note: "Reserved at checkout",
    });
  }
}

async function releaseLines(tx: Tx, orderId: string, note: string) {
  const [order] = await tx.select().from(psOrders).where(eq(psOrders.id, orderId)).limit(1);
  if (!order) return false;
  const lines = await tx.select().from(psOrderItems).where(eq(psOrderItems.orderId, order.id));
  let released = false;
  for (const line of lines) {
    const [updated] = await tx.update(psInventory)
      .set({
        quantityOnHand: sql`${psInventory.quantityOnHand} + ${line.quantity}`,
        reserved: sql`${psInventory.reserved} - ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(and(eq(psInventory.variantId, line.variantId), eq(psInventory.storeId, order.storeId), eq(psInventory.businessId, order.businessId), sql`${psInventory.reserved} >= ${line.quantity}`))
      .returning({ after: psInventory.quantityOnHand, before: sql<number>`${psInventory.quantityOnHand} - ${line.quantity}` });
    if (!updated) continue; // already released by another process
    released = true;
    await recordMovement(tx, {
      storeId: order.storeId, businessId: order.businessId, productId: line.productId, variantId: line.variantId,
      quantity: line.quantity, quantityBefore: updated.before, quantityAfter: updated.after,
      movementType: "RELEASE", referenceType: "order", referenceId: order.id, note,
    });
  }
  return released;
}

/** Clears the reserved counter once an order has been paid and is being prepared. */
export async function fulfilReservation(orderId: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(psOrders).where(eq(psOrders.id, orderId)).limit(1);
    if (!order) return;
    const lines = await tx.select().from(psOrderItems).where(eq(psOrderItems.orderId, order.id));
    for (const line of lines) {
      await tx.update(psInventory)
        .set({ reserved: sql`${psInventory.reserved} - ${line.quantity}`, updatedAt: new Date() })
        .where(and(eq(psInventory.variantId, line.variantId), eq(psInventory.storeId, order.storeId), sql`${psInventory.reserved} >= ${line.quantity}`));
    }
  });
}

export async function releaseReservation(orderId: string, note = "Reservation released") {
  return db.transaction((tx) => releaseLines(tx, orderId, note));
}

/** Returns stock to saleable quantity when a paid order is refunded. */
export async function restockOrder(input: { orderId: string; actorUserId: string }) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(psOrders).where(eq(psOrders.id, input.orderId)).limit(1);
    if (!order || order.paymentStatus !== "PAID" || order.fulfilmentStatus === "REFUNDED") return;
    const lines = await tx.select().from(psOrderItems).where(eq(psOrderItems.orderId, order.id));
    for (const line of lines) {
      const [updated] = await tx.update(psInventory)
        .set({ quantityOnHand: sql`${psInventory.quantityOnHand} + ${line.quantity}`, updatedAt: new Date() })
        .where(and(eq(psInventory.variantId, line.variantId), eq(psInventory.storeId, order.storeId), eq(psInventory.businessId, order.businessId)))
        .returning({ after: psInventory.quantityOnHand, before: sql<number>`${psInventory.quantityOnHand} - ${line.quantity}` });
      if (!updated) continue;
      await recordMovement(tx, {
        storeId: order.storeId, businessId: order.businessId, productId: line.productId, variantId: line.variantId,
        quantity: line.quantity, quantityBefore: updated.before, quantityAfter: updated.after,
        movementType: "REFUND", referenceType: "order", referenceId: order.id,
        actorUserId: input.actorUserId, note: "Stock returned after refund",
      });
    }
  });
}

/** Idempotently expires unpaid checkout holds. Called by checkout and a cron route. */
export async function releaseExpiredReservations(limit = 50) {
  const now = new Date();
  const expired = await db.select({ id: psOrders.id, reservedUntil: psOrders.reservedUntil }).from(psOrders)
    .where(and(eq(psOrders.paymentStatus, "PENDING"), eq(psOrders.fulfilmentStatus, "PENDING_PAYMENT")))
    .orderBy(psOrders.reservedUntil).limit(limit);
  const due = expired.filter((order) => isReservationExpired(order.reservedUntil, now));
  for (const order of due) {
    await db.transaction(async (tx) => {
      const [fresh] = await tx.select().from(psOrders).where(eq(psOrders.id, order.id)).limit(1);
      if (!fresh || fresh.paymentStatus !== "PENDING" || fresh.fulfilmentStatus !== "PENDING_PAYMENT") return;
      await releaseLines(tx, order.id, "Checkout reservation expired");
      await tx.update(psOrders).set({ fulfilmentStatus: "CANCELLED", updatedAt: new Date() }).where(eq(psOrders.id, order.id));
      await tx.insert(psOrderEvents).values({ orderId: order.id, status: "CANCELLED", message: "Reservation expired before payment.", actor: "system" });
    });
  }
  return due.length;
}
