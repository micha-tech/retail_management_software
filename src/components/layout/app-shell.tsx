import { ArrowLeftRight, BarChart3, Boxes, Building2, LayoutDashboard, LogOut, Package, ReceiptText, Settings, ShieldCheck, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";

import type { BusinessRole } from "@/db/schema";
import { logoutAction } from "@/modules/auth/actions";
import { hasPermission, landingPageForRole, type Permission } from "@/modules/auth/permissions";

const nav: { href: string; label: string; icon: typeof LayoutDashboard; permission?: Permission }[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, permission: "dashboard:read" },
  { href: "/pos", label: "POS", icon: ShoppingCart, permission: "pos:operate" },
  { href: "/sales", label: "Sales", icon: ReceiptText, permission: "sales:read" },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory:read" },
  { href: "/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "inventory:manage" },
  { href: "/products", label: "Products", icon: Package, permission: "product:manage" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "report:read" },
  { href: "/branches", label: "Branches", icon: Building2, permission: "branch:read" },
  { href: "/team", label: "Team", icon: Users, permission: "team:manage" },
  { href: "/audit", label: "Audit", icon: ShieldCheck, permission: "audit:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "business:manage" },
];

export function AppShell({ children, user, business, role }: { children: React.ReactNode; user: { name: string; email: string }; business: { name: string }; role: BusinessRole }) {
  const landingPage = landingPageForRole(role);
  return <div className="app-shell"><aside><Link href={landingPage} className="brand"><span>R</span> Relay Retail</Link><div className="business-switch"><small>Workspace</small><strong>{business.name}</strong></div><nav>{nav.filter((item) => !item.permission || hasPermission(role, item.permission)).map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href}><Icon size={18}/><span>{item.label}</span></Link>; })}</nav><div className="account"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><small>{role.replaceAll("_", " ")}</small></div><form action={logoutAction}><button title="Sign out"><LogOut size={17}/></button></form></div></aside><div className="workspace">{children}</div></div>;
}
