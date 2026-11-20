import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { PsNav } from "@/components/pocketshop/ps-nav";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { logoutAction } from "@/modules/auth/actions";
import "../../pocketshop.css";

export const dynamic = "force-dynamic";

export default async function PocketShopAppLayout({ children }: { children: React.ReactNode }) {
  const { store, user } = await requirePocketStore();
  return (
    <div className="ps-app">
      <div className="ps-shell">
        <aside className="ps-sidebar">
          <Link href="/pocketshop/dashboard" className="ps-logo"><span className="ps-logo-mark">P</span><span>PocketShop</span></Link>
          <div className="ps-store-chip"><small>Your store</small><strong>{store.name}</strong></div>
          <PsNav />
          <div className="ps-sidebar-footer">
            <div style={{ display: "grid", gap: 6 }}>
              <a href={`/store/${store.slug}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6 }}>View storefront <ExternalLink size={12} /></a>
              <Link href="/overview">Back to Zyphr Logic</Link>
              <span>{user.name}</span>
              <form action={logoutAction}><button type="submit" style={{ border: 0, background: "none", padding: 0, color: "inherit", fontSize: "inherit", textAlign: "left" }}>Sign out</button></form>
            </div>
          </div>
        </aside>
        <div className="ps-main">{children}</div>
      </div>
    </div>
  );
}
