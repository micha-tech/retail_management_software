import { AppShell } from "@/components/layout/app-shell";
import { ConnectivityStatus } from "@/components/layout/connectivity-status";
import { requireBusinessAccess } from "@/modules/auth/authorization";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, business, role, permissions } = await requireBusinessAccess();
  if (user.mustChangePassword) redirect("/change-password");
  return <AppShell user={user} business={business} role={role} permissions={permissions}><ConnectivityStatus/>{children}</AppShell>;
}
