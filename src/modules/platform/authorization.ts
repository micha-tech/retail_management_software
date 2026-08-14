import "server-only";

import { notFound } from "next/navigation";

import { normalizeEmail } from "@/lib/utils";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";

function configuredPlatformAdmins() {
  return new Set((process.env.PLATFORM_ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean));
}

export function isPlatformAdminEmail(email: string) {
  return configuredPlatformAdmins().has(normalizeEmail(email));
}

export async function requirePlatformAdmin() {
  const user = await requireAuthenticatedUser();
  if (!isPlatformAdminEmail(user.email)) notFound();
  return user;
}
