import Link from "next/link";

import { DateText, EmptyState, Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { getVendorOrders } from "@/modules/pocketshop/queries";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "FAILED_DELIVERY", "REFUNDED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; updated?: string; saved?: string; error?: string }> }) {
  const { store, business } = await requirePocketStore();
  const query = await searchParams;
  const orders = await getVendorOrders(store.id, business.id, query.status, query.q);
  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Orders" description="Confirm payments, prepare items and track every handover." />
      <main className="ps-page">
        {(query.updated || query.saved) && <div className="ps-success" style={{ marginBottom: 16 }}>Order updated.</div>}
        {query.error && <div className="ps-error" style={{ marginBottom: 16 }}>{query.error}</div>}
        <form className="ps-toolbar" method="get"><label className="ps-search">Search<input name="q" defaultValue={query.q ?? ""} placeholder="Reference, name or phone" /></label><label>Status<select name="status" defaultValue={query.status ?? ""}><option value="">All</option>{STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label><button className="ps-button secondary">Filter</button></form>
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>{orders.length} order{orders.length === 1 ? "" : "s"}</h2><p>Payment and fulfilment are tracked separately.</p></div></div>
          {orders.length === 0 ? <EmptyState title="No orders yet" message="Customer orders will appear here as soon as they check out." /> : (
            <div className="ps-table-wrap"><table className="ps-table"><thead><tr><th>Reference</th><th>Customer</th><th>Total</th><th>Payment</th><th>Fulfilment</th><th>Placed</th><th /></tr></thead><tbody>
              {orders.map((order) => <tr key={order.id}>
                <td><strong>{order.reference}</strong><small>{order.deliveryMethod.toLowerCase()}</small></td>
                <td><strong>{order.customerName}</strong><small>{order.customerPhone}</small></td>
                <td><Money amount={order.total} currency={order.currency} /></td>
                <td><StatusPill value={order.paymentStatus} kind={order.paymentStatus === "PAID" ? "paid" : order.paymentStatus === "FAILED" ? "danger" : "pending"} /></td>
                <td><StatusPill value={order.fulfilmentStatus} /></td>
                <td><DateText value={order.createdAt} /></td>
                <td><Link className="ps-button secondary small" href={`/pocketshop/orders/${order.id}`}>Open</Link></td>
              </tr>)}
            </tbody></table></div>
          )}
          <div className="ps-mobile-list">{orders.map((order) => <div className="ps-list-item" key={order.id}>
            <div><strong>{order.reference}</strong><small>{order.customerName} · <DateText value={order.createdAt} /></small><small><Money amount={order.total} currency={order.currency} /></small></div>
            <Link className="ps-button secondary small" href={`/pocketshop/orders/${order.id}`}>Open</Link>
          </div>)}</div>
        </section>
      </main>
    </>
  );
}
