import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { branchAssignments, branches, businessMemberships, users } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { updateStaffAction } from "@/modules/team/actions";

export default async function EditStaffPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("team:manage");
  const { id } = await params;
  const [[member], branchRecords, assignments] = await Promise.all([db.select({id:users.id,name:users.name,email:users.email,role:businessMemberships.role,active:businessMemberships.active}).from(businessMemberships).innerJoin(users,eq(users.id,businessMemberships.userId)).where(and(eq(businessMemberships.businessId,access.business.id),eq(users.id,id))).limit(1),db.select().from(branches).where(and(eq(branches.businessId,access.business.id),eq(branches.active,true))).orderBy(asc(branches.name)),db.select({branchId:branchAssignments.branchId}).from(branchAssignments).where(and(eq(branchAssignments.businessId,access.business.id),eq(branchAssignments.userId,id)))]);
  if (!member || member.role === "OWNER") notFound();
  const assigned = new Set(assignments.map((assignment)=>assignment.branchId));
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/team"><ArrowLeft size={15}/> Team</Link><h1>Edit staff access</h1><p>{member.name} · {member.email}</p></div></header><main className="page narrow"><section className="surface"><form action={updateStaffAction} className="form-stack"><input type="hidden" name="memberId" value={member.id}/><label>Role<select name="role" defaultValue={member.role}><option value="ADMIN">Administrator</option><option value="BRANCH_MANAGER">Branch manager</option><option value="CASHIER">Cashier</option><option value="STOREKEEPER">Storekeeper</option></select></label><fieldset><legend>Branch assignments</legend><div className="checkbox-list">{branchRecords.map((branch)=><label key={branch.id}><input type="checkbox" name="branchIds" value={branch.id} defaultChecked={assigned.has(branch.id)}/>{branch.name}</label>)}</div></fieldset><label className="check-row"><input name="active" type="checkbox" defaultChecked={member.active}/> Active membership</label>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/team">Cancel</Link><button className="button primary">Save access</button></div></form></section></main></>;
}
