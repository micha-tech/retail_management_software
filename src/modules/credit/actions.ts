"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { auditLogs, creditCustomers, creditEntries, paymentBanks } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { withToast } from "@/lib/toast";
import { requireBranchAccess, requirePermission } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.literal(""), z.email().max(254)]),
  address: z.string().trim().max(300),
  notes: z.string().trim().max(500),
});

export async function createCreditCustomerAction(formData: FormData) {
  const access = await requirePermission("credit:manage");
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) redirect("/credit?error=Enter+a+valid+name+and+phone+number.");
  try {
    const [customer] = await db.insert(creditCustomers).values({
      businessId: access.business.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
    }).returning({ id: creditCustomers.id });
    await db.insert(auditLogs).values({
      businessId: access.business.id,
      userId: access.user.id,
      action: "credit_customer.created",
      entityType: "credit_customer",
      entityId: customer.id,
      metadata: { name: parsed.data.name, phone: parsed.data.phone },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect("/credit?error=A+credit+customer+with+that+phone+number+already+exists.");
    throw error;
  }
  redirect(withToast("/credit", "Credit customer created."));
}

const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "OTHER"] as const;

export async function recordCreditPaymentAction(formData: FormData) {
  const customerId = z.uuid().parse(formData.get("customerId"));
  const branchId = z.uuid().parse(formData.get("branchId"));
  const access = await requireBranchAccess(branchId);
  if (!hasPermission(access.role, "credit:manage", access.permissions)) redirect("/overview");

  const method = z.enum(paymentMethods).parse(formData.get("paymentMethod"));
  const rawBankId = String(formData.get("paymentBankId") || "");
  if (method === "BANK_TRANSFER" && !z.uuid().safeParse(rawBankId).success) redirect(`/credit/${customerId}?error=Select+a+payment+bank+for+the+transfer.`);
  let amount: bigint;
  try { amount = parseMoney(String(formData.get("amount") || "0")); }
  catch { redirect(`/credit/${customerId}?error=Enter+a+valid+payment+amount.`); }
  if (amount <= 0n) redirect(`/credit/${customerId}?error=Enter+a+positive+payment+amount.`);

  const paymentBankId = method === "BANK_TRANSFER" ? rawBankId : null;
  const reference = z.string().trim().max(200).parse(String(formData.get("reference") || ""));
  const notes = z.string().trim().max(500).parse(String(formData.get("notes") || ""));

  try {
    await db.transaction(async (tx) => {
      const locked = await tx.execute<{ id: string }>(sql`select id from credit_customers where id=${customerId} and business_id=${access.business.id} and active=true for update`);
      if (!locked[0]) throw new Error("INVALID_CUSTOMER");
      if (paymentBankId) {
        const [bank] = await tx.select({ id: paymentBanks.id }).from(paymentBanks).where(and(eq(paymentBanks.id, paymentBankId), eq(paymentBanks.businessId, access.business.id), eq(paymentBanks.active, true))).limit(1);
        if (!bank) throw new Error("INVALID_BANK");
      }
      const [balanceRow] = await tx.execute<{ balance: string }>(sql`select coalesce(sum(case when type in ('SALE','ADJUSTMENT_IN') then amount else -amount end),0)::text balance from credit_entries where business_id=${access.business.id} and customer_id=${customerId}`);
      const balance = BigInt(balanceRow?.balance ?? 0);
      if (amount > balance) throw new Error("OVERPAYMENT");
      const [entry] = await tx.insert(creditEntries).values({
        businessId: access.business.id,
        branchId,
        customerId,
        type: "PAYMENT",
        amount,
        paymentMethod: method,
        paymentBankId,
        reference: reference || null,
        notes: notes || null,
        recordedBy: access.user.id,
      }).returning({ id: creditEntries.id });
      await tx.insert(auditLogs).values({
        businessId: access.business.id,
        branchId,
        userId: access.user.id,
        action: "credit.payment_recorded",
        entityType: "credit_entry",
        entityId: entry.id,
        metadata: { customerId, amount: amount.toString(), paymentMethod: method, reference },
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "OVERPAYMENT") redirect(`/credit/${customerId}?error=Payment+cannot+exceed+the+outstanding+balance.`);
    if (code === "INVALID_CUSTOMER") redirect("/credit?error=Credit+customer+not+found.");
    if (code === "INVALID_BANK") redirect(`/credit/${customerId}?error=Select+a+valid+payment+bank.`);
    throw error;
  }
  redirect(withToast(`/credit/${customerId}`, "Credit payment recorded."));
}
