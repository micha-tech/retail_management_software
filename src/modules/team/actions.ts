"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { auditLogs, branches, branchAssignments, businessMemberships, users } from "@/db/schema";
import { normalizeEmail } from "@/lib/utils";
import { requirePermission } from "@/modules/auth/authorization";
import { effectivePermissions, hasPermission, type Permission } from "@/modules/auth/permissions";
import { hashPassword } from "@/modules/auth/password";
import { createStaffSchema, updateStaffSchema } from "@/modules/team/schemas";

export async function createStaffAction(formData: FormData) {
  const access = await requirePermission("team:manage");
  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    initialPassword: formData.get("initialPassword"),
    role: formData.get("role"),
    branchIds: formData.getAll("branchIds"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) redirect("/team/new?error=Please+check+the+staff+details+and+branch+assignments.");
  if (parsed.data.role === "ADMIN" && access.role !== "OWNER") redirect("/team/new?error=Only+an+owner+can+create+an+administrator.");
  const selectedPermissions = [...new Set(parsed.data.permissions)];
  if (!selectedPermissions.every((permission) => hasPermission(access.role, permission as Permission, access.permissions))) redirect("/team/new?error=You+cannot+grant+access+that+you+do+not+have.");

  const assignedBranches = parsed.data.branchIds.length === 0 ? [] : await db.select({ id: branches.id }).from(branches).where(and(eq(branches.businessId, access.business.id), eq(branches.active, true), inArray(branches.id, parsed.data.branchIds)));
  if (assignedBranches.length !== new Set(parsed.data.branchIds).size) redirect("/team/new?error=One+or+more+branch+assignments+are+invalid.");
  const passwordHash = await hashPassword(parsed.data.initialPassword);
  const requestHeaders = await headers();

  try {
    await db.transaction(async (tx) => {
      const [staff] = await tx.insert(users).values({ name: parsed.data.name, email: normalizeEmail(parsed.data.email), passwordHash, mustChangePassword: true }).returning({ id: users.id });
      await tx.insert(businessMemberships).values({ businessId: access.business.id, userId: staff.id, role: parsed.data.role, permissions: selectedPermissions });
      if (assignedBranches.length) await tx.insert(branchAssignments).values(assignedBranches.map((branch) => ({ businessId: access.business.id, branchId: branch.id, userId: staff.id })));
      await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: "user.created", entityType: "user", entityId: staff.id, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null, metadata: { role: parsed.data.role, permissions: selectedPermissions, branchIds: assignedBranches.map((branch) => branch.id) } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect("/team/new?error=A+user+with+that+email+already+exists.");
    throw error;
  }
  revalidatePath("/team");
  redirect("/team");
}

export async function updateStaffAction(formData: FormData) {
  const access = await requirePermission("team:manage");
  const parsed = updateStaffSchema.safeParse({ memberId: formData.get("memberId"), role: formData.get("role"), branchIds: formData.getAll("branchIds"), permissions: formData.getAll("permissions"), active: formData.get("active") === "on" });
  const fallbackId = String(formData.get("memberId") || "");
  if (!parsed.success) redirect(`/team/${fallbackId}/edit?error=Check+the+role+and+branch+assignments.`);
  const data = parsed.data;
  if (data.role === "ADMIN" && access.role !== "OWNER") redirect(`/team/${data.memberId}/edit?error=Only+an+owner+can+assign+administrator+access.`);
  const [membership] = await db.select().from(businessMemberships).where(and(eq(businessMemberships.businessId, access.business.id), eq(businessMemberships.userId, data.memberId))).limit(1);
  if (!membership || membership.role === "OWNER") redirect("/team");
  if (data.memberId === access.user.id) redirect(`/team/${data.memberId}/edit?error=Ask+another+administrator+to+change+your+own+access.`);
  if (membership.role === "ADMIN" && access.role !== "OWNER") redirect(`/team/${data.memberId}/edit?error=Only+an+owner+can+change+administrator+access.`);
  const selectedPermissions = [...new Set(data.permissions)];
  if (!selectedPermissions.every((permission) => hasPermission(access.role, permission as Permission, access.permissions))) redirect(`/team/${data.memberId}/edit?error=You+cannot+grant+access+that+you+do+not+have.`);
  const existingPermissions = effectivePermissions(membership.role, membership.permissions);
  const assignedBranches = data.branchIds.length ? await db.select({ id: branches.id }).from(branches).where(and(eq(branches.businessId, access.business.id), eq(branches.active, true), inArray(branches.id, data.branchIds))) : [];
  if (assignedBranches.length !== new Set(data.branchIds).size) redirect(`/team/${data.memberId}/edit?error=One+or+more+branch+assignments+are+invalid.`);
  await db.transaction(async (tx) => {
    await tx.update(businessMemberships).set({ role: data.role, permissions: selectedPermissions, active: data.active, updatedAt: new Date() }).where(and(eq(businessMemberships.businessId, access.business.id), eq(businessMemberships.userId, data.memberId)));
    await tx.delete(branchAssignments).where(and(eq(branchAssignments.businessId, access.business.id), eq(branchAssignments.userId, data.memberId)));
    if (assignedBranches.length) await tx.insert(branchAssignments).values(assignedBranches.map((branch) => ({ businessId: access.business.id, branchId: branch.id, userId: data.memberId })));
    await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: membership.role !== data.role ? "user.role_changed" : data.active ? "user.access_updated" : "user.deactivated", entityType: "user", entityId: data.memberId, metadata: { oldRole: membership.role, newRole: data.role, oldPermissions: existingPermissions, newPermissions: selectedPermissions, active: data.active, branchIds: assignedBranches.map((branch) => branch.id) } });
  });
  revalidatePath("/team");
  redirect("/team");
}
