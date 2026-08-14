import { asc, eq } from "drizzle-orm";
import { MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { branches } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";
import { listAccessibleBranches } from "@/modules/branches/queries";

export default async function BranchesPage() {
  const access = await requirePermission("branch:read");
  const records = access.role === "OWNER" || access.role === "ADMIN" ? await db.select().from(branches).where(eq(branches.businessId, access.business.id)).orderBy(asc(branches.name)) : await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  return <><header className="topbar"><div><p className="eyebrow">Configuration</p><h1>Branches</h1><p>Operational locations in {access.business.name}.</p></div>{hasPermission(access.role, "branch:manage") && <Link className="button primary inline-button" href="/branches/new"><Plus size={17}/> New branch</Link>}</header><main className="page"><section className="surface table-surface"><table><thead><tr><th>Branch</th><th>Code</th><th>Timezone</th><th>Contact</th><th>Status</th></tr></thead><tbody>{records.map((branch) => <tr key={branch.id}><td>{hasPermission(access.role,"branch:manage")?<Link href={`/branches/${branch.id}/edit`}><strong>{branch.name}</strong></Link>:<strong>{branch.name}</strong>}<small><MapPin size={13}/>{branch.address || "No address provided"}</small></td><td><code>{branch.code}</code></td><td>{branch.timezone}</td><td>{branch.email || branch.phone || "—"}</td><td><span className={branch.active ? "pill active" : "pill"}>{branch.active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></section></main></>;
}
