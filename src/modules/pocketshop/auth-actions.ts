"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { businessMemberships, businesses, psStores, psStoreSettings, users } from "@/db/schema";
import { databaseConstraint, databaseErrorCode, isDatabaseUnavailable } from "@/lib/database-errors";
import { hashPassword } from "@/modules/auth/password";
import { createSession } from "@/modules/auth/session";
import { normalizeEmail } from "@/lib/utils";
import { clientKey, consumeRateLimit } from "./rate-limit";
import { pocketRegisterSchema, type PocketActionState } from "./schemas";
import { isValidSlug, slugify } from "./lib/slugs";

const SLUG_BATCH_SIZE = 200;
const SLUG_BATCHES = 3;

function uniqueSlug(base: string, suffix: number) {
  if (suffix === 1 && isValidSlug(base)) return base;
  const maxBaseLength = 60 - String(suffix).length - 1;
  const candidate = `${base.slice(0, maxBaseLength).replace(/-+$/, "")}-${suffix}`;
  return isValidSlug(candidate) ? candidate : `shop-${suffix}`;
}

function randomSlug(base: string) {
  return `${base.slice(0, 49).replace(/-+$/, "")}-${randomUUID().slice(0, 10)}`;
}

export async function registerPocketShopAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const parsed = pocketRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const email = normalizeEmail(data.email);
  const requestHeaders = await headers();
  if (!await consumeRateLimit(clientKey(requestHeaders, "ps-register"), 5, 60 * 60 * 1000)) {
    return { error: "Too many stores created from this network. Try again later." };
  }

  let userId: string | undefined;
  try {
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) return { error: "An account with this email already exists. Sign in instead." };

    const passwordHash = await hashPassword(data.password);
    const baseSlug = slugify(data.storeName) || "my-shop";

    const createStore = (startSuffix: number) =>
      db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ name: data.fullName, email, passwordHash }).returning({ id: users.id });
        const [business] = await tx.insert(businesses).values({ name: data.storeName, currency: "NGN", email, phone: data.phone }).returning({ id: businesses.id });
        await tx.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: "OWNER" });

        let slug = "";
        for (let offset = 0; offset < SLUG_BATCH_SIZE; offset += 1) {
          const suffix = startSuffix + offset;
          const candidate = offset === SLUG_BATCH_SIZE - 1 ? randomSlug(baseSlug) : uniqueSlug(baseSlug, suffix);
          const [taken] = await tx.select({ id: psStores.id }).from(psStores).where(eq(psStores.slug, candidate)).limit(1);
          if (!taken) {
            slug = candidate;
            break;
          }
        }
        if (!slug) throw new Error("Store URL allocation failed");

        const [store] = await tx.insert(psStores).values({
          businessId: business.id, ownerUserId: user.id, name: data.storeName, slug,
          phone: data.phone, email, country: "Nigeria", onboardingStep: 1,
        }).returning({ id: psStores.id });
        await tx.insert(psStoreSettings).values({ storeId: store.id, businessId: business.id });
        return user.id;
      });

    for (let batch = 0; batch < SLUG_BATCHES; batch += 1) {
      try {
        userId = await createStore(1 + batch * SLUG_BATCH_SIZE);
        break;
      } catch (error) {
        const code = databaseErrorCode(error);
        const constraint = databaseConstraint(error);
        if (code === "23505" && constraint === "ps_stores_slug_uq" && batch < SLUG_BATCHES - 1) continue;
        throw error;
      }
    }
    if (!userId) return { error: "That store URL is unavailable. Try a different store name." };
  } catch (error) {
    const code = databaseErrorCode(error);
    const constraint = databaseConstraint(error);
    if (code === "23505" && constraint === "users_email_uq") return { error: "An account with this email already exists. Sign in instead." };
    if (code === "23505" && constraint === "ps_stores_slug_uq") return { error: "That store URL is unavailable. Try a different store name." };
    if (isDatabaseUnavailable(error)) return { error: "The database is temporarily unavailable. Please try again." };
    console.error(JSON.stringify({ event: "pocketshop_register_failed", code, constraint }));
    return { error: "We could not create your store. Please try again." };
  }

  await createSession(userId);
  redirect("/pocketshop/onboarding");
}

