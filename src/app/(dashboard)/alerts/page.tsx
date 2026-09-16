import { and, desc, eq, inArray } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { db } from "@/db/client";
import { branches, operationalAlerts } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { hasPermission } from "@/modules/auth/permissions";
import { updateOperationalAlertAction } from "@/modules/alerts/actions";

export default async function AlertsPage() {
  const access = await requirePermission("inventory:read");
  const branchesForUser = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const ids = branchesForUser.map((branch) => branch.id);
  const alerts = ids.length ? await db.select({ id: operationalAlerts.id, branchId: operationalAlerts.branchId, branch: branches.name, severity: operationalAlerts.severity, status: operationalAlerts.status, title: operationalAlerts.title, reason: operationalAlerts.reason, recommendation: operationalAlerts.recommendation, entityId: operationalAlerts.entityId, createdAt: operationalAlerts.createdAt }).from(operationalAlerts).innerJoin(branches, eq(branches.id, operationalAlerts.branchId)).where(and(eq(operationalAlerts.businessId, access.business.id), inArray(operationalAlerts.branchId, ids))).orderBy(desc(operationalAlerts.createdAt)).limit(250) : [];
  const canManage = ["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(access.role) && hasPermission(access.role, "inventory:manage", access.permissions);
  return <><header className="topbar"><div><p className="eyebrow">Operational review</p><h1>Alerts</h1><p>Potential anomalies requiring human review. Alerts do not imply misconduct.</p></div></header><main className="page"><section className="surface table-surface"><table><thead><tr><th>Alert</th><th>Branch</th><th>Severity</th><th>Status</th><th>Action</th></tr></thead><tbody>{alerts.map((alert) => <tr key={alert.id}><td><strong>{alert.title}</strong><small>{alert.reason}</small><small>Recommended: {alert.recommendation}</small></td><td>{alert.branch}</td><td><span className={alert.severity === "HIGH" || alert.severity === "CRITICAL" ? "pill danger" : "pill warning"}>{alert.severity}</span></td><td><span className="pill">{alert.status.replaceAll("_", " ")}</span></td><td>{canManage && !["RESOLVED", "DISMISSED"].includes(alert.status) ? <form action={updateOperationalAlertAction} className="inline-form"><input type="hidden" name="alertId" value={alert.id}/><input type="hidden" name="branchId" value={alert.branchId}/><select name="status" defaultValue={alert.status === "OPEN" ? "ACKNOWLEDGED" : "IN_REVIEW"}><option value="ACKNOWLEDGED">Acknowledge</option><option value="IN_REVIEW">Mark in review</option><option value="RESOLVED">Resolve</option><option value="DISMISSED">Dismiss</option></select><button className="button secondary">Update</button></form> : <Link href={`/inventory/counts/${alert.entityId}`}>View count</Link>}</td></tr>)}</tbody></table>{!alerts.length && <div className="empty-state"><AlertTriangle size={28}/><p>No operational alerts yet.</p></div>}</section></main></>;
}
