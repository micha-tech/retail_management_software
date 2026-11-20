import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingBag } from "lucide-react";

import { CART_COOKIE, getCart } from "@/modules/pocketshop/cart";
import { getPublishedStore } from "@/modules/pocketshop/authorization";
import "../../pocketshop.css";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children, params }: { children: React.ReactNode; params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const { store } = await getPublishedStore(storeSlug);
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart = await getCart(store.id, token, store.currency);
  const socials = store.socialLinks && typeof store.socialLinks === "object" ? store.socialLinks as Record<string, unknown> : {};

  return (
    <div className="ps-shop">
      <header className="ps-shop-header">
        <div className="ps-shop-header-inner">
          <Link href={`/store/${store.slug}`} className="ps-shop-logo" aria-label={`${store.name} home`}>
            {store.logoUrl ? <Image src={store.logoUrl} alt="" width={42} height={42} unoptimized /> : <span>{store.name.slice(0, 1).toUpperCase()}</span>}
          </Link>
          <Link href={`/store/${store.slug}`} className="ps-shop-name"><strong>{store.name}</strong><small>{store.category ?? "Online store"}</small></Link>
          <nav className="ps-shop-nav" aria-label="Store navigation">
            <Link href={`/store/${store.slug}`}>Shop</Link>
            <Link href={`/store/${store.slug}/cart`} aria-label={`Cart, ${cart.count} items`}><ShoppingBag size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Cart <span className="ps-cart-badge">{cart.count}</span></Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="ps-shop-footer">
        <div>{store.name}{store.address ? ` · ${store.address}${store.city ? `, ${store.city}` : ""}` : ""}</div>
        <div style={{ marginTop: 7, display: "flex", justifyContent: "center", gap: 14 }}>
          {store.phone && <a href={`tel:${store.phone}`}>Call {store.phone}</a>}
          {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {Object.entries(socials).map(([label, href]) => typeof href === "string" && href.startsWith("https://") ? <a key={label} href={href} target="_blank" rel="noreferrer">{label}</a> : null)}
        </div>
        <div style={{ marginTop: 10 }}>Powered by Zyphr PocketShop</div>
      </footer>
    </div>
  );
}
