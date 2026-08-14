import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { createStaffAction } from "@/modules/team/actions";
import { StaffAccessFields } from "@/components/team/staff-access-fields";
import { defaultPermissionsForRole } from "@/modules/auth/permissions";

export default async function NewStaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("team:manage");
  const records = await db.select({ id: branches.id, name: branches.name, active: branches.active }).from(branches).where(eq(branches.businessId, access.business.id)).orderBy(asc(branches.name));
  const { error } = await searchParams;
  const roles = [{ value: "CASHIER" as const, label: "Cashier" }, { value: "STOREKEEPER" as const, label: "Inventory manager" }, { value: "BRANCH_MANAGER" as const, label: "Branch manager" }, ...(access.role === "OWNER" ? [{ value: "ADMIN" as const, label: "Administrator" }] : [])];
  return <><header className="topbar"><div><Link className="back-link" href="/team"><ArrowLeft size={15}/> Team</Link><h1>Create staff account</h1><p>Create login credentials, choose a role, and grant only the features this employee needs.</p></div></header><main className="page narrow"><section className="surface"><form action={createStaffAction} className="form-stack"><div className="form-grid"><label>Full name<input name="name" autoComplete="name" required /></label><label>Login email<input name="email" type="email" autoComplete="email" required /></label><label>Initial login password<input name="initialPassword" type="password" minLength={12} autoComplete="new-password" required /><small>The employee must replace this password at first sign-in.</small></label></div><StaffAccessFields branches={records.filter((branch) => branch.active)} roles={roles} initialRole="CASHIER" initialPermissions={defaultPermissionsForRole("CASHIER")}/>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/team">Cancel</Link><button className="button primary">Create employee</button></div></form></section></main></>;
}
