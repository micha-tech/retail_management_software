"use client";

import { Boxes, ClipboardList, CreditCard, LayoutDashboard, MapPin, Settings, Store, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/pocketshop/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/pocketshop/products", label: "Products", icon: Boxes },
  { href: "/pocketshop/inventory", label: "Inventory", icon: ClipboardList },
  { href: "/pocketshop/orders", label: "Orders", icon: Truck },
  { href: "/pocketshop/customers", label: "Customers", icon: Users },
  { href: "/pocketshop/store", label: "Store", icon: Store },
  { href: "/pocketshop/payments", label: "Payments", icon: CreditCard },
  { href: "/pocketshop/deliveries", label: "Deliveries", icon: MapPin },
  { href: "/pocketshop/settings", label: "Settings", icon: Settings },
];

export function PsNav() {
  const pathname = usePathname();
  return (
    <nav className="ps-nav" aria-label="PocketShop navigation">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
          <Icon strokeWidth={1.8} /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
