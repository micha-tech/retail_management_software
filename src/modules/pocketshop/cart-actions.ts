"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApplicationError } from "@/lib/errors";
import { getPublishedStore } from "./authorization";
import { addCartItem, CART_COOKIE, updateCartItem } from "./cart";
import { placeOrder } from "./checkout";
import { releaseExpiredReservations } from "./inventory";
import { createOpaqueToken } from "./lib/commerce";
import { clientKey, consumeRateLimit } from "./rate-limit";
import { ORDER_COOKIE } from "./lib/constants";
import { checkoutSchema, type PocketActionState } from "./schemas";

async function currentCartToken() {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{20,100}$/.test(existing)) return existing;
  const token = randomBytes(24).toString("base64url");
  jar.set(CART_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

function storePath(slug: string) {
  return `/store/${slug}`;
}

export async function addToCartAction(formData: FormData) {
  const slug = String(formData.get("storeSlug") || "");
  const { store } = await getPublishedStore(slug);
  const variantId = String(formData.get("variantId") || "");
  const quantity = Number(formData.get("quantity") || 1);
  const token = await currentCartToken();
  try {
    await addCartItem(store.id, token, variantId, quantity);
    revalidatePath(storePath(slug));
    redirect(`${storePath(slug)}/cart?added=1`);
  } catch (error) {
    const message = error instanceof ApplicationError ? error.message : "This item could not be added.";
    redirect(`${storePath(slug)}?error=${encodeURIComponent(message)}`);
  }
}

export async function updateCartAction(formData: FormData) {
  const slug = String(formData.get("storeSlug") || "");
  const { store } = await getPublishedStore(slug);
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (token) await updateCartItem(store.id, token, String(formData.get("itemId") || ""), Number(formData.get("quantity") || 0));
  revalidatePath(`${storePath(slug)}/cart`);
  revalidatePath(storePath(slug));
}

export async function checkoutAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const slug = String(formData.get("storeSlug") || "");
  const { store, settings } = await getPublishedStore(slug);
  const parsed = checkoutSchema.safeParse({
    customerName: formData.get("customerName"), customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail") || "", deliveryMethod: formData.get("deliveryMethod"),
    deliveryZoneId: formData.get("deliveryZoneId") || undefined, address: formData.get("address") || "",
    city: formData.get("city") || "", state: formData.get("state") || "",
    deliveryInstructions: formData.get("deliveryInstructions") || "",
    paymentMethod: formData.get("paymentMethod"), idempotencyKey: formData.get("idempotencyKey"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const requestHeaders = await headers();
  if (!await consumeRateLimit(clientKey(requestHeaders, `ps-checkout-${store.id}`), 20, 60 * 60 * 1000)) {
    return { error: "Too many checkout attempts. Please try again later." };
  }
  const jar = await cookies();
  const cartToken = jar.get(CART_COOKIE)?.value;
  if (!cartToken) return { error: "Your cart session expired. Refresh the page and try again." };
  const accessToken = createOpaqueToken();

  try {
    await releaseExpiredReservations();
    const result = await placeOrder({
      storeId: store.id, businessId: store.businessId, currency: store.currency,
      settings: {
        paymentMethods: settings.paymentMethods, paymentTiming: settings.paymentTiming,
        depositPercent: settings.depositPercent, deliveryEnabled: settings.deliveryEnabled,
        pickupEnabled: settings.pickupEnabled, codEnabled: settings.codEnabled,
      },
      cartToken, idempotencyKey: parsed.data.idempotencyKey, accessToken,
      customerName: parsed.data.customerName, customerPhone: parsed.data.customerPhone,
      customerEmail: parsed.data.customerEmail || null, deliveryMethod: parsed.data.deliveryMethod,
      deliveryZoneId: parsed.data.deliveryZoneId || null, address: parsed.data.address,
      city: parsed.data.city, state: parsed.data.state,
      deliveryInstructions: parsed.data.deliveryInstructions, paymentMethod: parsed.data.paymentMethod,
    });
    jar.set(ORDER_COOKIE, accessToken, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    revalidatePath(storePath(slug));
    if (result.gatewayUrl) redirect(result.gatewayUrl);
    redirect(`${storePath(slug)}/track/${result.reference}?token=${accessToken}&placed=1`);
  } catch (error) {
    return { error: error instanceof ApplicationError ? error.message : "Checkout could not be completed. Please review your cart and try again." };
  }
}
