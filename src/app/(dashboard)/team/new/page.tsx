import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StaffAccessFields } from "@/components/team/staff-access-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { defaultPermissionsForRole } from "@/modules/auth/permissions";
import { createStaffAction } from "@/modules/team/actions";

export default async function NewStaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("team:manage");
  const records = await db.select({ id: branches.id, name: branches.name, active: branches.active }).from(branches).where(eq(branches.businessId, access.business.id)).orderBy(asc(branches.name));
  const activeBranches = records.filter((branch) => branch.active);
  const { error } = await searchParams;
  const roles = [{ value: "CASHIER" as const, label: "Cashier" }, { value: "STOREKEEPER" as const, label: "Inventory manager" }, { value: "BRANCH_MANAGER" as const, label: "Branch manager" }, ...(access.role === "OWNER" ? [{ value: "ADMIN" as const, label: "Administrator" }] : [])];

  return <>
    <header className="topbar"><div><Link className="back-link" href="/team"><ArrowLeft size={15}/> Team</Link><h1>Create staff account</h1><p>Create login credentials, choose a role, and grant only the features this employee needs.</p></div></header>
    <main className="page narrow"><section className="surface"><form action={createStaffAction} className="form-stack">
      <div className="form-grid">
        <label>Full name<input name="name" autoComplete="name" required /></label>
        <label>Login email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Initial login password<input name="initialPassword" type="password" minLength={12} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}" title="Use 12 or more characters with an uppercase letter, a lowercase letter, and a number." autoComplete="new-password" required /><small>Use 12+ characters with uppercase, lowercase, and a number. The employee must replace it at first sign-in.</small></label>
      </div>
      <StaffAccessFields branches={activeBranches} roles={roles} initialRole="CASHIER" initialPermissions={defaultPermissionsForRole("CASHIER")} initialBranchIds={activeBranches.length === 1 ? [activeBranches[0].id] : []}/>
      {error && <p className="form-error" role="alert" aria-live="polite">{error}</p>}
      <div className="form-actions"><Link className="button secondary inline-button" href="/team">Cancel</Link><SubmitButton pendingLabel="Creating employee…">Create employee</SubmitButton></div>
    </form></section></main>
  </>;
}
