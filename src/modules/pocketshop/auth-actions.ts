"use server";

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

function uniqueSlug(base: string, suffix: number) {
  const candidate = suffix === 1 ? base : `${base.slice(0, 55)}-${suffix}`;
  return isValidSlug(candidate) ? candidate : `${slugify(candidate) || "shop"}-${suffix}`;
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

  const passwordHash = await hashPassword(data.password);
  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ name: data.fullName, email, passwordHash }).returning({ id: users.id });
      const [business] = await tx.insert(businesses).values({ name: data.storeName, currency: "NGN", email, phone: data.phone }).returning({ id: businesses.id });
      await tx.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: "OWNER" });

      let slug = uniqueSlug(slugify(data.storeName) || "my-shop", 1);
      for (let suffix = 2; suffix < 100; suffix += 1) {
        const [taken] = await tx.select({ id: psStores.id }).from(psStores).where(eq(psStores.slug, slug)).limit(1);
        if (!taken) break;
        slug = uniqueSlug(slugify(data.storeName) || "my-shop", suffix);
      }
      const [store] = await tx.insert(psStores).values({
        businessId: business.id, ownerUserId: user.id, name: data.storeName, slug,
        phone: data.phone, email, country: "Nigeria", onboardingStep: 1,
      }).returning({ id: psStores.id });
      await tx.insert(psStoreSettings).values({ storeId: store.id, businessId: business.id });
      return user.id;
    });
  } catch (error) {
    const code = databaseErrorCode(error);
    const constraint = databaseConstraint(error);
    if (code === "23505" && constraint === "users_email_uq") return { error: "An account with this email already exists. Sign in instead." };
    if (isDatabaseUnavailable(error)) return { error: "The database is temporarily unavailable. Please try again." };
    console.error(JSON.stringify({ event: "pocketshop_register_failed", code, constraint }));
    return { error: "We could not create your store. Please try again." };
  }

  await createSession(userId);
  redirect("/pocketshop/onboarding");
}

