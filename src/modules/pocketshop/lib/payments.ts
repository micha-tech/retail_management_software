import { createHmac } from "node:crypto";
import { safeHexEqual } from "./security";

export function paystackWebhookSignature(rawBody: string, secret: string): string {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

export function isValidPaystackWebhook(rawBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!secret || !signature) return false;
  return safeHexEqual(paystackWebhookSignature(rawBody, secret), signature);
}

/** Paystack amounts for NGN are in kobo, matching our integer minor units. */
export function gatewayAmountMatches(paidMinorUnits: bigint | number | string, expectedMinorUnits: bigint): boolean {
  try {
    const paid = BigInt(paidMinorUnits);
    return paid > 0n && paid === expectedMinorUnits;
  } catch {
    return false;
  }
}
