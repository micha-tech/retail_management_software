import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";

import { listStockoutRisk } from "@/modules/inventory/stockout-intelligence";
import { localDateToUtc, todayRange } from "@/lib/time";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { recommendPurchaseQuantity } from "@/modules/purchasing/recommendation-math";

function dateBefore(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export default async function ProcurementRecommendationsPage() {
  const access = await requirePermission("purchasing:read");
  const branches = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const today = todayRange(access.business.timezone).date;
  const risks = await listStockoutRisk({
    businessId: access.business.id,
    branchIds: branches.map((branch) => branch.id),
    salesStart: localDateToUtc(dateBefore(today, 27), access.business.timezone),
    salesEnd: localDateToUtc(today, access.business.timezone, true),
    windowDays: 28,
  });
  const recommendations = risks.filter((risk) => ["CRITICAL", "HIGH", "MEDIUM"].includes(risk.risk)).map((risk) => ({ ...risk, ...recommendPurchaseQuantity({ averageDailySales: risk.averageDailySales, onHand: risk.onHand, incomingQuantity: risk.incomingQuantity }) })).filter((recommendation) => recommendation.suggestedQuantity > 0).sort((a, b) => b.suggestedQuantity - a.suggestedQuantity || (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0));
  const canManage = ["OWNER", "ADMIN", "BRANCH_MANAGER"].includes(access.role) || access.permissions?.includes("purchasing:manage");

  return <>
    <header className="topbar"><div><p className="eyebrow">Procurement intelligence</p><h1>Purchase recommendations</h1><p>Review suggestions before creating a purchase order. Nothing is ordered automatically.</p></div>{canManage && <Link className="button primary inline-button" href="/purchasing/new"><Plus size={17} />Create purchase order</Link>}</header>
    <main className="page"><section className="surface procurement-note"><ClipboardList size={22} /><div><strong>How these quantities are calculated</strong><p>Each suggestion targets 14 days of demand based on the last 28 days of completed sales, then subtracts stock on hand and quantities already expected on open purchase orders. Supplier lead time, supplier-product assignment, minimum order quantity, and warehouse capacity are not yet configured, so a person must review the result before ordering.</p></div></section><section className="surface table-surface"><table><thead><tr><th>Product</th><th>Branch</th><th>Risk</th><th>On hand</th><th>Incoming</th><th>Average demand</th><th>14-day target</th><th>Suggested</th></tr></thead><tbody>{recommendations.map((item) => <tr key={`${item.branchId}-${item.productId}`}><td><strong>{item.productName}</strong><small>{item.sku}</small></td><td>{item.branchName}</td><td><span className={item.risk === "CRITICAL" ? "pill danger" : item.risk === "HIGH" ? "pill warning" : "pill"}>{item.risk}</span></td><td>{item.onHand}</td><td>{item.incomingQuantity}</td><td>{item.averageDailySales.toFixed(1)} / day</td><td>{item.targetQuantity}</td><td><strong>{item.suggestedQuantity}</strong><small>Review before ordering</small></td></tr>)}</tbody></table>{!recommendations.length && <div className="empty-state">No purchase recommendations need review. Products without completed-sales history are intentionally excluded.</div>}</section></main>
  </>;
}
