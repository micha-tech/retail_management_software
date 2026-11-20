import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { DateText, EmptyState, Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { getVendorDashboard } from "@/modules/pocketshop/queries";

export const metadata = { title: "Overview" };

export default async function PocketDashboardPage({ searchParams }: { searchParams: Promise<{ published?: string; hint?: string }> }) {
  const { store, settings } = await requirePocketStore();
  const { published, hint } = await searchParams;
  const stats = await getVendorDashboard(store.id, store.businessId);

  return (
    <>
      <PageHeader eyebrow="Overview" title={store.name} description="A clear view of your shop today."
        actions={<><Link className="ps-button secondary" href={`/store/${store.slug}`} target="_blank">View storefront <ArrowUpRight size={14} /></Link><Link className="ps-button" href="/pocketshop/products/new"><Plus size={14} /> Add product</Link></>} />
      <main className="ps-page">
        {published && <div className="ps-success" style={{ marginBottom: 16 }}>Your store is published. Share <a href={`/store/${store.slug}`} style={{ textDecoration: "underline" }}>/store/{store.slug}</a> with customers.</div>}
        {!store.published && <div className="ps-card" style={{ marginBottom: 18, borderColor: "#c9d8ff" }}><h2>Finish setting up your store</h2><p className="ps-hint" style={{ margin: "8px 0 14px" }}>Complete the remaining onboarding steps, add a product, then publish your storefront.</p><Link className="ps-button small" href="/pocketshop/onboarding">Continue setup</Link></div>}
        {hint === "add-product" && <div className="ps-hint" style={{ marginBottom: 16 }}>Tip: add your first active product so customers have something to browse.</div>}
        <section className="ps-metrics" aria-label="Store summary">
          <article className="ps-metric"><span>Total orders</span><strong>{stats.orders}</strong><small>All time</small></article>
          <article className="ps-metric"><span>Paid revenue</span><strong style={{ fontSize: 20 }}><Money amount={stats.revenue} currency={store.currency} /></strong><small>Confirmed payments</small></article>
          <article className="ps-metric"><span>Awaiting action</span><strong>{stats.pending}</strong><small>Pending payment</small></article>
          <article className="ps-metric"><span>Live products</span><strong>{stats.products}</strong><small>{stats.lowStock} low on stock</small></article>
        </section>
        <div className="ps-grid">
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Recent orders</h2><p>Latest customer activity</p></div><Link href="/pocketshop/orders" className="ps-hint">View all →</Link></div>
            {stats.recentOrders.length === 0 ? <EmptyState title="No orders yet" message="Orders will appear here when customers check out." /> : (
              <div className="ps-mobile-list">
                {stats.recentOrders.map((order) => (
                  <div className="ps-list-item" key={order.id}>
                    <div><strong>{order.reference}</strong><small>{order.customerName} · <DateText value={order.createdAt} /></small></div>
                    <div style={{ textAlign: "right" }}><StatusPill value={order.fulfilmentStatus} kind={order.paymentStatus === "PAID" ? "active" : "pending"} /><small style={{ display: "block", marginTop: 5 }}><Money amount={order.total} currency={order.currency} /></small></div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Store status</h2><p>What customers can see</p></div></div>
            <dl className="ps-detail-list">
              <div><dt>Storefront</dt><dd>{store.published ? "Published" : "Private preview"}</dd></div>
              <div><dt>Public URL</dt><dd style={{ maxWidth: 170, overflowWrap: "anywhere" }}>/store/{store.slug}</dd></div>
              <div><dt>Delivery</dt><dd>{settings.deliveryEnabled ? "Available" : "Not offered"}</dd></div>
              <div><dt>Pickup</dt><dd>{settings.pickupEnabled ? "Available" : "Not offered"}</dd></div>
              <div><dt>Payment methods</dt><dd>{settings.paymentMethods.map((method) => method.replaceAll("_", " ")).join(", ") || "None"}</dd></div>
            </dl>
            <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
              <Link className="ps-button secondary small" href="/pocketshop/store">Edit store profile</Link>
              <Link className="ps-button secondary small" href="/pocketshop/settings">Payment settings</Link>
            </div>
          </section>
        </div>
        {stats.recentEvents.length > 0 && (
          <section className="ps-card">
            <div className="ps-card-head"><h2>Latest activity</h2></div>
            <div className="ps-timeline">
              {stats.recentEvents.map(({ event, reference }) => (
                <article key={event.id}><div><strong>{event.message}</strong><small>{reference} · <DateText value={event.createdAt} /></small></div></article>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
