"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db/client";
import { auditLogs, branches, posSessions } from "@/db/schema";
import { branchCode } from "@/lib/utils";
import { requirePermission } from "@/modules/auth/authorization";
import { createBranchSchema, updateBranchSchema } from "@/modules/branches/schemas";

export async function createBranchAction(formData: FormData) {
  const access = await requirePermission("branch:manage");
  const parsed = createBranchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/branches/new?error=Please+check+the+branch+details.");
  const data = parsed.data;
  try {
    await db.transaction(async (tx) => {
      const [branch] = await tx.insert(branches).values({ businessId: access.business.id, name: data.name, code: branchCode(data.code), address: data.address || null, phone: data.phone || null, email: data.email || null, timezone: data.timezone }).returning({ id: branches.id });
      const requestHeaders = await headers();
      await tx.insert(auditLogs).values({ businessId: access.business.id, branchId: branch.id, userId: access.user.id, action: "branch.created", entityType: "branch", entityId: branch.id, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null, metadata: { name: data.name, code: branchCode(data.code) } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect("/branches/new?error=That+branch+code+is+already+in+use.");
    throw error;
  }
  revalidatePath("/branches");
  redirect("/branches");
}

export async function updateBranchAction(formData: FormData) {
  const access = await requirePermission("branch:manage");
  const parsed = updateBranchSchema.safeParse(Object.fromEntries(formData));
  const fallbackId = String(formData.get("branchId") || "");
  if (!parsed.success) redirect(`/branches/${fallbackId}/edit?error=Please+check+the+branch+details.`);
  const data = parsed.data;
  const [existing] = await db.select().from(branches).where(and(eq(branches.id, data.branchId), eq(branches.businessId, access.business.id))).limit(1);
  if (!existing) redirect("/branches");
  const active = data.active === "on";
  if (!active && existing.active) {
    const [[openSession], [anotherActive]] = await Promise.all([
      db.select({ id: posSessions.id }).from(posSessions).where(and(eq(posSessions.branchId, data.branchId), eq(posSessions.status, "OPEN"))).limit(1),
      db.select({ id: branches.id }).from(branches).where(and(eq(branches.businessId, access.business.id), eq(branches.active, true), ne(branches.id, data.branchId))).limit(1),
    ]);
    if (openSession) redirect(`/branches/${data.branchId}/edit?error=Close+all+open+POS+sessions+before+deactivation.`);
    if (!anotherActive) redirect(`/branches/${data.branchId}/edit?error=A+business+must+retain+at+least+one+active+branch.`);
  }
  try {
    await db.transaction(async (tx) => {
      await tx.update(branches).set({ name: data.name, code: branchCode(data.code), address: data.address || null, phone: data.phone || null, email: data.email || null, timezone: data.timezone, active, updatedAt: new Date() }).where(and(eq(branches.id, data.branchId), eq(branches.businessId, access.business.id)));
      await tx.insert(auditLogs).values({ businessId: access.business.id, branchId: data.branchId, userId: access.user.id, action: existing.active !== active ? (active ? "branch.activated" : "branch.deactivated") : "branch.updated", entityType: "branch", entityId: data.branchId, metadata: { oldCode: existing.code, newCode: branchCode(data.code), active } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect(`/branches/${data.branchId}/edit?error=That+branch+code+is+already+in+use.`);
    throw error;
  }
  revalidatePath("/branches");
  redirect("/branches");
}
