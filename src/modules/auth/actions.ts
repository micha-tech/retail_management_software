"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, branches, branchAssignments, businessMemberships, businesses, loginAttempts, users } from "@/db/schema";
import { normalizeEmail, branchCode } from "@/lib/utils";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { createSession, deleteSession } from "@/modules/auth/session";
import { landingPageForRole } from "@/modules/auth/permissions";
import { loginSchema, onboardingSchema, type ActionState } from "@/modules/auth/schemas";

function requestIp(requestHeaders: Headers) {
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const email = normalizeEmail(parsed.data.email);
  const ipAddress = requestIp(await headers());
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const [recent] = await db.select({ value: count() }).from(loginAttempts).where(and(eq(loginAttempts.email, email), eq(loginAttempts.successful, false), gte(loginAttempts.createdAt, windowStart)));
  if ((recent?.value ?? 0) >= 8) return { error: "Too many sign-in attempts. Try again in 15 minutes." };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const dummyHash = "$argon2id$v=19$m=19456,p=1,t=2$TQ2U0JJ9gAJOsHTztVeO9A$S6c4xYYHAdzim4/FI5pIFVtWXLYssQgBOXMHhsPo5y0";
  const passwordMatches = await verifyPassword(user?.passwordHash ?? dummyHash, parsed.data.password);
  const valid = Boolean(user?.active && passwordMatches);
  await db.insert(loginAttempts).values({ email, ipAddress, successful: valid });
  if (!valid || !user) return { error: "Email or password is incorrect." };

  await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
  const [membership] = await db.select({ role: businessMemberships.role, businessId: businessMemberships.businessId }).from(businessMemberships).where(and(eq(businessMemberships.userId, user.id), eq(businessMemberships.active, true))).limit(1);
  if (!membership) return { error: "Your business access is inactive. Contact an administrator." };
  await db.insert(auditLogs).values({ businessId: membership.businessId, userId: user.id, action: "auth.login_succeeded", entityType: "user", entityId: user.id, ipAddress, metadata: {} });
  await createSession(user.id);
  if (user.mustChangePassword) redirect("/change-password");
  redirect(landingPageForRole(membership.role));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function onboardAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const passwordHash = await hashPassword(data.password);
  const ipAddress = requestIp(await headers());
  let userId: string;

  try {
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ name: data.ownerName, email, passwordHash }).returning({ id: users.id });
      const [business] = await tx.insert(businesses).values({ name: data.businessName, currency: data.currency, timezone: data.timezone, email }).returning({ id: businesses.id });
      const [branch] = await tx.insert(branches).values({ businessId: business.id, name: data.branchName, code: branchCode(data.branchCode), address: data.address || null, timezone: data.timezone }).returning({ id: branches.id });
      await tx.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: "OWNER" });
      await tx.insert(branchAssignments).values({ businessId: business.id, branchId: branch.id, userId: user.id });
      await tx.insert(auditLogs).values({ businessId: business.id, branchId: branch.id, userId: user.id, action: "business.onboarded", entityType: "business", entityId: business.id, ipAddress, metadata: { firstBranchId: branch.id } });
      return user.id;
    });
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "23505") return { error: "An account with this email already exists." };
    console.error(JSON.stringify({ event: "onboarding_failed", message: error instanceof Error ? error.message : "Unknown error" }));
    return { error: "We could not create your business. Please try again." };
  }

  await createSession(userId);
  redirect("/overview");
}
