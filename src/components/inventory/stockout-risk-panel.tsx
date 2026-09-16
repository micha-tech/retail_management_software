import { AlertTriangle } from "lucide-react";

import { localDateToUtc, todayRange } from "@/lib/time";
import { listStockoutRisk } from "@/modules/inventory/stockout-intelligence";

function dateBefore(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function StockoutRiskPanel({ businessId, branchIds, timezone }: { businessId: string; branchIds: string[]; timezone: string }) {
  const today = todayRange(timezone).date;
  const records = await listStockoutRisk({
    businessId,
    branchIds,
    salesStart: localDateToUtc(dateBefore(today, 27), timezone).toISOString(),
    salesEnd: localDateToUtc(today, timezone, true).toISOString(),
    windowDays: 28,
  });
  const attention = records.filter((record) => ["CRITICAL", "HIGH", "MEDIUM"].includes(record.risk)).sort((a, b) => {
    const priority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NO_HISTORY: 4 };
    return priority[a.risk] - priority[b.risk] || (a.daysOfCover ?? Number.POSITIVE_INFINITY) - (b.daysOfCover ?? Number.POSITIVE_INFINITY);
  }).slice(0, 8);

  return <section className="surface table-surface report-block">
    <div className="section-heading report-heading">
      <div><p className="eyebrow">Inventory intelligence</p><h2>Stockout attention</h2><p>Based on the last 28 calendar days of completed sales. Incoming purchase orders are shown but are not counted as stock on hand.</p></div>
      <AlertTriangle />
    </div>
    {!attention.length ? <div className="empty-state">No stockout risks with recorded recent demand across your accessible branches.</div> : <table><thead><tr><th>Product</th><th>Risk</th><th>On hand</th><th>Recent demand</th><th>Cover</th><th>Incoming</th><th>Why</th></tr></thead><tbody>{attention.map((record) => <tr key={`${record.branchId}-${record.productId}`}><td><strong>{record.productName}</strong><small>{record.branchName} · {record.sku}</small></td><td><span className={record.risk === "CRITICAL" ? "pill danger" : record.risk === "HIGH" ? "pill warning" : "pill"}>{record.risk}</span></td><td>{record.onHand}</td><td>{record.averageDailySales.toFixed(1)} / day<small>{record.trailingUnits} units in 28 days</small></td><td>{record.daysOfCover === null ? "—" : `${record.daysOfCover.toFixed(1)} days`}</td><td>{record.incomingQuantity}</td><td><small>{record.reason}</small></td></tr>)}</tbody></table>}
  </section>;
}
