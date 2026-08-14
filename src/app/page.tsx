import { redirect } from "next/navigation";
import { requireBusinessAccess } from "@/modules/auth/authorization";
import { landingPageForRole } from "@/modules/auth/permissions";

export default async function Home() {
  const access = await requireBusinessAccess();
  redirect(landingPageForRole(access.role));
}
