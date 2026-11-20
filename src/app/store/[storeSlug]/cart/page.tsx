import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

import { EmptyState, Money } from "@/components/pocketshop/ui";
import { formatMoney } from "@/lib/money";
import { CART_COOKIE, getCart } from "@/modules/pocketshop/cart";
import { updateCartAction } from "@/modules/pocketshop/cart-actions";
import { getPublishedStore } from "@/modules/pocketshop/authorization";

export const metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

export default async function CartPage({ params, searchParams }: { params: Promise<{ storeSlug: string }>; searchParams: Promise<{ added?: string }> }) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const { store } = await getPublishedStore(storeSlug);
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart = await getCart(store.id, token, store.currency);

  return (
    <main className="ps-shop-main ps-cart-page">
      <span className="ps-eyebrow">Your basket</span>
      <h1 style={{ fontSize: 34, letterSpacing: "-.04em", margin: "0 0 24px" }}>Cart</h1>
      {query.added && <div className="ps-success" style={{ marginBottom: 14 }}>Added to your cart.</div>}
      {cart.lines.length === 0 ? <EmptyState title="Your cart is empty" message="Browse the store and add something you like." href={`/store/${store.slug}`} cta="Continue shopping" /> : (
        <>
          <section>
            {cart.lines.map((line) => (
              <div className="ps-cart-line" key={line.id}>
                {line.imageUrl ? <Image src={line.imageUrl} alt="" width={74} height={74} unoptimized /> : <div style={{ width: 74, height: 74, background: "#f4f5f6", borderRadius: 10 }} />}
                <div>
                  <Link href={`/store/${store.slug}/products/${line.productSlug}`}><strong>{line.productName}</strong></Link>
                  <small>{line.variantName || "Standard"} · {formatMoney(line.unitPrice, store.currency)} each</small>
                  {line.available < line.quantity && <p className="ps-field-error">Only {line.available} available. Update the quantity to continue.</p>}
                </div>
                <form action={updateCartAction}>
                  <input type="hidden" name="storeSlug" value={store.slug} />
                  <input type="hidden" name="itemId" value={line.id} />
                  <input name="quantity" type="number" min={0} max={99} defaultValue={line.quantity} aria-label={`Quantity for ${line.productName}`} />
                  <button className="ps-button secondary small" type="submit">Update</button>
                </form>
                <strong><Money amount={line.lineTotal} currency={store.currency} /></strong>
              </div>
            ))}
          </section>
          <div className="ps-cart-summary">
            <div className="ps-summary-row"><span>Subtotal</span><strong><Money amount={cart.subtotal} currency={store.currency} /></strong></div>
            <div className="ps-summary-row"><span>Delivery</span><span>Calculated at checkout</span></div>
            <div className="ps-summary-row total"><span>Total before delivery</span><strong><Money amount={cart.total} currency={store.currency} /></strong></div>
            <Link className="ps-button" style={{ width: "100%", marginTop: 18 }} href={`/store/${store.slug}/checkout`}>Continue to checkout</Link>
            <p className="ps-hint" style={{ marginTop: 12 }}>No account is needed. Final prices and stock are checked on the server.</p>
          </div>
        </>
      )}
    </main>
  );
}
