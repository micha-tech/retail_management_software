import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { createStaffAction } from "@/modules/team/actions";

export default async function NewStaffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("team:manage");
  const records = await db.select({ id: branches.id, name: branches.name, active: branches.active }).from(branches).where(eq(branches.businessId, access.business.id)).orderBy(asc(branches.name));
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/team"><ArrowLeft size={15}/> Team</Link><h1>Create staff account</h1><p>The staff member must replace the initial password at first sign-in.</p></div></header><main className="page narrow"><section className="surface"><form action={createStaffAction} className="form-stack"><div className="form-grid"><label>Full name<input name="name" autoComplete="name" required /></label><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Initial password<input name="initialPassword" type="password" minLength={12} required /></label><label>Role<select name="role" defaultValue="CASHIER"><option value="CASHIER">Cashier</option><option value="STOREKEEPER">Storekeeper</option><option value="BRANCH_MANAGER">Branch manager</option>{access.role === "OWNER" && <option value="ADMIN">Administrator</option>}</select></label></div><fieldset><legend>Branch assignments</legend><div className="checkbox-list">{records.filter((branch) => branch.active).map((branch) => <label key={branch.id}><input type="checkbox" name="branchIds" value={branch.id}/><span>{branch.name}</span></label>)}</div><small>Required for branch manager, cashier, and storekeeper roles.</small></fieldset>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/team">Cancel</Link><button className="button primary">Create account</button></div></form></section></main></>;
}
