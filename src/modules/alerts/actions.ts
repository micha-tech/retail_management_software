"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { auditLogs, operationalAlerts } from "@/db/schema";
import { requireBranchAccess } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";
import { withToast } from "@/lib/toast";

export async function updateOperationalAlertAction(formData: FormData) {
  const parsed = z.object({ alertId: z.uuid(), branchId: z.uuid(), status: z.enum(["ACKNOWLEDGED", "IN_REVIEW", "RESOLVED", "DISMISSED"]) }).parse(Object.fromEntries(formData));
  const access = await requireBranchAccess(parsed.branchId);
  if (!hasPermission(access.role, "inventory:manage", access.permissions) || !["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(access.role)) redirect("/alerts");
  const [alert] = await db.select().from(operationalAlerts).where(and(eq(operationalAlerts.id, parsed.alertId), eq(operationalAlerts.businessId, access.business.id), eq(operationalAlerts.branchId, parsed.branchId))).limit(1);
  if (!alert || ["RESOLVED", "DISMISSED"].includes(alert.status)) redirect("/alerts");
  const now = new Date();
  const changes = parsed.status === "ACKNOWLEDGED" ? { status: parsed.status, acknowledgedBy: access.user.id, acknowledgedAt: now, updatedAt: now } : parsed.status === "RESOLVED" ? { status: parsed.status, resolvedBy: access.user.id, resolvedAt: now, updatedAt: now } : parsed.status === "DISMISSED" ? { status: parsed.status, dismissedBy: access.user.id, dismissedAt: now, updatedAt: now } : { status: parsed.status, updatedAt: now };
  await db.transaction(async (tx) => { await tx.update(operationalAlerts).set(changes).where(eq(operationalAlerts.id, alert.id)); await tx.insert(auditLogs).values({ businessId: access.business.id, branchId: parsed.branchId, userId: access.user.id, action: "operational_alert.status_updated", entityType: "operational_alert", entityId: alert.id, metadata: { from: alert.status, to: parsed.status, sourceType: alert.type, sourceEntityId: alert.entityId } }); });
  revalidatePath("/alerts");
  redirect(withToast("/alerts", "Alert status updated."));
}
