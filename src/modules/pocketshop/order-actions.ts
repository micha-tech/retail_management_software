"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, psCustomers, psOrderEvents, psOrders, type BusinessRole } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { hasPermission } from "@/modules/auth/permissions";
import { requirePocketStore } from "./authorization";
import { markPaymentReceived } from "./checkout";
import { canTransition, type FulfilmentStatus } from "./lib/commerce";
import { fulfilReservation, releaseReservation, restockOrder } from "./inventory";
import { orderStatusSchema, type PocketActionState } from "./schemas";

function requireOrderManagement(role: BusinessRole, permissions: readonly string[] | null) {
  if (["OWNER", "ADMIN"].includes(role) || hasPermission(role, "sales:read", permissions)) return;
  throw new ApplicationError("You do not have access to PocketShop orders.", "FORBIDDEN", 403);
}

async function storeOrder(orderId: string, storeId: string, businessId: string) {
  const [order] = await db.select().from(psOrders)
    .where(and(eq(psOrders.id, orderId), eq(psOrders.storeId, storeId), eq(psOrders.businessId, businessId))).limit(1);
  if (!order) throw new ApplicationError("Order not found.", "NOT_FOUND", 404);
  return order;
}

export async function updateOrderStatusAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const access = await requirePocketStore();
  requireOrderManagement(access.role, access.permissions);
  const parsed = orderStatusSchema.safeParse({
    orderId: formData.get("orderId"), status: formData.get("status"),
    note: formData.get("note") || "", trackingRef: formData.get("trackingRef") || "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { orderId, status, note, trackingRef } = parsed.data;
  try {
    const order = await storeOrder(orderId, access.store.id, access.business.id);
    if (!canTransition(order.fulfilmentStatus as FulfilmentStatus, status)) {
      return { error: `Cannot move an order from ${order.fulfilmentStatus.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}.` };
    }
    if (status === "DISPATCHED" || status === "OUT_FOR_DELIVERY") {
      if (order.deliveryMethod !== "DELIVERY") return { error: "Pickup orders cannot be dispatched." };
      if (!trackingRef.trim()) return { error: "Add a tracking reference before dispatching." };
    }
    await db.transaction(async (tx) => {
      await tx.update(psOrders).set({
        fulfilmentStatus: status, trackingRef: trackingRef.trim() || order.trackingRef, updatedAt: new Date(),
      }).where(eq(psOrders.id, order.id));
      await tx.insert(auditLogs).values({
        businessId: access.business.id, userId: access.user.id, action: "POCKETSHOP_ORDER_STATUS",
        entityType: "ps_order", entityId: order.id,
        metadata: { from: order.fulfilmentStatus, to: status, reference: order.reference },
      });
      await tx.insert(psOrderEvents).values({
        orderId: order.id, status, actor: "vendor", actorUserId: access.user.id,
        message: note?.trim() || `Status changed to ${status.replaceAll("_", " ").toLowerCase()}.`,
      });
    });
    if (order.paymentStatus === "PENDING" && status !== "CANCELLED") await fulfilReservation(order.id);
    if (status === "CANCELLED") {
      if (order.paymentStatus === "PAID") await restockOrder({ orderId: order.id, actorUserId: access.user.id });
      else await releaseReservation(order.id, "Order cancelled by vendor");
    }
    if (status === "REFUNDED") await restockOrder({ orderId: order.id, actorUserId: access.user.id });
    revalidatePath(`/pocketshop/orders/${order.id}`);
    revalidatePath("/pocketshop/orders");
    revalidatePath(`/store/${access.store.slug}/track/${order.reference}`);
    redirect("/pocketshop/orders?updated=1");
  } catch (error) {
    return { error: error instanceof ApplicationError ? error.message : "The order could not be updated." };
  }
}

export async function confirmManualPaymentAction(formData: FormData) {
  const access = await requirePocketStore();
  requireOrderManagement(access.role, access.permissions);
  const orderId = String(formData.get("orderId") || "");
  const order = await storeOrder(orderId, access.store.id, access.business.id);
  if (order.paymentMethod !== "BANK_TRANSFER" && order.paymentMethod !== "CASH_ON_DELIVERY") redirect("/pocketshop/orders?error=Online%20payments%20are%20verified%20automatically.");
  await markPaymentReceived({ orderId, storeId: access.store.id, businessId: access.business.id, actorUserId: access.user.id });
  await db.insert(auditLogs).values({
    businessId: access.business.id, userId: access.user.id, action: "POCKETSHOP_PAYMENT_CONFIRMED",
    entityType: "ps_order", entityId: order.id, metadata: { reference: order.reference },
  });
  revalidatePath(`/pocketshop/orders/${order.id}`);
  revalidatePath("/pocketshop/payments");
  redirect("/pocketshop/payments?confirmed=1");
}

export async function saveInternalNoteAction(formData: FormData) {
  const access = await requirePocketStore();
  requireOrderManagement(access.role, access.permissions);
  const orderId = String(formData.get("orderId") || "");
  const note = String(formData.get("internalNotes") || "").trim().slice(0, 1000);
  await db.update(psOrders).set({ internalNotes: note || null, updatedAt: new Date() })
    .where(and(eq(psOrders.id, orderId), eq(psOrders.storeId, access.store.id), eq(psOrders.businessId, access.business.id)));
  revalidatePath(`/pocketshop/orders/${orderId}`);
  redirect("/pocketshop/orders?saved=1");
}

export async function saveCustomerNoteAction(formData: FormData) {
  const access = await requirePocketStore();
  const customerId = String(formData.get("customerId") || "");
  const note = String(formData.get("notes") || "").trim().slice(0, 1000);
  await db.update(psCustomers).set({ notes: note || null, updatedAt: new Date() })
    .where(and(eq(psCustomers.id, customerId), eq(psCustomers.storeId, access.store.id), eq(psCustomers.businessId, access.business.id)));
  revalidatePath("/pocketshop/customers");
  redirect("/pocketshop/customers?saved=1");
}
