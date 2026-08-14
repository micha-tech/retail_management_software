import { redirect } from "next/navigation";
import { requireBusinessAccess } from "@/modules/auth/authorization";
import { landingPageForAccess } from "@/modules/auth/permissions";

export default async function Home() {
  const access = await requireBusinessAccess();
  redirect(landingPageForAccess(access.role, access.permissions));
}
