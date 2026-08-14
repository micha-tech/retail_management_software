import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { updateBranchAction } from "@/modules/branches/actions";

export default async function EditBranchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("branch:manage");
  const { id } = await params;
  const [branch] = await db.select().from(branches).where(and(eq(branches.id, id), eq(branches.businessId, access.business.id))).limit(1);
  if (!branch) notFound();
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/branches"><ArrowLeft size={15}/> Branches</Link><h1>Edit branch</h1><p>Deactivate safely without deleting historical operations.</p></div></header><main className="page narrow"><section className="surface"><form action={updateBranchAction} className="form-stack"><input type="hidden" name="branchId" value={branch.id}/><div className="form-grid"><label>Branch name<input name="name" defaultValue={branch.name} required/></label><label>Unique code<input name="code" defaultValue={branch.code} required/></label><label>Timezone<input name="timezone" defaultValue={branch.timezone} required/></label><label>Phone<input name="phone" type="tel" defaultValue={branch.phone||""}/></label><label>Email<input name="email" type="email" defaultValue={branch.email||""}/></label></div><label>Address<textarea name="address" rows={3} defaultValue={branch.address||""}/></label><label className="check-row"><input name="active" type="checkbox" defaultChecked={branch.active}/> Active branch</label>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/branches">Cancel</Link><button className="button primary">Save branch</button></div></form></section></main></>;
}
