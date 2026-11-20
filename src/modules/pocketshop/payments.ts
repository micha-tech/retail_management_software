import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { psOrders, psPayments } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { gatewayAmountMatches, isValidPaystackWebhook } from "./lib/payments";
import { hashToken } from "./lib/security";

const PAYSTACK_API = "https://api.paystack.co";

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

type GatewayInitResult = { provider: "PAYSTACK"; reference: string; authorizationUrl: string };

/** Isolated gateway boundary. No credential means no card/USSD method is offered. */
export async function initializeGatewayPayment(input: { orderId: string; reference: string; amount: bigint; email: string; currency: string; callbackUrl?: string }): Promise<GatewayInitResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) throw new ApplicationError("Online payments are not configured for this store.", "PAYMENT_GATEWAY_UNAVAILABLE", 503);
  const gatewayReference = `PS-${input.reference}-${Date.now().toString(36).toUpperCase()}`;
  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email || "customer@pocketshop.local",
      amount: input.amount.toString(),
      currency: input.currency,
      reference: gatewayReference,
      callback_url: input.callbackUrl || process.env.PAYSTACK_CALLBACK_URL || undefined,
      metadata: { orderReference: input.reference },
    }),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  const body = payload as { status?: boolean; data?: { authorization_url?: string; reference?: string }; message?: string } | null;
  if (!response.ok || !body?.status || !body.data?.authorization_url || !body.data.reference) {
    throw new ApplicationError(body?.message || "Payment could not be initialized.", "PAYMENT_INIT_FAILED", 502);
  }
  await db.insert(psPayments).values({
    orderId: input.orderId, storeId: (await db.select({ storeId: psOrders.storeId }).from(psOrders).where(eq(psOrders.id, input.orderId)).limit(1))[0].storeId,
    provider: "PAYSTACK", method: "CARD", providerReference: body.data.reference,
    amount: input.amount, currency: input.currency, status: "PENDING", metadata: { orderReference: input.reference },
  });
  return { provider: "PAYSTACK", reference: body.data.reference, authorizationUrl: body.data.authorization_url };
}

export async function verifyGatewayPayment(reference: string): Promise<{ verified: boolean; paid: boolean; amount: bigint | null }> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret || !/^[A-Za-z0-9_-]{8,100}$/.test(reference)) return { verified: false, paid: false, amount: null };
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12_000), cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  const body = payload as { status?: boolean; data?: { status?: string; amount?: number; reference?: string } } | null;
  if (!response.ok || !body?.status || !body.data || body.data.reference !== reference) return { verified: false, paid: false, amount: null };
  const amount = typeof body.data.amount === "number" && Number.isSafeInteger(body.data.amount) && body.data.amount > 0 ? BigInt(body.data.amount) : null;
  return { verified: true, paid: body.data.status === "success", amount };
}

export type WebhookEvent = { event?: string; data?: { reference?: string; amount?: number; status?: string; metadata?: { orderReference?: string } } };

export function parseGatewayWebhook(rawBody: string, signature: string | null): WebhookEvent | null {
  if (!isValidPaystackWebhook(rawBody, signature, process.env.PAYSTACK_WEBHOOK_SECRET?.trim())) return null;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    return parsed && typeof parsed === "object" ? parsed as WebhookEvent : null;
  } catch { return null; }
}

/** Confirms an order only from a trusted gateway event or server-side verification. */
export async function confirmGatewayPayment(input: { reference: string; amount: bigint; markPaid: (reference: string) => Promise<void> }) {
  const [payment] = await db.select().from(psPayments).where(and(eq(psPayments.provider, "PAYSTACK"), eq(psPayments.providerReference, input.reference))).limit(1);
  if (!payment || payment.status === "PAID") return { processed: false, reason: payment?.status === "PAID" ? "already_processed" : "unknown_reference" };
  if (!gatewayAmountMatches(input.amount, payment.amount)) return { processed: false, reason: "amount_mismatch" };
  await input.markPaid(input.reference);
  return { processed: true, reason: "confirmed" };
}

export { hashToken };
