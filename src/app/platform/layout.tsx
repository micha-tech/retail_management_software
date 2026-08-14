import { Crown, LogOut, Store } from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/modules/auth/actions";
import { requirePlatformAdmin } from "@/modules/platform/authorization";

export default async function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePlatformAdmin();
  return <div className="platform-shell"><header className="platform-header"><Link href="/platform" className="brand"><span>R</span> Relay Retail</Link><div className="platform-title"><Crown size={17}/><strong>Platform management</strong></div><div className="platform-account"><span>{user.name}<small>{user.email}</small></span><Link className="button secondary inline-button" href="/"><Store size={16}/> Retail workspace</Link><form action={logoutAction}><button className="icon-button" title="Sign out"><LogOut size={16}/></button></form></div></header>{children}</div>;
}
