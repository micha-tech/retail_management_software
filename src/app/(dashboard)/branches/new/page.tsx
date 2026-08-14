import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { requirePermission } from "@/modules/auth/authorization";
import { createBranchAction } from "@/modules/branches/actions";

export default async function NewBranchPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { business } = await requirePermission("branch:manage");
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/branches"><ArrowLeft size={15}/> Branches</Link><h1>Create branch</h1><p>Add an operational location to {business.name}.</p></div></header><main className="page narrow"><section className="surface"><form action={createBranchAction} className="form-stack"><div className="form-grid"><label>Branch name<input name="name" placeholder="Lekki" required /></label><label>Unique code<input name="code" placeholder="LEK" required /></label><label>Timezone<input name="timezone" defaultValue={business.timezone} required /></label><label>Phone<input name="phone" type="tel" /></label><label>Email<input name="email" type="email" /></label></div><label>Address<textarea name="address" rows={3}/></label>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/branches">Cancel</Link><button className="button primary">Create branch</button></div></form></section></main></>;
}
