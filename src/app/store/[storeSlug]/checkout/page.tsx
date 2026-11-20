import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import { CheckoutForm } from "@/components/pocketshop/checkout-form";
import { EmptyState, Money } from "@/components/pocketshop/ui";
import { db } from "@/db/client";
import { psDeliveryZones } from "@/db/schema";
import { getPublishedStore } from "@/modules/pocketshop/authorization";
import { CART_COOKIE, getCart } from "@/modules/pocketshop/cart";
import { isPaystackConfigured } from "@/modules/pocketshop/payments";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const { store, settings } = await getPublishedStore(storeSlug);
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart = await getCart(store.id, token, store.currency);
  const zones = await db.select().from(psDeliveryZones)
    .where(and(eq(psDeliveryZones.storeId, store.id), eq(psDeliveryZones.businessId, store.businessId), eq(psDeliveryZones.active, true)))
    .orderBy(psDeliveryZones.name);

  return (
    <main className="ps-shop-main">
      <div style={{ paddingTop: 22 }}><Link href={`/store/${store.slug}/cart`} className="ps-hint">← Back to cart</Link></div>
      <span className="ps-eyebrow" style={{ marginTop: 16 }}>Almost done</span>
      <h1 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "0 0 8px" }}>Checkout</h1>
      <p className="ps-hint" style={{ marginBottom: 24 }}>No account required. We will give you a secure link to track your order.</p>
      {cart.lines.length === 0 ? <EmptyState title="Your cart is empty" message="Add products before checking out." href={`/store/${store.slug}`} cta="Browse products" /> : (
        <div className="ps-checkout">
          <CheckoutForm storeSlug={store.slug} zones={zones.map((zone) => ({ id: zone.id, name: zone.name, fee: zone.fee.toString(), estimatedDays: zone.estimatedDays }))}
            paymentMethods={settings.paymentMethods} paymentTiming={settings.paymentTiming} onlinePayments={isPaystackConfigured()}
            deliveryEnabled={settings.deliveryEnabled} pickupEnabled={settings.pickupEnabled} />
          <aside className="ps-order-summary">
            <div className="ps-checkout-card">
              <h2>Order summary</h2>
              <div className="ps-mobile-list">
                {cart.lines.map((line) => <div className="ps-list-item" key={line.id}><div><strong>{line.productName}</strong><small>{line.variantName || "Standard"} · ×{line.quantity}</small></div><strong><Money amount={line.lineTotal} currency={store.currency} /></strong></div>)}
              </div>
              <div className="ps-summary-row" style={{ marginTop: 12 }}><span>Subtotal</span><strong><Money amount={cart.subtotal} currency={store.currency} /></strong></div>
              <div className="ps-summary-row"><span>Delivery</span><span>Chosen at checkout</span></div>
              <div className="ps-summary-row total"><span>Total before delivery</span><strong><Money amount={cart.total} currency={store.currency} /></strong></div>
              <p className="ps-hint" style={{ marginTop: 14 }}>Your order is reserved briefly while payment details are confirmed.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
