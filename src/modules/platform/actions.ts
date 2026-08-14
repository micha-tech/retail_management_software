"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { businesses, businessSubscriptions, subscriptionEvents } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { requirePlatformAdmin } from "@/modules/platform/authorization";
import { subscriptionUpdateSchema } from "@/modules/platform/schemas";

function optionalDate(value: string) { return value ? new Date(value) : null; }
function optionalText(value: string) { return value || null; }
function optionalNumber(value: string | number) { return value === "" ? null : Number(value); }
function snapshot(record: typeof businessSubscriptions.$inferSelect | undefined) {
  if (!record) return {};
  return { ...record, amount: record.amount.toString(), trialEndsAt: record.trialEndsAt?.toISOString() ?? null, currentPeriodStartsAt: record.currentPeriodStartsAt?.toISOString() ?? null, currentPeriodEndsAt: record.currentPeriodEndsAt?.toISOString() ?? null, gracePeriodEndsAt: record.gracePeriodEndsAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

export async function updateSubscriptionAction(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const parsed = subscriptionUpdateSchema.safeParse(Object.fromEntries(formData));
  const fallback = String(formData.get("businessId") || "");
  if (!parsed.success) redirect(`/platform/companies/${fallback}?error=Check+the+subscription+details.`);
  const data = parsed.data;
  const [business] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, data.businessId)).limit(1);
  if (!business) redirect("/platform");
  const [existing] = await db.select().from(businessSubscriptions).where(eq(businessSubscriptions.businessId, data.businessId)).limit(1);
  const values = {
    planCode: data.planCode,
    status: data.status,
    billingInterval: data.billingInterval,
    amount: parseMoney(data.amount),
    currency: data.currency,
    trialEndsAt: optionalDate(data.trialEndsAt),
    currentPeriodStartsAt: optionalDate(data.currentPeriodStartsAt),
    currentPeriodEndsAt: optionalDate(data.currentPeriodEndsAt),
    gracePeriodEndsAt: optionalDate(data.gracePeriodEndsAt),
    branchLimit: optionalNumber(data.branchLimit),
    employeeLimit: optionalNumber(data.employeeLimit),
    provider: optionalText(data.provider),
    providerCustomerId: optionalText(data.providerCustomerId),
    providerSubscriptionId: optionalText(data.providerSubscriptionId),
    notes: optionalText(data.notes),
    updatedBy: actor.id,
    updatedAt: new Date(),
  };
  await db.transaction(async (tx) => {
    const [updated] = await tx.insert(businessSubscriptions).values({ businessId: data.businessId, ...values }).onConflictDoUpdate({ target: businessSubscriptions.businessId, set: values }).returning();
    await tx.insert(subscriptionEvents).values({ businessId: data.businessId, actorUserId: actor.id, action: existing?.status !== updated.status ? `subscription.status_${updated.status.toLowerCase()}` : "subscription.updated", previousState: snapshot(existing), nextState: snapshot(updated) });
  });
  revalidatePath("/platform");
  revalidatePath(`/platform/companies/${data.businessId}`);
  redirect(`/platform/companies/${data.businessId}?saved=1`);
}
