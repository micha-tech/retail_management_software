"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, branches, branchAssignments, businessMemberships, businesses, loginAttempts, users } from "@/db/schema";
import { normalizeEmail, branchCode } from "@/lib/utils";
import { databaseConstraint, databaseErrorCode, isDatabaseUnavailable } from "@/lib/database-errors";
import { hashPassword, verifyPassword } from "@/modules/auth/password";
import { createSession, deleteSession } from "@/modules/auth/session";
import { landingPageForAccess } from "@/modules/auth/permissions";
import { loginSchema, onboardingSchema, type ActionState } from "@/modules/auth/schemas";

function requestIp(requestHeaders: Headers) {
  const candidate = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip")?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

function wait(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

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
  const [membership] = await db.select({ role: businessMemberships.role, businessId: businessMemberships.businessId, permissions: businessMemberships.permissions }).from(businessMemberships).where(and(eq(businessMemberships.userId, user.id), eq(businessMemberships.active, true))).limit(1);
  if (!membership) return { error: "Your business access is inactive. Contact an administrator." };
  await db.insert(auditLogs).values({ businessId: membership.businessId, userId: user.id, action: "auth.login_succeeded", entityType: "user", entityId: user.id, ipAddress, metadata: {} });
  await createSession(user.id);
  if (user.mustChangePassword) redirect("/change-password");
  redirect(landingPageForAccess(membership.role, membership.permissions));
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

  const createWorkspace = () => db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ name: data.ownerName, email, passwordHash }).returning({ id: users.id });
      const [business] = await tx.insert(businesses).values({ name: data.businessName, currency: data.currency, timezone: data.timezone, email }).returning({ id: businesses.id });
      const [branch] = await tx.insert(branches).values({ businessId: business.id, name: data.branchName, code: branchCode(data.branchCode), address: data.address || null, timezone: data.timezone }).returning({ id: branches.id });
      await tx.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: "OWNER" });
      await tx.insert(branchAssignments).values({ businessId: business.id, branchId: branch.id, userId: user.id });
      await tx.insert(auditLogs).values({ businessId: business.id, branchId: branch.id, userId: user.id, action: "business.onboarded", entityType: "business", entityId: business.id, ipAddress, metadata: { firstBranchId: branch.id } });
      return user.id;
    });

  try {
    try {
      userId = await createWorkspace();
    } catch (error) {
      if (databaseErrorCode(error) !== "CONNECT_TIMEOUT") throw error;
      await wait(400);
      userId = await createWorkspace();
    }
  } catch (error) {
    const code = databaseErrorCode(error);
    const constraint = databaseConstraint(error);
    if (code === "23505" && constraint === "users_email_uq") return { error: "An account with this email already exists. Sign in instead." };
    console.error(JSON.stringify({ event: "onboarding_failed", code, constraint, message: error instanceof Error ? error.message : "Unknown error" }));
    if (isDatabaseUnavailable(error)) return { error: "The database is temporarily unavailable. Please wait a moment and try again." };
    return { error: "We could not create your business. Please try again." };
  }

  try {
    await createSession(userId);
  } catch (error) {
    console.error(JSON.stringify({ event: "onboarding_session_failed", code: databaseErrorCode(error), message: error instanceof Error ? error.message : "Unknown error" }));
    redirect("/login?created=1");
  }
  redirect("/overview");
}
