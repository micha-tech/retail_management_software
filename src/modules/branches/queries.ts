import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { branchAssignments, branches, type BusinessRole } from "@/db/schema";

export function listAccessibleBranches(input: { businessId: string; userId: string; role: BusinessRole }) {
  if (input.role === "OWNER" || input.role === "ADMIN") return db.select().from(branches).where(and(eq(branches.businessId, input.businessId), eq(branches.active, true))).orderBy(asc(branches.name));
  return db.select({ id: branches.id, businessId: branches.businessId, name: branches.name, code: branches.code, address: branches.address, phone: branches.phone, email: branches.email, timezone: branches.timezone, active: branches.active, createdAt: branches.createdAt, updatedAt: branches.updatedAt }).from(branchAssignments).innerJoin(branches, eq(branches.id, branchAssignments.branchId)).where(and(eq(branchAssignments.businessId, input.businessId), eq(branchAssignments.userId, input.userId), eq(branches.active, true))).orderBy(asc(branches.name));
}
