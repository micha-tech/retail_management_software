"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { businesses, paymentBanks, psCategories, psDeliveryZones, psProducts, psStores, psStoreSettings } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { isPaystackConfigured } from "./payments";
import { requirePocketStore } from "./authorization";
import { deliveryZoneSchema, paymentConfigSchema, storeBusinessSchema, storeIdentitySchema, storePreferencesSchema } from "./schemas";
import type { PocketActionState } from "./schemas";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function jsonRecord(value: FormDataEntryValue | null): Record<string, string> {
  if (!value || String(value).trim() === "") return {};
  const parsed: unknown = JSON.parse(String(value));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Expected a JSON object.");
  return Object.fromEntries(Object.entries(parsed).filter(([, item]) => typeof item === "string").map(([key, item]) => [key, String(item).slice(0, 200)]));
}

export async function saveStoreIdentityAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = storeIdentitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const [taken] = await db.select({ id: psStores.id }).from(psStores).where(and(eq(psStores.slug, parsed.data.slug), ne(psStores.id, store.id))).limit(1);
  if (taken) return { fieldErrors: { slug: ["That store URL is already in use."] } };

  await db.transaction(async (tx) => {
    await tx.update(psStores).set({
      name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description,
      category: parsed.data.category, logoUrl: parsed.data.logoUrl || null, bannerUrl: parsed.data.bannerUrl || null,
      onboardingStep: Math.max(store.onboardingStep, 2), updatedAt: new Date(),
    }).where(and(eq(psStores.id, store.id), eq(psStores.businessId, business.id)));
    await tx.update(businesses).set({ name: parsed.data.name }).where(eq(businesses.id, business.id));
  });
  revalidatePath("/pocketshop/onboarding");
  redirect("/pocketshop/onboarding?step=2");
}

export async function saveStoreBusinessAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = storeBusinessSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await db.update(psStores).set({
    phone: parsed.data.phone, email: parsed.data.email || null, address: parsed.data.address,
    state: parsed.data.state, city: parsed.data.city, country: parsed.data.country,
    whatsapp: parsed.data.whatsapp || null, onboardingStep: Math.max(store.onboardingStep, 3), updatedAt: new Date(),
  }).where(and(eq(psStores.id, store.id), eq(psStores.businessId, business.id)));
  await db.update(businesses).set({ phone: parsed.data.phone, email: parsed.data.email || null }).where(eq(businesses.id, business.id));
  revalidatePath("/pocketshop/onboarding");
  redirect("/pocketshop/onboarding?step=3");
}

export async function saveStorePreferencesAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = storePreferencesSchema.safeParse({
    currency: formData.get("currency"), timezone: formData.get("timezone"),
    deliveryEnabled: formData.get("deliveryEnabled") === "on", pickupEnabled: formData.get("pickupEnabled") === "on",
    notifyEmail: formData.get("notifyEmail") === "on", deliveryNote: formData.get("deliveryNote"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await db.transaction(async (tx) => {
    await tx.update(psStores).set({ currency: parsed.data.currency, timezone: parsed.data.timezone, onboardingStep: Math.max(store.onboardingStep, 4), updatedAt: new Date() }).where(and(eq(psStores.id, store.id), eq(psStores.businessId, business.id)));
    await tx.update(businesses).set({ currency: parsed.data.currency, timezone: parsed.data.timezone }).where(eq(businesses.id, business.id));
    await tx.update(psStoreSettings).set({
      deliveryEnabled: parsed.data.deliveryEnabled, pickupEnabled: parsed.data.pickupEnabled,
      notifyEmail: parsed.data.notifyEmail, deliveryNote: parsed.data.deliveryNote, updatedAt: new Date(),
    }).where(and(eq(psStoreSettings.storeId, store.id), eq(psStoreSettings.businessId, business.id)));
  });
  revalidatePath("/pocketshop/onboarding");
  redirect("/pocketshop/onboarding?step=4");
}

export async function savePaymentConfigAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = paymentConfigSchema.safeParse({
    methods: formData.getAll("methods"), paymentTiming: formData.get("paymentTiming"),
    depositPercent: formData.get("depositPercent"), bankName: formData.get("bankName") ?? "",
    accountName: formData.get("accountName") ?? "", accountNumber: formData.get("accountNumber") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  if (data.methods.some((method) => method === "CARD" || method === "USSD") && !isPaystackConfigured()) {
    return { error: "Card and USSD payments require a configured payment gateway. They are not enabled yet." };
  }
  if (data.paymentTiming === "PARTIAL" && data.depositPercent === 0) return { error: "Set a deposit percentage above zero for partial payments." };
  if (data.methods.includes("BANK_TRANSFER") && (!data.bankName || !data.accountName || !/^\d{8,20}$/.test(data.accountNumber))) {
    return { error: "Add a bank name, account name and a valid account number for bank transfers." };
  }
  await db.transaction(async (tx) => {
    await tx.update(psStoreSettings).set({
      paymentMethods: data.methods, paymentTiming: data.paymentTiming,
      depositPercent: data.paymentTiming === "PARTIAL" ? data.depositPercent : 0,
      codEnabled: data.methods.includes("CASH_ON_DELIVERY"), updatedAt: new Date(),
    }).where(and(eq(psStoreSettings.storeId, store.id), eq(psStoreSettings.businessId, business.id)));
    if (data.bankName && data.accountName && data.accountNumber) {
      const [existing] = await tx.select({ id: paymentBanks.id }).from(paymentBanks)
        .where(and(eq(paymentBanks.businessId, business.id), eq(paymentBanks.accountNumber, data.accountNumber))).limit(1);
      if (existing) {
        await tx.update(paymentBanks).set({ bankName: data.bankName, accountName: data.accountName, active: true, updatedAt: new Date() }).where(eq(paymentBanks.id, existing.id));
      } else {
        await tx.insert(paymentBanks).values({ businessId: business.id, bankName: data.bankName, branchName: "Main", accountName: data.accountName, accountNumber: data.accountNumber });
      }
    }
    await tx.update(psStores).set({ onboardingStep: Math.max(store.onboardingStep, 5), updatedAt: new Date() }).where(eq(psStores.id, store.id));
  });
  revalidatePath("/pocketshop/onboarding");
  redirect("/pocketshop/onboarding?step=5");
}

export async function publishStoreAction() {
  const { store, business } = await requirePocketStore();
  if (!store.name || !store.phone || !store.currency || !store.slug) fail("/pocketshop/onboarding?step=5", "Complete your store name and contact details first.");
  const [activeProduct] = await db.select({ id: psProducts.id }).from(psProducts)
    .where(and(eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id), eq(psProducts.status, "ACTIVE"))).limit(1);
  await db.update(psStores).set({ published: true, onboardingStep: 5, updatedAt: new Date() }).where(and(eq(psStores.id, store.id), eq(psStores.businessId, business.id)));
  revalidatePath("/pocketshop/dashboard");
  revalidatePath(`/store/${store.slug}`);
  redirect(`/pocketshop/dashboard?published=1${activeProduct ? "" : "&hint=add-product"}`);
}

export async function updateStoreProfileAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const parsed = storeIdentitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/pocketshop/store", "Check the store details and try again.");
  const [taken] = await db.select({ id: psStores.id }).from(psStores).where(and(eq(psStores.slug, parsed.data.slug), ne(psStores.id, store.id))).limit(1);
  if (taken) fail("/pocketshop/store", "That store URL is already in use.");
  let hours: Record<string, string> = {};
  let socials: Record<string, string> = {};
  try { hours = jsonRecord(formData.get("openingHours")); socials = jsonRecord(formData.get("socialLinks")); }
  catch { fail("/pocketshop/store", "Opening hours and social links must be valid JSON objects."); }
  await db.transaction(async (tx) => {
    await tx.update(psStores).set({
      name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description, category: parsed.data.category,
      logoUrl: parsed.data.logoUrl || null, bannerUrl: parsed.data.bannerUrl || null,
      phone: String(formData.get("phone") || "").slice(0, 30), email: String(formData.get("email") || "").slice(0, 254) || null,
      whatsapp: String(formData.get("whatsapp") || "").slice(0, 30) || null,
      address: String(formData.get("address") || "").slice(0, 300), state: String(formData.get("state") || "").slice(0, 80),
      city: String(formData.get("city") || "").slice(0, 80), country: String(formData.get("country") || "").slice(0, 80),
      published: formData.get("published") === "on", openingHours: hours, socialLinks: socials, updatedAt: new Date(),
    }).where(and(eq(psStores.id, store.id), eq(psStores.businessId, business.id)));
    await tx.update(businesses).set({ name: parsed.data.name }).where(eq(businesses.id, business.id));
  });
  revalidatePath("/pocketshop/store");
  revalidatePath(`/store/${parsed.data.slug}`);
  redirect("/pocketshop/store?saved=1");
}

export async function createCategoryAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const name = String(formData.get("name") || "").trim().slice(0, 80);
  if (name.length < 2) fail("/pocketshop/products", "Enter a category name.");
  await db.insert(psCategories).values({ storeId: store.id, businessId: business.id, name }).onConflictDoNothing();
  revalidatePath("/pocketshop/products");
  redirect("/pocketshop/products?categorySaved=1");
}

export async function toggleCategoryAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const id = String(formData.get("categoryId") || "");
  if (!id) return;
  const [category] = await db.select().from(psCategories).where(and(eq(psCategories.id, id), eq(psCategories.storeId, store.id), eq(psCategories.businessId, business.id))).limit(1);
  if (!category) return;
  await db.update(psCategories).set({ active: !category.active, updatedAt: new Date() }).where(eq(psCategories.id, category.id));
  revalidatePath("/pocketshop/products");
}

export async function saveDeliveryZoneAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = deliveryZoneSchema.safeParse({
    zoneId: formData.get("zoneId") || undefined, name: formData.get("name"), description: formData.get("description"),
    fee: formData.get("fee"), estimatedDays: formData.get("estimatedDays"), active: formData.get("active") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const fee = parseMoney(d.fee);
  if (d.zoneId) {
    const [zone] = await db.select().from(psDeliveryZones).where(and(eq(psDeliveryZones.id, d.zoneId), eq(psDeliveryZones.storeId, store.id), eq(psDeliveryZones.businessId, business.id))).limit(1);
    if (!zone) return { error: "Delivery zone not found." };
    await db.update(psDeliveryZones).set({ name: d.name, description: d.description, fee, estimatedDays: d.estimatedDays, active: d.active, updatedAt: new Date() }).where(eq(psDeliveryZones.id, zone.id));
  } else {
    await db.insert(psDeliveryZones).values({ storeId: store.id, businessId: business.id, name: d.name, description: d.description, fee, estimatedDays: d.estimatedDays, active: d.active }).onConflictDoNothing();
  }
  revalidatePath("/pocketshop/deliveries");
  redirect("/pocketshop/deliveries?saved=1");
}

export async function deleteDeliveryZoneAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const id = String(formData.get("zoneId") || "");
  await db.delete(psDeliveryZones).where(and(eq(psDeliveryZones.id, id), eq(psDeliveryZones.storeId, store.id), eq(psDeliveryZones.businessId, business.id)));
  revalidatePath("/pocketshop/deliveries");
}
