import "server-only";

import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/db/client";
import { psStores, psStoreSettings } from "@/db/schema";
import { requireBusinessAccess } from "@/modules/auth/authorization";

/** Verifies the live session, tenant membership and store ownership on every call. */
export async function requirePocketStore() {
  const access = await requireBusinessAccess();
  const [store] = await db.select().from(psStores).where(eq(psStores.businessId, access.business.id)).limit(1);
  if (!store) redirect("/pocketshop/onboarding");
  const [settings] = await db.select().from(psStoreSettings).where(and(eq(psStoreSettings.storeId, store.id), eq(psStoreSettings.businessId, access.business.id))).limit(1);
  if (!settings) redirect("/pocketshop/onboarding");
  return { ...access, store, settings };
}

/** Used by the login action only: lets PocketShop-only accounts land in their own app. */
export async function findPocketStoreForBusiness(businessId: string) {
  const [store] = await db.select({ id: psStores.id }).from(psStores).where(eq(psStores.businessId, businessId)).limit(1);
  return store ?? null;
}

export async function getPublishedStore(slug: string) {
  const [store] = await db.select().from(psStores).where(and(eq(psStores.slug, slug), eq(psStores.published, true))).limit(1);
  if (!store) notFound();
  const [settings] = await db.select().from(psStoreSettings).where(eq(psStoreSettings.storeId, store.id)).limit(1);
  if (!settings) notFound();
  return { store, settings };
}
