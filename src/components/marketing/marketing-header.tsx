"use client";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { navItems } from "@/config/marketing";
import { TrackedLink } from "./tracked-link";

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 12); onScroll(); addEventListener("scroll", onScroll, { passive: true }); return () => removeEventListener("scroll", onScroll); }, []);
  return <header className={`marketing-header ${scrolled ? "is-scrolled" : ""}`}>
    <div className="marketing-nav-wrap">
      <Link className="marketing-logo brand" href="/" aria-label="Retail Logic home" onClick={()=>setOpen(false)}><BrandLogo /></Link>
      <nav className="marketing-desktop-nav" aria-label="Main navigation">
        {navItems.map((item) => item.children ? <div className="marketing-nav-group" key={item.label}>
          <Link className={pathname.startsWith(item.href) ? "active" : ""} href={item.href}>{item.label}<ChevronDown aria-hidden="true" /></Link>
          <div className="marketing-dropdown">{item.children.map(child => <Link href={child.href} key={child.href}>{child.label}</Link>)}</div>
        </div> : <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.label}>{item.label}</Link>)}
      </nav>
      <div className="marketing-nav-actions"><TrackedLink event="sign_in_clicked" href="/login" className="marketing-text-link">Sign In</TrackedLink><TrackedLink event="book_demo_clicked" href="/demo" className="marketing-button compact">Explore the Demo</TrackedLink></div>
      <button className="marketing-menu-button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </div>
    {open && <nav id="mobile-navigation" className="marketing-mobile-nav" aria-label="Mobile navigation" onClick={() => setOpen(false)}>{navItems.map(item => <div key={item.label}><Link href={item.href}>{item.label}</Link>{item.children?.map(child => <Link className="sub" href={child.href} key={child.href}>{child.label}</Link>)}</div>)}<TrackedLink event="sign_in_clicked" href="/login">Sign In</TrackedLink><TrackedLink event="book_demo_clicked" href="/demo" className="marketing-button">Explore the Demo</TrackedLink></nav>}
  </header>;
}
