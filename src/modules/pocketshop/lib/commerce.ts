import { randomBytes, randomUUID } from "node:crypto";

export const RESERVATION_WINDOW_MS = 30 * 60 * 1000;

export type PricedLine = { quantity: number; unitPrice: bigint };

/** All totals are computed from trusted server-side prices, in minor units. */
export function calculateCartTotals(lines: PricedLine[], deliveryFee = 0n, discount = 0n, depositPercent = 0) {
  if (deliveryFee < 0n || discount < 0n || depositPercent < 0 || depositPercent > 100) {
    throw new Error("Invalid totals input.");
  }
  let subtotal = 0n;
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 999 || line.unitPrice < 0n) {
      throw new Error("Invalid cart line.");
    }
    subtotal += line.unitPrice * BigInt(line.quantity);
  }
  if (discount > subtotal) throw new Error("Discount exceeds subtotal.");
  const total = subtotal + deliveryFee - discount;
  const depositAmount = (total * BigInt(depositPercent) + 99n) / 100n;
  return { subtotal, total, depositAmount };
}

export function createOrderReference(): string {
  return `PS-${randomBytes(3).toString("hex").toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function reservationDeadline(now = new Date()): Date {
  return new Date(now.getTime() + RESERVATION_WINDOW_MS);
}

export type FulfilmentStatus =
  | "PENDING_PAYMENT" | "CONFIRMED" | "PROCESSING" | "READY_FOR_PICKUP" | "DISPATCHED"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED" | "FAILED_DELIVERY" | "REFUNDED";

export const FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY_FOR_PICKUP", "DISPATCHED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  DISPATCHED: ["OUT_FOR_DELIVERY", "FAILED_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY"],
  DELIVERED: ["REFUNDED"],
  FAILED_DELIVERY: ["CANCELLED", "DISPATCHED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: FulfilmentStatus, to: FulfilmentStatus): boolean {
  return from !== to && FULFILMENT_TRANSITIONS[from].includes(to);
}

/** Expired reservations are released only after the full window has elapsed. */
export function isReservationExpired(reservedUntil: Date, now = new Date()): boolean {
  return reservedUntil.getTime() <= now.getTime();
}
