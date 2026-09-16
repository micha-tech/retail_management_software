import { AlertTriangle, ArrowRight, ClipboardCheck, PackageSearch, ReceiptText, ShieldAlert, Truck } from "lucide-react";
import Link from "next/link";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { formatMoney } from "@/lib/money";
import { localDateToUtc, todayRange } from "@/lib/time";
import { listStockoutRisk } from "@/modules/inventory/stockout-intelligence";

function dateBefore(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function CommandCenterAttention({ businessId, branchIds, currency, timezone, periodStart, periodEnd }: { businessId: string; branchIds: string[]; currency: string; timezone: string; periodStart: string; periodEnd: string }) {
  if (!branchIds.length) return null;
  const ids = sql.join(branchIds.map((id) => sql`${id}`), sql`, `);
  const today = todayRange(timezone).date;
  const [stockout, counts, receipts, cash, alerts] = await Promise.all([
    listStockoutRisk({ businessId, branchIds, salesStart: localDateToUtc(dateBefore(today, 27), timezone).toISOString(), salesEnd: localDateToUtc(today, timezone, true).toISOString(), windowDays: 28 }),
    db.execute<{ total: number }>(sql`select count(*)::int total from inventory_counts where business_id=${businessId} and branch_id in (${ids}) and status in ('COUNTING','REVIEW')`),
    db.execute<{ total: number }>(sql`select count(*)::int total from purchase_orders where business_id=${businessId} and branch_id in (${ids}) and status in ('ORDERED','PARTIALLY_RECEIVED')`),
    db.execute<{ variance: string }>(sql`select coalesce(sum(abs(cash_difference)) filter(where status='CLOSED'),0)::text variance from pos_sessions where business_id=${businessId} and branch_id in (${ids}) and closed_at between ${periodStart} and ${periodEnd}`),
    db.execute<{ total: number }>(sql`select count(*)::int total from operational_alerts where business_id=${businessId} and branch_id in (${ids}) and status in ('OPEN','ACKNOWLEDGED','IN_REVIEW')`),
  ]);
  const stockoutCount = stockout.filter((record) => ["CRITICAL", "HIGH"].includes(record.risk)).length;
  const countInProgress = counts[0]?.total ?? 0;
  const pendingReceipts = receipts[0]?.total ?? 0;
  const cashVariance = BigInt(cash[0]?.variance ?? 0);
  const openAlerts = alerts[0]?.total ?? 0;
  const items = [
    stockoutCount ? { href: "/purchasing/recommendations", icon: PackageSearch, tone: "danger", title: `${stockoutCount} product${stockoutCount === 1 ? "" : "s"} at high stockout risk`, detail: "Based on stock on hand and the last 28 days of completed sales. Review replenishment suggestions." } : null,
    countInProgress ? { href: "/inventory/counts", icon: ClipboardCheck, tone: "warning", title: `${countInProgress} inventory count${countInProgress === 1 ? "" : "s"} requires follow-up`, detail: "Counting or review is still in progress; inventory changes are paused while a count is active." } : null,
    pendingReceipts ? { href: "/purchasing", icon: Truck, tone: "warning", title: `${pendingReceipts} purchase order${pendingReceipts === 1 ? "" : "s"} awaiting delivery`, detail: "Open orders still have quantities expected from suppliers." } : null,
    cashVariance > 0n ? { href: "/reports", icon: ReceiptText, tone: "warning", title: `${formatMoney(cashVariance, currency)} till variance requires review`, detail: "Absolute difference across closed POS sessions for the selected period." } : null,
    openAlerts ? { href: "/alerts", icon: ShieldAlert, tone: "warning", title: `${openAlerts} inventory variance alert${openAlerts === 1 ? "" : "s"} requires review`, detail: "A posted physical count differed from the system balance." } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return <section className="surface command-center-attention">
    <div className="section-heading"><div><p className="eyebrow">Command center</p><h2>What needs your attention?</h2><p>Live operational signals from current records. They are advisory and link to the source workflow.</p></div><AlertTriangle /></div>
    {!items.length ? <div className="empty-state">No high-priority attention signals in the selected scope.</div> : <div className="attention-list">{items.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`attention-item ${item.tone}`}><Icon size={20} /><div><strong>{item.title}</strong><small>{item.detail}</small></div><ArrowRight size={18} /></Link>; })}</div>}
  </section>;
}
