"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import { auditLogs, businesses } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";

const settingsSchema = z.object({ name: z.string().trim().min(2).max(160), timezone: z.string().trim().min(1).max(100), phone: z.string().trim().max(40).optional(), email: z.union([z.literal(""),z.email().max(254)]).optional() });

export async function updateBusinessAction(formData: FormData) {
  const access = await requirePermission("business:manage");
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings?error=Please+check+the+business+details.");
  await db.transaction(async (tx) => {
    await tx.update(businesses).set({ name: parsed.data.name, timezone: parsed.data.timezone, phone: parsed.data.phone || null, email: parsed.data.email || null, updatedAt: new Date() }).where(and(eq(businesses.id, access.business.id), eq(businesses.active, true)));
    await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: "business.settings_updated", entityType: "business", entityId: access.business.id, metadata: { oldTimezone: access.business.timezone, newTimezone: parsed.data.timezone } });
  });
  revalidatePath("/settings");
  revalidatePath("/overview");
  redirect("/settings?saved=1");
}
