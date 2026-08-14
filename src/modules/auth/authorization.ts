import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { branchAssignments, branches, businessMemberships, businessSubscriptions, businesses, users, type BusinessRole } from "@/db/schema";
import { AuthorizationError } from "@/lib/errors";
import { getSessionRecord } from "@/modules/auth/session";
import { hasPermission, type Permission } from "@/modules/auth/permissions";

export async function requireAuthenticatedUser() {
  const session = await getSessionRecord();
  if (!session) redirect("/login");
  const [user] = await db.select({ id: users.id, name: users.name, email: users.email, mustChangePassword: users.mustChangePassword }).from(users).where(and(eq(users.id, session.userId), eq(users.active, true))).limit(1);
  if (!user) redirect("/login");
  return user;
}

export async function requireBusinessAccess(businessId?: string) {
  const user = await requireAuthenticatedUser();
  const conditions = [eq(businessMemberships.userId, user.id), eq(businessMemberships.active, true), eq(businesses.active, true)];
  if (businessId) conditions.push(eq(businessMemberships.businessId, businessId));
  const [access] = await db.select({ business: businesses, role: businessMemberships.role, permissions: businessMemberships.permissions, subscription: businessSubscriptions }).from(businessMemberships).innerJoin(businesses, eq(businesses.id, businessMemberships.businessId)).leftJoin(businessSubscriptions, eq(businessSubscriptions.businessId, businesses.id)).where(and(...conditions)).limit(1);
  if (!access) throw new AuthorizationError("You do not have access to this business.");
  if (access.subscription && ["SUSPENDED", "CANCELED"].includes(access.subscription.status)) redirect(`/subscription-status?business=${access.business.id}`);
  return { user, ...access };
}

export async function requireRole(allowed: BusinessRole[], businessId?: string) {
  const access = await requireBusinessAccess(businessId);
  if (!allowed.includes(access.role)) throw new AuthorizationError();
  return access;
}

export async function requirePermission(permission: Permission, businessId?: string) {
  const access = await requireBusinessAccess(businessId);
  if (!hasPermission(access.role, permission, access.permissions)) throw new AuthorizationError();
  return access;
}

export async function requireBranchAccess(branchId: string) {
  const access = await requireBusinessAccess();
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, branchId), eq(branches.businessId, access.business.id), eq(branches.active, true))).limit(1);
  if (!branch) throw new AuthorizationError("You do not have access to this branch.");
  if (access.role === "OWNER" || access.role === "ADMIN") return { ...access, branch };
  const [assignment] = await db.select({ branchId: branchAssignments.branchId }).from(branchAssignments).where(and(eq(branchAssignments.branchId, branchId), eq(branchAssignments.businessId, access.business.id), eq(branchAssignments.userId, access.user.id))).limit(1);
  if (!assignment) throw new AuthorizationError("You do not have access to this branch.");
  return { ...access, branch };
}
