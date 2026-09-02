"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, paymentBanks } from "@/db/schema";
import { withToast } from "@/lib/toast";
import { requirePermission } from "@/modules/auth/authorization";
import { paymentBankSchema } from "@/modules/payment-banks/schemas";

export async function createPaymentBankAction(formData: FormData) {
  const access = await requirePermission("business:manage");
  const parsed = paymentBankSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings?error=" + encodeURIComponent(parsed.error.issues[0]?.message || "Please check the payment bank details."));
  const data = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const [bank] = await tx.insert(paymentBanks).values({ businessId: access.business.id, ...data }).returning({ id: paymentBanks.id });
      const requestHeaders = await headers();
      await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: "payment_bank.created", entityType: "payment_bank", entityId: bank.id, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null, metadata: { bankName: data.bankName, accountNumber: data.accountNumber } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect("/settings?error=That+account+number+is+already+in+use.");
    throw error;
  }
  revalidatePath("/settings");
  redirect(withToast("/settings#payment-banks", "Payment bank added."));
}

export async function togglePaymentBankAction(formData: FormData) {
  const access = await requirePermission("business:manage");
  const bankId = String(formData.get("bankId") || "");
  const [existing] = await db.select().from(paymentBanks).where(and(eq(paymentBanks.id, bankId), eq(paymentBanks.businessId, access.business.id))).limit(1);
  if (!existing) redirect("/settings");
  await db.update(paymentBanks).set({ active: !existing.active, updatedAt: new Date() }).where(eq(paymentBanks.id, bankId));
  await db.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: existing.active ? "payment_bank.deactivated" : "payment_bank.activated", entityType: "payment_bank", entityId: bankId, metadata: { bankName: existing.bankName } });
  revalidatePath("/settings");
  redirect(withToast("/settings#payment-banks", existing.active ? "Payment bank deactivated." : "Payment bank activated."));
}