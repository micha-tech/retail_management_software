"use client";

import {
  Boxes,
  ClipboardList,
  CreditCard,
  Ellipsis,
  LayoutDashboard,
  MapPin,
  Settings,
  Store,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const primaryItems: NavItem[] = [
  { href: "/pocketshop/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pocketshop/products", label: "Products", icon: Boxes },
  { href: "/pocketshop/orders", label: "Orders", icon: Truck },
  { href: "/pocketshop/customers", label: "Customers", icon: Users },
];

const moreItems: NavItem[] = [
  { href: "/pocketshop/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/pocketshop/store", label: "Store", icon: Store },
  { href: "/pocketshop/payments", label: "Payments", icon: CreditCard },
  { href: "/pocketshop/deliveries", label: "Deliveries", icon: MapPin },
  { href: "/pocketshop/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} title={label}>
      <Icon strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  );
}

export function PsNav() {
  const pathname = usePathname();
  const [openForPathname, setOpenForPathname] = useState<string | null>(null);
  const moreOpen = openForPathname === pathname;
  const navRef = useRef<HTMLElement>(null);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenForPathname(null);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenForPathname(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [moreOpen]);

  return (
    <nav ref={navRef} className="ps-nav" aria-label="PocketShop navigation">
      <div className="ps-nav-primary">
        {primaryItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
        <button
          type="button"
          className={`ps-nav-more${moreActive ? " has-active" : ""}`}
          aria-controls="ps-nav-more-panel"
          aria-expanded={moreOpen}
          title="More navigation options"
          onClick={() => setOpenForPathname((current) => (current === pathname ? null : pathname))}
        >
          <Ellipsis strokeWidth={1.8} />
          <span>More</span>
        </button>
      </div>
      <div id="ps-nav-more-panel" className={`ps-nav-secondary${moreOpen ? " open" : ""}`}>
        <p className="ps-nav-label">Manage</p>
        {moreItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </nav>
  );
}
