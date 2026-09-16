import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { siteConfig } from "@/config/marketing";

const groups = [
  ["Product", ["Features|/features", "Point of Sale|/features#point-of-sale", "Inventory|/features#inventory", "Multi-branch|/features#multi-branch", "CRM|/features#customers", "Reports|/features#reports"]],
  ["Solutions", ["Supermarkets|/solutions/supermarkets", "Shopping Malls|/solutions", "Retail Stores|/solutions", "Wholesalers|/solutions", "E-commerce|/solutions/ecommerce"]],
  ["Company", ["About|/about", "Contact|/contact", "Careers|/contact?topic=careers", "Partners|/contact?topic=partners"]],
  ["Resources", ["Help Centre|/contact?topic=support", "Documentation|/features", "Privacy Policy|/privacy", "Terms of Service|/terms"]],
] as const;
export function MarketingFooter() { return <footer className="marketing-footer"><div className="marketing-container footer-grid"><div className="footer-brand"><Link className="brand marketing-logo" href="/"><BrandLogo/></Link><p>One connected system for sales, inventory, customers, employees, expenses, and every retail location.</p><Link href="/demo">Explore the Demo <ArrowUpRight/></Link></div>{groups.map(([title, links]) => <div className="footer-group" key={title}><h2>{title}</h2>{links.map(raw => { const [label, href] = raw.split("|"); return <Link href={href} key={raw}>{label}</Link>; })}</div>)}</div><div className="marketing-container footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.</span><span>Built for modern retail operations.</span></div></footer>; }
