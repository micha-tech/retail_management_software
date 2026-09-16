import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, Boxes, Check, CheckCheck, CircleCheck, ClipboardCheck, Globe2, Layers3, ScanLine, ShieldCheck, ShoppingBasket, Store, Truck, UsersRound } from "lucide-react";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { FAQSection } from "@/components/marketing/sections";
import { ProductNavigation } from "@/components/marketing/product-navigation";
import { TrackedLink } from "@/components/marketing/tracked-link";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Retail Logic | Retail Management and Operations Software",
  description: "Sell confidently, stay on top of stock, and manage every branch with Retail Logic. Explore point of sale, inventory, purchasing, and reporting in one platform.",
  alternates: { canonical: "/" },
  openGraph: { title: "Your business. Working better, together.", description: "Sales, stock, people, and every store. One connected retail platform.", url: "/" },
};

const products = [
  { id: "sell", label: "Point of sale" },
  { id: "stock", label: "Inventory" },
  { id: "purchase", label: "Purchasing" },
  { id: "locations", label: "Multi-branch" },
  { id: "insights", label: "Reports & insights" },
];

function DemoLink({ light = false }: { light?: boolean }) {
  return <TrackedLink event="book_demo_clicked" href="/demo" className={`${styles.button} ${light ? styles.lightButton : ""}`}>Explore the demo <ArrowRight size={18} aria-hidden="true" /></TrackedLink>;
}

function Photo({ name, alt, preload = false }: { name: string; alt: string; preload?: boolean }) {
  return <Image src={`/brand/marketing/${name}.webp`} width={1536} height={1024} alt={alt} sizes="(max-width: 700px) 90vw, (max-width: 1100px) 50vw, 620px" preload={preload} />;
}

const features = [
  { id: "sell", Icon: ScanLine, label: "Point of sale", title: <>A better day starts<br />at checkout.</>, text: "Keep the queue moving and the records clear. Record payments, issue receipts, and connect every sale to the right product, cashier, and branch.", bullets: ["Sales and stock, connected", "Clear cashier accountability", "Cash, card, and transfer records"], href: "/features#point-of-sale" },
  { id: "stock", Icon: Boxes, label: "Inventory management", title: <>Know what you have.<br />Know what comes next.</>, text: "See what is on the shelf, what is selling, and what needs replenishing. Follow stock movements and investigate differences with the records behind them.", bullets: ["Branch-level stock visibility", "Low-stock and replenishment insights", "Stock counts and traceable transfers"], href: "/features#inventory" },
  { id: "purchase", Icon: ClipboardCheck, label: "Purchasing & suppliers", title: <>From supplier order<br />to a well-stocked store.</>, text: "Bring purchase orders, deliveries, supplier balances, and stock receipts into one workflow. Know what you ordered, what arrived, and what is still outstanding.", bullets: ["Purchase orders and goods received", "Partial delivery tracking", "Supplier payments and balances"], href: "/features#purchasing" },
  { id: "locations", Icon: Store, label: "Multi-branch management", title: <>Be in control.<br />Even when you’re not there.</>, text: "Stay close to every location from one workspace. Review branch performance, find available stock, and give each team the access their work requires.", bullets: ["One view across your branches", "Branch-specific employee access", "Stock transfers with a clear trail"], href: "/solutions/multi-branch-retail" },
  { id: "insights", Icon: BarChart3, label: "Reports & insights", title: <>Better answers.<br />Better business decisions.</>, text: "See what sold, what earned margin, and where your attention is needed. Bring product, cashier, and branch performance into focus with reports grounded in your operations.", bullets: ["Sales and gross profit visibility", "Product and cashier performance", "Stock and branch comparisons"], href: "/features#reports" },
];

function ProductVisual({ id }: { id: string }) {
  if (id === "locations" || id === "insights") return <div className={`${styles.productVisual} ${styles.screenVisual}`}><div className={styles.screenBar}><span /><span /><span /><b>Retail Logic / {id === "locations" ? "Branches" : "Overview"}</b></div><DashboardPreview screen={id === "locations" ? "branches" : "overview"} /></div>;
  if (id === "purchase") return <div className={`${styles.productVisual} ${styles.ownerVisual}`}><Photo name="store-owner" alt="Retail business owner standing in a stocked store" /><div className={styles.receivingCard}><small>A CONNECTED PURCHASING WORKFLOW</small><span><ClipboardCheck /> Order with confidence</span><span><Truck /> Check what arrives</span><span><Boxes /> Update your stock</span></div></div>;
  return <div className={`${styles.productVisual} ${id === "sell" ? styles.checkoutVisual : styles.peopleVisual}`}><Photo name={id === "sell" ? "pos-hardware" : "inventory-team"} alt={id === "sell" ? "Illustrated Retail Logic checkout with a screen, receipt printer, and barcode scanner" : "Store employee reviewing inventory on a tablet between supermarket aisles"} />{id === "sell" && <span className={styles.imageCaption}>Retail Logic checkout concept · Hardware shown for illustration</span>}<div className={styles.floatingNote}>{id === "sell" ? <CircleCheck /> : <Boxes />}<div><strong>{id === "sell" ? "From checkout to stock records" : "A clearer view of every shelf"}</strong><span>{id === "sell" ? "Keep the whole business in step." : "Stock decisions start with visibility."}</span></div></div></div>;
}

export default function MarketingHome() {
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={`${styles.container} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}><Layers3 size={17} aria-hidden="true" /> One platform. Every part of your retail business.</p>
          <h1>Your business.<br /><span>Working better,<br />together.</span></h1>
          <p className={styles.lede}>From your first sale to your next branch. Bring your sales, stock, people, and purchasing together — and run your business with confidence.</p>
          <div className={styles.actions}><DemoLink light /><Link href="/contact" className={styles.heroContact}>Talk to our team <ArrowUpRight size={17} aria-hidden="true" /></Link></div>
          <p className={styles.demoNote}><ShieldCheck size={16} aria-hidden="true" /> No sign-up. Explore with sample business data.</p>
        </div>
        <div className={styles.collage}>
          <div className={styles.collageHardware}><Photo name="pos-hardware" alt="Retail Logic point-of-sale setup illustration" /></div>
          <div className={styles.collageTeam}><Photo name="inventory-team" alt="Retail team member checking stock with a tablet" preload /></div>
          <div className={styles.collageOwner}><Photo name="store-owner" alt="Retail Logic store owner" /></div>
          <div className={styles.collageCashier}><Photo name="store-cashier" alt="Retail Logic cashier at a supermarket checkout" preload /></div>
          <div className={styles.connectedCard}><span className={styles.connectedIcon}><CheckCheck size={24} /></span><div><small>One connected business</small><strong>Every sale. Every shelf.</strong><span>All working together.</span></div></div>
          <div className={styles.stockBadge}><Boxes size={19} /><span>Stock in view</span></div>
        </div>
      </div>
    </section>
    <section className={`${styles.container} ${styles.industryPanel}`} aria-labelledby="industries-title">
      <div className={styles.industryIntro}><div><h2 id="industries-title">Built around the way you do business.</h2><p>One store or many. On the shop floor or online.</p></div><Link href="/solutions">Find your solution <ArrowRight size={17} /></Link></div>
      <div className={styles.industries}>{[{Icon:ShoppingBasket,title:"Supermarkets"},{Icon:Store,title:"Retail stores"},{Icon:Layers3,title:"Multi-branch retail"},{Icon:Truck,title:"Wholesalers"},{Icon:Globe2,title:"Online stores"}].map(({Icon,title}) => <div key={title}><Icon aria-hidden="true" /><span>{title}</span></div>)}</div>
    </section>
    <section className={styles.productSection} aria-labelledby="products-title">
      <div className={`${styles.container} ${styles.sectionIntro}`}><p className={styles.eyebrow}>THE RETAIL LOGIC PLATFORM</p><h2 id="products-title">Everything your business needs.<br />Already working together.</h2><p>Less switching between systems. More time to move your business forward.</p></div>
      <ProductNavigation items={products} />
      <div className={styles.container}>{features.map(({id,Icon,label,title,text,bullets,href}) => <article id={id} className={styles.productRow} key={id}><div className={styles.productCopy}><span className={styles.productLabel}><Icon size={16} />{label}</span><h2>{title}</h2><p>{text}</p><ul>{bullets.map(bullet => <li key={bullet}><Check />{bullet}</li>)}</ul><div className={styles.actions}><DemoLink /><Link href={href} className={styles.learnLink}>Learn more <ArrowRight size={17} /></Link></div></div><ProductVisual id={id} /></article>)}</div>
    </section>
    <section className={styles.moreSection}><div className={styles.container}><div className={styles.sectionIntro}><p className={styles.eyebrow}>ROOM TO DO MORE</p><h2>Every part of retail.<br />A little more connected.</h2></div><div className={styles.moreGrid}>
      {[
        { Icon: Globe2, title: "Your store, online too.", text: "Bring your catalogue, online orders, and fulfilment into your retail workflow.", href: "/solutions/ecommerce", label: "Explore e-commerce", style: styles.mintCard },
        { Icon: UsersRound, title: "A team you can trust.", text: "Set permissions, assign branches, and see the people behind each transaction.", href: "/features#employee", label: "Explore team management", style: styles.creamCard },
        { Icon: ShieldCheck, title: "Keep credit in the picture.", text: "Manage customer credit sales, outstanding balances, and repayments with clear employee access.", href: "/features", label: "Explore the platform", style: styles.sageCard },
      ].map(({ Icon, title, text, href, label, style }) => <article className={style} key={title}><div className={styles.moreIcon}><Icon size={36} strokeWidth={1.4} /></div><h3>{title}</h3><p>{text}</p><Link href={href}>{label} <ArrowUpRight size={18} /></Link></article>)}
    </div></div></section>
    <section className={`${styles.container} ${styles.getStarted}`}><div className={styles.startPhoto}><Photo name="store-cashier" alt="Cashier ready to welcome customers at a supermarket" /><div><span>Built for your people.</span><strong>Ready for your next chapter.</strong></div></div><div className={styles.startCopy}><p className={styles.eyebrow}>GET STARTED WITH RETAIL LOGIC</p><h2>Your next step<br />can be a simple one.</h2><div className={styles.startSteps}><article><span><ScanLine /></span><div><h3>Take it for a test run</h3><p>Explore a demo business with products, branches, and sales already in place.</p></div></article><article><span><Store /></span><div><h3>Make it your business</h3><p>Set up your catalogue, locations, team, and opening stock.</p></div></article><article><span><BarChart3 /></span><div><h3>Bring the day into focus</h3><p>Start selling, track movement, and review the numbers in one place.</p></div></article></div><DemoLink /></div></section>
    <FAQSection />
    <section className={styles.finalCta}><div className={styles.container}><p className={styles.eyebrow}>YOUR BUSINESS HAS MORE IN STORE</p><h2>Give it the tools<br />to move forward.</h2><p>See what a connected retail business can feel like.</p><div className={styles.actions}><DemoLink light /><Link href="/pricing" className={styles.heroContact}>Find your plan <ArrowUpRight size={17} /></Link></div></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Retail Logic", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "Retail management software for sales, inventory, purchasing, employees, reporting, and multiple branches." }) }} />
  </div>;
}
