"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { navItems } from "@/config/marketing";
import { TrackedLink } from "./tracked-link";

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const onOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setActiveMenu(null);
        setOpen(false);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerdown", onOutsideClick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerdown", onOutsideClick);
    };
  }, []);

  return <header ref={headerRef} className={`marketing-header ${scrolled ? "is-scrolled" : ""}`} onKeyDown={event => {
    if (event.key === "Escape") {
      if (open) mobileToggleRef.current?.focus();
      else headerRef.current?.querySelector<HTMLButtonElement>('[data-menu-toggle][aria-expanded="true"]')?.focus();
      setOpen(false);
      setActiveMenu(null);
    }
  }}>
    <div className="marketing-nav-wrap">
      <Link className="marketing-logo brand" href="/" aria-label="Retail Logic home" onClick={() => { setOpen(false); setActiveMenu(null); }}><BrandLogo /></Link>
      <nav className="marketing-desktop-nav" aria-label="Main navigation">
        {navItems.map(item => item.children ? <div className={`marketing-nav-group ${activeMenu === item.label ? "is-open" : ""}`} key={item.label} onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveMenu(null);
        }}>
          <button data-menu-toggle type="button" aria-expanded={activeMenu === item.label} aria-controls={`menu-${item.label.toLowerCase()}`} className={pathname.startsWith(item.href) ? "active" : ""} onClick={() => setActiveMenu(activeMenu === item.label ? null : item.label)}>{item.label}<ChevronDown aria-hidden="true" /></button>
          <div id={`menu-${item.label.toLowerCase()}`} className="marketing-dropdown">{item.children.map(child => <Link href={child.href} key={child.href} onClick={() => setActiveMenu(null)}>{child.label}</Link>)}</div>
        </div> : <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.label}>{item.label}</Link>)}
      </nav>
      <div className="marketing-nav-actions"><TrackedLink event="sign_in_clicked" href="/login" className="marketing-text-link">Sign In</TrackedLink><TrackedLink event="book_demo_clicked" href="/demo" className="marketing-button compact">Explore the Demo</TrackedLink></div>
      <button ref={mobileToggleRef} type="button" className="marketing-menu-button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav id="mobile-navigation" className="marketing-mobile-nav" aria-label="Mobile navigation" onClick={event => {
      if ((event.target as Element).closest("a")) setOpen(false);
    }}>
      {navItems.map(item => item.children ? <details className="marketing-mobile-group" key={item.label}><summary>{item.label}<ChevronDown aria-hidden="true" /></summary><div>{item.children.map(child => <Link className="sub" href={child.href} key={child.href}>{child.label}</Link>)}</div></details> : <Link href={item.href} key={item.label}>{item.label}</Link>)}
      <TrackedLink event="sign_in_clicked" href="/login">Sign In</TrackedLink>
      <TrackedLink event="book_demo_clicked" href="/demo" className="marketing-button">Explore the Demo</TrackedLink>
    </nav>}
  </header>;
}
