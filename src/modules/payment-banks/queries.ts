import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { paymentBanks } from "@/db/schema";

export function listPaymentBanks(businessId: string) {
  return db.select().from(paymentBanks).where(eq(paymentBanks.businessId, businessId)).orderBy(asc(paymentBanks.bankName), asc(paymentBanks.accountName));
}

export function listActivePaymentBanks(businessId: string) {
  return db.select().from(paymentBanks).where(and(eq(paymentBanks.businessId, businessId), eq(paymentBanks.active, true))).orderBy(asc(paymentBanks.bankName), asc(paymentBanks.accountName));
}