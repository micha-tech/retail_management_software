import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  paymentBanks, psCartItems, psCarts, psCustomers, psDeliveryZones, psInventory, psOrders,
  psOrderEvents, psOrderItems, psPayments, psProductImages, psProducts, psVariants,
} from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { calculateCartTotals, createOrderReference, reservationDeadline } from "./lib/commerce";
import { hashToken } from "./lib/security";
import { fulfilReservation, reserveStock } from "./inventory";
import { initializeGatewayPayment, isPaystackConfigured } from "./payments";

export type CheckoutInput = {
  storeId: string; businessId: string; currency: string; settings: {
    paymentMethods: string[]; paymentTiming: "BEFORE_DELIVERY" | "ON_DELIVERY" | "PARTIAL"; depositPercent: number;
    deliveryEnabled: boolean; pickupEnabled: boolean; codEnabled: boolean;
  };
  cartToken: string; idempotencyKey: string; accessToken: string;
  customerName: string; customerPhone: string; customerEmail: string | null;
  deliveryMethod: "DELIVERY" | "PICKUP"; deliveryZoneId: string | null;
  address: string; city: string; state: string; deliveryInstructions: string;
  paymentMethod: "CARD" | "BANK_TRANSFER" | "USSD" | "CASH_ON_DELIVERY";
};

export type CheckoutResult = { orderId: string; reference: string; alreadyExisted: boolean; gatewayUrl: string | null };

export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  if (!input.settings.paymentMethods.includes(input.paymentMethod)) throw new ApplicationError("This payment method is not available for the store.", "PAYMENT_METHOD_UNAVAILABLE", 409);
  if ((input.paymentMethod === "CARD" || input.paymentMethod === "USSD") && !isPaystackConfigured()) throw new ApplicationError("Online payments are not configured yet.", "PAYMENT_GATEWAY_UNAVAILABLE", 503);
  if (input.deliveryMethod === "DELIVERY" && !input.settings.deliveryEnabled) throw new ApplicationError("This store does not offer delivery.", "DELIVERY_UNAVAILABLE", 409);
  if (input.deliveryMethod === "PICKUP" && !input.settings.pickupEnabled) throw new ApplicationError("This store does not offer pickup.", "PICKUP_UNAVAILABLE", 409);
  if (input.deliveryMethod === "DELIVERY" && !input.address.trim()) throw new ApplicationError("Enter a delivery address.", "ADDRESS_REQUIRED");

  const [existing] = await db.select().from(psOrders).where(and(eq(psOrders.storeId, input.storeId), eq(psOrders.idempotencyKey, input.idempotencyKey))).limit(1);
  if (existing) return { orderId: existing.id, reference: existing.reference, alreadyExisted: true, gatewayUrl: null };

  const [cart] = await db.select().from(psCarts).where(and(eq(psCarts.storeId, input.storeId), eq(psCarts.token, input.cartToken))).limit(1);
  if (!cart) throw new ApplicationError("Your cart is empty.", "EMPTY_CART", 409);
  const lines = await db.select({
    itemId: psCartItems.id, quantity: psCartItems.quantity, variantId: psCartItems.variantId,
    productId: psProducts.id, productName: psProducts.name, price: psProducts.price, status: psProducts.status,
    variantName: psVariants.name, variantValue: psVariants.value, variantPrice: psVariants.price, variantActive: psVariants.active,
    available: psInventory.quantityOnHand, imageId: psProductImages.assetId,
  }).from(psCartItems)
    .innerJoin(psVariants, eq(psVariants.id, psCartItems.variantId))
    .innerJoin(psProducts, eq(psProducts.id, psVariants.productId))
    .leftJoin(psInventory, eq(psInventory.variantId, psVariants.id))
    .leftJoin(psProductImages, and(eq(psProductImages.productId, psProducts.id), eq(psProductImages.position, 0)))
    .where(eq(psCartItems.cartId, cart.id));
  if (!lines.length) throw new ApplicationError("Your cart is empty.", "EMPTY_CART", 409);
  if (lines.some((line) => line.status !== "ACTIVE" || !line.variantActive || (line.available ?? 0) < line.quantity)) {
    throw new ApplicationError("An item in your cart is unavailable or out of stock.", "CART_UNAVAILABLE", 409);
  }

  let deliveryFee = 0n;
  let zoneName: string | null = null;
  if (input.deliveryMethod === "DELIVERY" && input.deliveryZoneId) {
    const [zone] = await db.select().from(psDeliveryZones).where(and(eq(psDeliveryZones.id, input.deliveryZoneId), eq(psDeliveryZones.storeId, input.storeId), eq(psDeliveryZones.businessId, input.businessId), eq(psDeliveryZones.active, true))).limit(1);
    if (!zone) throw new ApplicationError("Select an available delivery area.", "INVALID_ZONE", 409);
    deliveryFee = zone.fee;
    zoneName = zone.name;
  }
  const priced = lines.map((line) => ({ quantity: line.quantity, unitPrice: line.variantPrice ?? line.price }));
  const totals = calculateCartTotals(priced, deliveryFee);
  const bankId = input.paymentMethod === "BANK_TRANSFER"
    ? (await db.select({ id: paymentBanks.id }).from(paymentBanks).where(and(eq(paymentBanks.businessId, input.businessId), eq(paymentBanks.active, true))).limit(1))[0]?.id
    : undefined;
  if (input.paymentMethod === "BANK_TRANSFER" && !bankId) throw new ApplicationError("Bank transfer is not configured for this store yet.", "BANK_NOT_CONFIGURED", 409);

  const reference = createOrderReference();
  const reservedUntil = reservationDeadline();
  const isPayNow = input.settings.paymentTiming === "BEFORE_DELIVERY" || input.settings.paymentTiming === "PARTIAL" || input.paymentMethod === "CARD" || input.paymentMethod === "USSD";
  const startStatus = isPayNow ? "PENDING_PAYMENT" : "CONFIRMED";

  let orderId = "";
  try {
    await db.transaction(async (tx) => {
      const phone = input.customerPhone.trim();
      const [customer] = await tx.insert(psCustomers).values({
        storeId: input.storeId, businessId: input.businessId, name: input.customerName.trim(), phone,
        email: input.customerEmail || null, address: input.address || null, city: input.city || null, state: input.state || null,
      }).onConflictDoUpdate({
        target: [psCustomers.storeId, psCustomers.phone],
        set: { name: input.customerName.trim(), email: input.customerEmail || null, updatedAt: new Date() },
      }).returning({ id: psCustomers.id });

      const [order] = await tx.insert(psOrders).values({
        storeId: input.storeId, businessId: input.businessId, reference, customerId: customer.id,
        customerName: input.customerName.trim(), customerPhone: phone, customerEmail: input.customerEmail || null,
        deliveryMethod: input.deliveryMethod, deliveryZoneId: input.deliveryZoneId || null,
        address: input.address || null, city: input.city || null, state: input.state || null,
        deliveryInstructions: input.deliveryInstructions || null,
        subtotal: totals.subtotal, deliveryFee, total: totals.total, depositAmount: totals.depositAmount,
        currency: input.currency, paymentMethod: input.paymentMethod, paymentTiming: input.settings.paymentTiming,
        fulfilmentStatus: startStatus, accessTokenHash: hashToken(input.accessToken), idempotencyKey: input.idempotencyKey,
        reservedUntil,
      }).returning({ id: psOrders.id, reference: psOrders.reference });
      orderId = order.id;

      await reserveStock(tx, {
        storeId: input.storeId, businessId: input.businessId, orderId: order.id,
        lines: lines.map((line) => ({ variantId: line.variantId, productId: line.productId, quantity: line.quantity })),
      });

      await tx.insert(psOrderItems).values(lines.map((line, index) => {
        const unitPrice = line.variantPrice ?? line.price;
        return {
          orderId: order.id, productId: line.productId, variantId: line.variantId,
          productName: line.productName,
          variantName: [line.variantName, line.variantValue].filter((part) => part !== "Default").join(" · ") || "Standard",
          sku: `${line.productId.slice(0, 6)}-${line.variantId.slice(0, 6)}`.toUpperCase(),
          imageUrl: line.imageId ? `/api/pocketshop/assets/${line.imageId}` : null,
          quantity: line.quantity, unitPrice, lineTotal: unitPrice * BigInt(line.quantity),
        };
      }));

      await tx.insert(psOrderEvents).values({
        orderId: order.id, status: startStatus, actor: "customer",
        message: `Order placed · ${input.paymentMethod.replaceAll("_", " ").toLowerCase()}${zoneName ? ` · ${zoneName}` : ""}`,
      });

      if (input.paymentMethod === "CASH_ON_DELIVERY" || input.paymentMethod === "BANK_TRANSFER") {
        await tx.insert(psPayments).values({
          orderId: order.id, storeId: input.storeId, provider: "MANUAL", method: input.paymentMethod,
          amount: input.paymentMethod === "BANK_TRANSFER" && input.settings.paymentTiming !== "ON_DELIVERY" ? totals.total : totals.depositAmount || totals.total,
          currency: input.currency, status: "PENDING", metadata: { requiresVendorVerification: true },
        });
      }

      await tx.delete(psCartItems).where(eq(psCartItems.cartId, cart.id));
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const duplicate = await db.select().from(psOrders).where(and(eq(psOrders.storeId, input.storeId), eq(psOrders.idempotencyKey, input.idempotencyKey))).limit(1);
      if (duplicate[0]) return { orderId: duplicate[0].id, reference: duplicate[0].reference, alreadyExisted: true, gatewayUrl: null };
    }
    throw error;
  }

  let gatewayUrl: string | null = null;
  if (input.paymentMethod === "CARD" || input.paymentMethod === "USSD") {
    const gateway = await initializeGatewayPayment({
      orderId, reference, amount: input.settings.paymentTiming === "PARTIAL" ? totals.depositAmount : totals.total,
      email: input.customerEmail || `${input.customerPhone.replace(/\D/g, "")}@pocketshop.local`, currency: input.currency,
    });
    gatewayUrl = gateway.authorizationUrl;
  }
  return { orderId, reference, alreadyExisted: false, gatewayUrl };
}

export async function getOrderForTracking(storeId: string, reference: string, tokenHash: string) {
  const [order] = await db.select().from(psOrders).where(and(eq(psOrders.storeId, storeId), eq(psOrders.reference, reference), eq(psOrders.accessTokenHash, tokenHash))).limit(1);
  return order ?? null;
}

export async function getStoreOrders(storeId: string, ids?: string[]) {
  const rows = await db.select().from(psOrders).where(eq(psOrders.storeId, storeId));
  return ids ? rows.filter((row) => ids.includes(row.id)) : rows;
}

export async function markPaymentReceived(input: { orderId: string; storeId: string; businessId: string; actorUserId: string }) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(psOrders).where(and(eq(psOrders.id, input.orderId), eq(psOrders.storeId, input.storeId), eq(psOrders.businessId, input.businessId))).limit(1);
    if (!order || order.paymentStatus === "PAID") return;
    const nextStatus = order.fulfilmentStatus === "PENDING_PAYMENT" ? "CONFIRMED" : order.fulfilmentStatus;
    await tx.update(psOrders).set({ paymentStatus: "PAID", paidAt: new Date(), fulfilmentStatus: nextStatus, updatedAt: new Date() }).where(eq(psOrders.id, order.id));
    await tx.update(psPayments).set({ status: "PAID", paidAt: new Date() }).where(and(eq(psPayments.orderId, order.id), eq(psPayments.status, "PENDING")));
    await tx.insert(psOrderEvents).values({ orderId: order.id, status: nextStatus, actor: "vendor", actorUserId: input.actorUserId, message: "Payment confirmed by vendor." });
  });
  await fulfilReservation(input.orderId);
}

/** Idempotent gateway confirmation. The amount must come from a trusted event or API lookup. */
export async function confirmGatewayOrder(reference: string, paidAmount: bigint): Promise<{ confirmed: boolean; alreadyPaid: boolean }> {
  const [payment] = await db.select().from(psPayments).where(and(eq(psPayments.provider, "PAYSTACK"), eq(psPayments.providerReference, reference))).limit(1);
  if (!payment) return { confirmed: false, alreadyPaid: false };
  if (payment.status === "PAID") return { confirmed: false, alreadyPaid: true };
  if (paidAmount !== payment.amount || paidAmount <= 0n) return { confirmed: false, alreadyPaid: false };
  await db.transaction(async (tx) => {
    const [fresh] = await tx.select().from(psPayments).where(eq(psPayments.id, payment.id)).limit(1);
    if (!fresh || fresh.status === "PAID") return;
    await tx.update(psPayments).set({ status: "PAID", paidAt: new Date() }).where(eq(psPayments.id, fresh.id));
    await tx.update(psOrders).set({
      paymentStatus: "PAID", paidAt: new Date(),
      fulfilmentStatus: sql`CASE WHEN ${psOrders.fulfilmentStatus} = 'PENDING_PAYMENT' THEN 'CONFIRMED'::ps_fulfilment_status ELSE ${psOrders.fulfilmentStatus} END`,
      updatedAt: new Date(),
    }).where(eq(psOrders.id, fresh.orderId));
    await tx.insert(psOrderEvents).values({ orderId: fresh.orderId, status: "CONFIRMED", actor: "gateway", message: "Payment confirmed by payment gateway." });
  });
  const [freshOrder] = await db.select().from(psOrders).where(eq(psOrders.id, payment.orderId)).limit(1);
  if (freshOrder && freshOrder.paymentStatus === "PAID") await fulfilReservation(freshOrder.id);
  return { confirmed: true, alreadyPaid: false };
}

export async function markPaymentFailed(orderReference: string) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(psOrders).where(eq(psOrders.reference, orderReference)).limit(1);
    if (!order || order.paymentStatus === "PAID") return;
    await tx.update(psOrders).set({ paymentStatus: "FAILED", updatedAt: new Date() }).where(eq(psOrders.id, order.id));
    await tx.insert(psOrderEvents).values({ orderId: order.id, status: "PENDING_PAYMENT", actor: "gateway", message: "Payment attempt failed." });
  });
}
