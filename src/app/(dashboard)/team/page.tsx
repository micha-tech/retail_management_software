import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { businessMemberships, users } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { effectivePermissions, permissionDefinitions } from "@/modules/auth/permissions";

export default async function TeamPage() {
  const access = await requirePermission("team:manage");
  const members = await db.select({ id: users.id, name: users.name, email: users.email, userActive: users.active, membershipActive: businessMemberships.active, role: businessMemberships.role, permissions: businessMemberships.permissions }).from(businessMemberships).innerJoin(users, eq(users.id, businessMemberships.userId)).where(eq(businessMemberships.businessId, access.business.id)).orderBy(asc(users.name));
  return <><header className="topbar"><div><p className="eyebrow">Access control</p><h1>Team</h1><p>Employee login accounts, roles, branches, and feature privileges.</p></div><Link className="button primary inline-button" href="/team/new"><Plus size={17}/> Add employee</Link></header><main className="page"><section className="surface team-toolbar"><div><h2>Employee accounts</h2><p>Create a login, assign branches, and choose exactly which features the employee can use.</p></div><Link className="button primary inline-button" href="/team/new"><Plus size={17}/> Add employee</Link></section><section className="surface table-surface"><table><thead><tr><th>Name</th><th>Login email</th><th>Role</th><th>Feature access</th><th>Status</th></tr></thead><tbody>{members.map((member) => {const active=member.userActive&&member.membershipActive;const assigned=effectivePermissions(member.role,member.permissions);const labels=permissionDefinitions.filter((definition)=>assigned.includes(definition.value)).map((definition)=>definition.label);const mayEdit=member.role!=="OWNER"&&member.id!==access.user.id&&(access.role==="OWNER"||member.role!=="ADMIN");return <tr key={member.id}><td>{mayEdit?<Link href={`/team/${member.id}/edit`}><strong>{member.name}</strong></Link>:<strong>{member.name}</strong>}</td><td>{member.email}</td><td>{member.role==="STOREKEEPER"?"Inventory manager":member.role.replaceAll("_", " ")}</td><td>{labels.join(", ")}</td><td><span className={active ? "pill active" : "pill"}>{active ? "Active" : "Inactive"}</span></td></tr>;})}</tbody></table></section></main></>;
}
