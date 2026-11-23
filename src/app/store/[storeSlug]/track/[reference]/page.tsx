import Link from "next/link";
import { cookies, headers } from "next/headers";

import { DateText, EmptyState, StatusPill } from "@/components/pocketshop/ui";
import { formatMoney } from "@/lib/money";
import { getPublishedStore } from "@/modules/pocketshop/authorization";
import { ORDER_COOKIE } from "@/modules/pocketshop/lib/constants";
import { hashToken } from "@/modules/pocketshop/lib/security";
import { clientKey, consumeRateLimit } from "@/modules/pocketshop/rate-limit";
import { getPublicOrder } from "@/modules/pocketshop/queries";

export const metadata = { title: "Track your order" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  payment_not_confirmed: "Your payment has not been confirmed yet. If you paid, it may take a moment for the gateway to verify.",
  order_link_expired: "This tracking session has expired. Open the secure link from your order confirmation again.",
  payment_reference_invalid: "The payment reference was not recognised.",
};

export default async function TrackOrderPage({ params, searchParams }: {
  params: Promise<{ storeSlug: string; reference: string }>;
  searchParams: Promise<{ token?: string; placed?: string; payment?: string; error?: string }>;
}) {
  const { storeSlug, reference } = await params;
  const query = await searchParams;
  const { store } = await getPublishedStore(storeSlug);
  const requestHeaders = await headers();
  if (!await consumeRateLimit(clientKey(requestHeaders, `ps-track-${store.id}`), 40, 60 * 60 * 1000)) {
    return <main className="ps-shop-main ps-track"><EmptyState title="Too many tracking attempts" message="Please wait a short while before opening this page again." /></main>;
  }
  const jar = await cookies();
  const token = query.token || jar.get(ORDER_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return <main className="ps-shop-main ps-track"><EmptyState title="Secure tracking link required" message="Use the private link shown after checkout or the order link shared with you." href={`/store/${store.slug}`} cta="Back to store" /></main>;
  }
  const detail = await getPublicOrder(store.id, reference, hashToken(token));
  if (!detail?.order || !detail.store) {
    return <main className="ps-shop-main ps-track"><EmptyState title="Order not found" message="This tracking link is invalid or belongs to another store." href={`/store/${store.slug}`} cta="Back to store" /></main>;
  }
  const { order, items, events, payments } = detail;

  return (
    <main className="ps-shop-main ps-track">
      {query.placed && <div className="ps-success" style={{ marginBottom: 14 }}>Order placed. Keep this page or link to follow its progress.</div>}
      {query.payment === "confirmed" && <div className="ps-success" style={{ marginBottom: 14 }}>Payment confirmed by the gateway.</div>}
      {query.error && <div className="ps-error" style={{ marginBottom: 14 }}>{ERRORS[query.error] ?? "This order could not be updated."}</div>}
      <section className="ps-track-hero">
        <span className="ps-eyebrow">Order {order.reference}</span>
        <h1>{order.paymentStatus === "PAID" ? "Thank you — your order is confirmed." : "Your order has been received."}</h1>
        <p>{detail.store.name} · Placed <DateText value={order.createdAt} /> · {order.deliveryMethod === "PICKUP" ? "Pickup from store" : "Delivery"}</p>
        <div className="ps-actions" style={{ marginTop: 16 }}><StatusPill value={order.paymentStatus} kind={order.paymentStatus === "PAID" ? "paid" : "pending"} /><StatusPill value={order.fulfilmentStatus} /></div>
      </section>

      <div className="ps-stack" style={{ marginTop: 18 }}>
        <section className="ps-checkout-card">
          <h2>Order status</h2>
          <div className="ps-timeline" style={{ marginTop: 18 }}>{events.map((event) => <article key={event.id}><div><strong>{event.message}</strong><small><DateText value={event.createdAt} /></small></div></article>)}</div>
        </section>
        <section className="ps-checkout-card">
          <h2>Your items</h2>
          <div className="ps-mobile-list">{items.map((item) => <div className="ps-list-item" key={item.id}><div><strong>{item.productName}</strong><small>{item.variantName || "Standard"} · {item.quantity} × {formatMoney(item.unitPrice, order.currency)}</small></div><strong>{formatMoney(item.lineTotal, order.currency)}</strong></div>)}</div>
          <dl className="ps-detail-list" style={{ marginTop: 14 }}>
            <div><dt>Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
            <div><dt>Delivery</dt><dd>{formatMoney(order.deliveryFee, order.currency)}</dd></div>
            <div><dt>Total</dt><dd>{formatMoney(order.total, order.currency)}</dd></div>
            {order.depositAmount > 0n && <div><dt>Deposit due now</dt><dd>{formatMoney(order.depositAmount, order.currency)}</dd></div>}
          </dl>
        </section>
        <section className="ps-checkout-card">
          <h2>Delivery and payment</h2>
          <dl className="ps-detail-list">
            <div><dt>Name</dt><dd>{order.customerName}</dd></div>
            <div><dt>Phone</dt><dd>{order.customerPhone}</dd></div>
            <div><dt>Address</dt><dd>{[order.address, order.city, order.state].filter(Boolean).join(", ") || "Pickup from store"}</dd></div>
            {order.deliveryInstructions && <div><dt>Instructions</dt><dd>{order.deliveryInstructions}</dd></div>}
            <div><dt>Payment method</dt><dd>{order.paymentMethod.replaceAll("_", " ")}</dd></div>
            <div><dt>Payment status</dt><dd>{order.paymentStatus === "PAID" ? "Paid" : "Awaiting confirmation"}</dd></div>
            {order.trackingRef && <div><dt>Tracking reference</dt><dd>{order.trackingRef}</dd></div>}
            {payments[0]?.providerReference && <div><dt>Payment reference</dt><dd>{payments[0].providerReference}</dd></div>}
          </dl>
        </section>
        <section className="ps-checkout-card">
          <h2>Need help?</h2>
          <p className="ps-hint">Contact {detail.store.name} directly about this order.</p>
          <div className="ps-actions" style={{ marginTop: 12 }}>
            <a className="ps-button secondary small" href={`tel:${detail.store.phone}`}>Call store</a>
            {detail.store.whatsapp && <a className="ps-button secondary small" href={`https://wa.me/${detail.store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I'm asking about order ${order.reference}.`)}`} target="_blank" rel="noreferrer">Message on WhatsApp</a>}
            <Link className="ps-button secondary small" href={`/store/${store.slug}`}>Back to store</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
