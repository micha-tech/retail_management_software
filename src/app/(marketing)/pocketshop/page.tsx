import Link from "next/link";
import { ArrowRight, CreditCard, Package, ShoppingBag, Store, Truck } from "lucide-react";
import "../../pocketshop.css";

export const metadata = { title: "Zyphr PocketShop", description: "A mobile-first online shop for vendors: products, checkout, payments, delivery and order tracking." };

export default function PocketShopLandingPage() {
  return (
    <div className="ps-landing">
      <section className="ps-landing-hero">
        <div>
          <span className="ps-eyebrow">Zyphr PocketShop</span>
          <h1>Your shop, ready for the way people buy.</h1>
          <p>Create a clean, fast storefront, add products with photos and variants, receive orders, arrange delivery or pickup, and keep customers informed with a secure tracking link. No customer account required.</p>
          <div className="ps-landing-actions"><Link className="ps-button" href="/pocketshop/register">Create your store <ArrowRight size={15} /></Link><Link className="ps-button secondary" href="/pocketshop/login">Store owner sign in</Link></div>
          <p className="ps-hint" style={{ marginTop: 16 }}>Looking for point of sale, branches and supplier management? <Link href="/choose" style={{ color: "#1f4fd8", fontWeight: 700 }}>Compare Zyphr products</Link>.</p>
        </div>
        <div className="ps-choice-card">
          <span className="ps-logo-mark"><ShoppingBag size={16} /></span>
          <h2>One journey from browse to order</h2>
          <p>Customers browse your public store on any screen, choose variants, add to cart and check out as guests. You get the order with customer details, stock reserved and a timeline you control.</p>
          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            <span className="ps-hint">✓ Product photos, pricing and stock</span>
            <span className="ps-hint">✓ Delivery zones, pickup and payment choices</span>
            <span className="ps-hint">✓ Vendor dashboard with real order records</span>
          </div>
        </div>
      </section>
      <section className="ps-choice-grid" style={{ paddingBottom: 30 }}>
        <article className="ps-choice-option"><Store size={20} /><h3>A storefront that feels considered</h3><p>Your branding, large product photography, clear pricing and a simple cart. Designed first for phones, then adapted for tablets and desktops.</p></article>
        <article className="ps-choice-option"><Package size={20} /><h3>Products without spreadsheet chaos</h3><p>Add variants, SKUs, images and stock. Import a catalogue with a preview and duplicate-SKU checks before anything is created.</p></article>
        <article className="ps-choice-option"><Truck size={20} /><h3>Fulfilment you can follow</h3><p>Set delivery areas and charges, offer pickup, update order states and give customers a private link with the full timeline.</p></article>
        <article className="ps-choice-option"><CreditCard size={20} /><h3>Payments with clear boundaries</h3><p>Bank transfer and cash are verified by the vendor. Card and USSD are offered only when a real gateway is configured and verified server-side.</p></article>
      </section>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 70px" }}>
        <div className="ps-card"><h2>Ready to open your shop?</h2><p className="ps-hint" style={{ margin: "8px 0 16px" }}>Set up in five steps. Your store stays private until you publish it.</p><div className="ps-actions"><Link className="ps-button" href="/pocketshop/register">Get started</Link><Link className="ps-button secondary" href="/choose">Still deciding?</Link></div></div>
      </section>
    </div>
  );
}
