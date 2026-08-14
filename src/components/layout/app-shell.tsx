import { LogOut } from "lucide-react";
import Link from "next/link";

import type { BusinessRole } from "@/db/schema";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { logoutAction } from "@/modules/auth/actions";
import { landingPageForAccess } from "@/modules/auth/permissions";

export function AppShell({ children, user, business, role, permissions, platformAdmin = false }: { children: React.ReactNode; user: { name: string; email: string }; business: { name: string }; role: BusinessRole; permissions: string[] | null; platformAdmin?: boolean }) {
  const landingPage = landingPageForAccess(role, permissions);
  return <div className="app-shell"><aside><Link href={landingPage} className="brand"><span>R</span> Relay Retail</Link><div className="business-switch"><small>Workspace</small><strong>{business.name}</strong></div><SidebarNav role={role} permissions={permissions} platformAdmin={platformAdmin}/><div className="account"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><small>{role === "STOREKEEPER" ? "INVENTORY MANAGER" : role.replaceAll("_", " ")}</small></div><form action={logoutAction}><button title="Sign out"><LogOut size={17}/></button></form></div></aside><div className="workspace">{children}</div></div>;
}
