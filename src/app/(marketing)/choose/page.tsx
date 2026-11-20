import Link from "next/link";
import { ArrowRight, Boxes, Check, Store } from "lucide-react";
import "../../pocketshop.css";

export const metadata = { title: "Choose a Zyphr product", description: "Decide between Zyphr Logic for retail operations and Zyphr PocketShop for an online store." };

const logic = [
  "Point of sale and receipts",
  "Branch inventory and stock counts",
  "Purchasing, suppliers and expenses",
  "Employees, roles and operational reports",
];
const pocket = [
  "A public storefront with product pages",
  "Guest checkout, orders and secure tracking",
  "Delivery zones, pickup and payment options",
  "Vendor dashboard for catalogue and fulfilment",
];

export default function ChoosePage() {
  return (
    <div className="ps-landing">
      <section className="ps-landing-hero">
        <div>
          <span className="ps-eyebrow">Choose your product</span>
          <h1>Two products. One clear place to start.</h1>
          <p>Zyphr Logic runs the daily operations of a retail business. Zyphr PocketShop gives a vendor a focused online shop. Pick the one that matches what you need today — you can use both as your business grows.</p>
          <div className="ps-landing-actions"><Link className="ps-button" href="/pocketshop/register">Start a PocketShop <ArrowRight size={15} /></Link><Link className="ps-button secondary" href="/onboarding">Set up Zyphr Logic</Link></div>
        </div>
        <div className="ps-choice-card">
          <span className="ps-eyebrow">A simple guide</span>
          <h2>Running a physical store?</h2>
          <p>Choose Logic for tills, stock, staff, suppliers and branch reporting. Selling online to customers browsing on their phones? Choose PocketShop for a shop they can order from directly.</p>
          <p style={{ marginBottom: 0 }}>Already a Logic customer? Sign in and continue in the workspace you know.</p>
        </div>
      </section>
      <section className="ps-choice-grid">
        <article className="ps-choice-option">
          <span className="ps-logo-mark"><Boxes size={16} /></span>
          <h3>Zyphr Logic</h3>
          <p>For retailers managing sales, inventory, people and operations across one or more locations.</p>
          <ul>{logic.map((item) => <li key={item}><Check size={13} style={{ display: "inline", marginRight: 7 }} />{item}</li>)}</ul>
          <div className="ps-actions"><Link className="ps-button" href="/onboarding">Create a Logic workspace</Link><Link className="ps-button secondary" href="/features">Explore features</Link></div>
        </article>
        <article className="ps-choice-option featured">
          <span className="ps-logo-mark"><Store size={16} /></span>
          <h3>Zyphr PocketShop</h3>
          <p>For vendors who want a mobile-first shop with product pages, checkout, payments and order tracking.</p>
          <ul>{pocket.map((item) => <li key={item}><Check size={13} style={{ display: "inline", marginRight: 7 }} />{item}</li>)}</ul>
          <div className="ps-actions"><Link className="ps-button" href="/pocketshop/register">Create your store</Link><Link className="ps-button secondary" href="/pocketshop">Learn more</Link></div>
        </article>
      </section>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 70px" }}>
        <div className="ps-card"><h2>Not sure yet?</h2><p className="ps-hint" style={{ margin: "8px 0 16px" }}>Explore a guided demo of Logic, or set up a PocketShop and add your first product at your own pace.</p><div className="ps-actions"><Link className="ps-button secondary" href="/demo">Explore the Logic demo</Link><Link className="ps-button" href="/pocketshop/login">Sign in to PocketShop</Link></div></div>
      </section>
    </div>
  );
}
