import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusForm } from "@/components/pocketshop/order-status-form";
import { DateText, Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { confirmManualPaymentAction, saveInternalNoteAction } from "@/modules/pocketshop/order-actions";
import { FULFILMENT_TRANSITIONS, type FulfilmentStatus } from "@/modules/pocketshop/lib/commerce";
import { getOrderDetail } from "@/modules/pocketshop/queries";

export const metadata = { title: "Order details" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { store, business } = await requirePocketStore();
  const { id } = await params;
  const detail = await getOrderDetail(store.id, business.id, id);
  if (!detail) notFound();
  const { order, items, events, payments } = detail;
  const options = FULFILMENT_TRANSITIONS[order.fulfilmentStatus as FulfilmentStatus] ?? [];

  return (
    <>
      <PageHeader eyebrow="Order" title={order.reference} description={`Placed ${new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(order.createdAt)}`} actions={<Link className="ps-button secondary" href="/pocketshop/orders">← Orders</Link>} />
      <main className="ps-page">
        <div className="ps-detail-grid">
          <div className="ps-stack">
            <section className="ps-card">
              <div className="ps-card-head"><div><h2>Items</h2><p>{order.deliveryMethod === "PICKUP" ? "Customer pickup" : "Delivery order"}</p></div><div className="ps-actions"><StatusPill value={order.paymentStatus} kind={order.paymentStatus === "PAID" ? "paid" : "pending"} /><StatusPill value={order.fulfilmentStatus} /></div></div>
              <div className="ps-mobile-list">{items.map((item) => <div className="ps-list-item" key={item.id}>
                <div><strong>{item.productName}</strong><small>{item.variantName || "Standard"} · {item.quantity} × <Money amount={item.unitPrice} currency={order.currency} /></small></div>
                <strong><Money amount={item.lineTotal} currency={order.currency} /></strong>
              </div>)}</div>
              <dl className="ps-detail-list" style={{ marginTop: 18 }}>
                <div><dt>Subtotal</dt><dd><Money amount={order.subtotal} currency={order.currency} /></dd></div>
                <div><dt>Delivery</dt><dd><Money amount={order.deliveryFee} currency={order.currency} /></dd></div>
                <div><dt>Total</dt><dd><Money amount={order.total} currency={order.currency} /></dd></div>
                {order.depositAmount > 0n && <div><dt>Deposit due now</dt><dd><Money amount={order.depositAmount} currency={order.currency} /></dd></div>}
              </dl>
            </section>
            <section className="ps-card">
              <div className="ps-card-head"><div><h2>Customer and delivery</h2><p>Contact details for this order only.</p></div></div>
              <dl className="ps-detail-list">
                <div><dt>Name</dt><dd>{order.customerName}</dd></div>
                <div><dt>Phone</dt><dd><a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a></dd></div>
                {order.customerEmail && <div><dt>Email</dt><dd>{order.customerEmail}</dd></div>}
                <div><dt>Address</dt><dd>{[order.address, order.city, order.state].filter(Boolean).join(", ") || "Pickup from store"}</dd></div>
                {order.deliveryInstructions && <div><dt>Instructions</dt><dd>{order.deliveryInstructions}</dd></div>}
                {order.trackingRef && <div><dt>Tracking reference</dt><dd>{order.trackingRef}</dd></div>}
              </dl>
              {order.customerPhone && <a className="ps-button secondary small" style={{ marginTop: 16 }} href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Message on WhatsApp</a>}
            </section>
            <section className="ps-card">
              <div className="ps-card-head"><div><h2>Order history</h2><p>A timeline of every status change.</p></div></div>
              <div className="ps-timeline">{events.map((event) => <article key={event.id}><div><strong>{event.message}</strong><small>{event.actor} · <DateText value={event.createdAt} /></small></div></article>)}</div>
            </section>
          </div>
          <div className="ps-stack">
            <section className="ps-card"><div className="ps-card-head"><h2>Update fulfilment</h2></div><OrderStatusForm orderId={order.id} current={order.fulfilmentStatus as FulfilmentStatus} options={options} /></section>
            {order.paymentStatus === "PENDING" && (order.paymentMethod === "BANK_TRANSFER" || order.paymentMethod === "CASH_ON_DELIVERY") && (
              <section className="ps-card"><div className="ps-card-head"><div><h2>Confirm manual payment</h2><p>Only after you have verified the transfer or collected the cash.</p></div></div>
                <form action={confirmManualPaymentAction}><input type="hidden" name="orderId" value={order.id} /><button className="ps-button" type="submit">Mark payment received</button></form>
              </section>
            )}
            {payments.length > 0 && <section className="ps-card"><div className="ps-card-head"><h2>Payments</h2></div><div className="ps-mobile-list">{payments.map((payment) => <div className="ps-list-item" key={payment.id}><div><strong>{payment.provider}</strong><small>{payment.method.replaceAll("_", " ")} · <DateText value={payment.createdAt} /></small></div><StatusPill value={payment.status} kind={payment.status === "PAID" ? "paid" : "pending"} /></div>)}</div></section>}
            <section className="ps-card"><div className="ps-card-head"><h2>Internal note</h2></div><form className="ps-form" action={saveInternalNoteAction}><input type="hidden" name="orderId" value={order.id} /><textarea name="internalNotes" defaultValue={order.internalNotes ?? ""} maxLength={1000} placeholder="Only your team can see this note." /><button className="ps-button secondary" type="submit">Save note</button></form></section>
          </div>
        </div>
      </main>
    </>
  );
}
