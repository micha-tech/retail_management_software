"use client";

import {
  ArrowLeftRight,
  BellRing,
  BarChart3,
  Boxes,
  Building2,
  Crown,
  LayoutDashboard,
  Package,
  ShoppingBasket,
  ReceiptText,
  HandCoins,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { BusinessRole } from "@/db/schema";
import { hasPermission, type Permission } from "@/modules/auth/permissions";

const navigation: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
}[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, permission: "dashboard:read" },
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: "pos:operate" },
  { href: "/sales", label: "Sales", icon: ReceiptText, permission: "sales:read" },
  { href: "/credit", label: "Credit", icon: HandCoins, permission: "credit:manage" },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory:read" },
  { href: "/alerts", label: "Alerts", icon: BellRing, permission: "inventory:read" },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingBasket, permission: "purchasing:read" },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "inventory:manage" },
  { href: "/products", label: "Products", icon: Package, permission: "product:manage" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "report:read" },
  { href: "/branches", label: "Branches", icon: Building2, permission: "branch:read" },
  { href: "/team", label: "Team", icon: Users, permission: "team:manage" },
  { href: "/audit", label: "Audit", icon: ShieldCheck, permission: "audit:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "business:manage" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  role,
  permissions,
  platformAdmin,
}: {
  role: BusinessRole;
  permissions: string[] | null;
  platformAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace navigation">
      {navigation
        .filter((item) => !item.permission || hasPermission(role, item.permission, permissions))
        .map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      {platformAdmin && (
        <Link
          href="/platform"
          aria-label="Platform"
          title="Platform"
          className={isActivePath(pathname, "/platform") ? "active" : undefined}
          aria-current={isActivePath(pathname, "/platform") ? "page" : undefined}
        >
          <Crown size={18} />
          <span>Platform</span>
        </Link>
      )}
    </nav>
  );
}
