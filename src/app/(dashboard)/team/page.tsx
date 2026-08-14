import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { businessMemberships, users } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";

export default async function TeamPage() {
  const access = await requirePermission("team:manage");
  const members = await db.select({ id: users.id, name: users.name, email: users.email, userActive: users.active, membershipActive: businessMemberships.active, role: businessMemberships.role }).from(businessMemberships).innerJoin(users, eq(users.id, businessMemberships.userId)).where(eq(businessMemberships.businessId, access.business.id)).orderBy(asc(users.name));
  return <><header className="topbar"><div><p className="eyebrow">Access control</p><h1>Team</h1><p>Staff accounts and business roles.</p></div><Link className="button primary inline-button" href="/team/new"><Plus size={17}/> New staff member</Link></header><main className="page"><section className="surface table-surface"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{members.map((member) => {const active=member.userActive&&member.membershipActive;return <tr key={member.id}><td>{member.role!=="OWNER"?<Link href={`/team/${member.id}/edit`}><strong>{member.name}</strong></Link>:<strong>{member.name}</strong>}</td><td>{member.email}</td><td>{member.role.replaceAll("_", " ")}</td><td><span className={active ? "pill active" : "pill"}>{active ? "Active" : "Inactive"}</span></td></tr>;})}</tbody></table></section></main></>;
}
