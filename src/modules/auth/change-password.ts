"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, sessions, users } from "@/db/schema";
import { requireBusinessAccess } from "@/modules/auth/authorization";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { passwordSchema } from "@/modules/auth/schemas";
import { createSession } from "@/modules/auth/session";
import { landingPageForAccess } from "@/modules/auth/permissions";
import { isPlatformAdminEmail } from "@/modules/platform/authorization";

export async function changePasswordAction(formData: FormData) {
  const access = await requireBusinessAccess();
  const currentPassword = formData.get("currentPassword");
  const parsed = passwordSchema.safeParse(formData.get("newPassword"));
  if (typeof currentPassword !== "string" || !parsed.success) redirect("/change-password?error=Check+the+password+requirements+and+try+again.");
  const [credential] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, access.user.id)).limit(1);
  if (!credential || !await verifyPassword(credential.passwordHash, currentPassword)) redirect("/change-password?error=Your+current+password+is+incorrect.");
  if (await verifyPassword(credential.passwordHash, parsed.data)) redirect("/change-password?error=Choose+a+password+you+have+not+already+used.");
  const passwordHash = await hashPassword(parsed.data);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, access.user.id));
    await tx.delete(sessions).where(eq(sessions.userId, access.user.id));
    await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: "user.password_changed", entityType: "user", entityId: access.user.id, metadata: {} });
  });
  await createSession(access.user.id);
  if (isPlatformAdminEmail(access.user.email)) redirect("/platform");
  redirect(landingPageForAccess(access.role, access.permissions));
}
