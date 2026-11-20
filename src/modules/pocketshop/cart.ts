import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { psCartItems, psCarts, psInventory, psProductImages, psProducts, psVariants } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { calculateCartTotals } from "./lib/commerce";

export const CART_COOKIE = "pocket_cart";

export async function getOrCreateCart(storeId: string, token: string) {
  const [existing] = await db.select().from(psCarts).where(and(eq(psCarts.storeId, storeId), eq(psCarts.token, token))).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(psCarts).values({ storeId, token }).onConflictDoNothing().returning();
  if (created) return created;
  const [retry] = await db.select().from(psCarts).where(and(eq(psCarts.storeId, storeId), eq(psCarts.token, token))).limit(1);
  return retry;
}

export type CartLine = {
  id: string; variantId: string; productId: string; productName: string; productSlug: string;
  variantName: string; imageUrl: string | null; quantity: number; unitPrice: bigint; available: number; lineTotal: bigint;
};

export async function getCart(storeId: string, token: string | undefined, currency: string) {
  if (!token) return { lines: [] as CartLine[], subtotal: 0n, total: 0n, depositAmount: 0n, count: 0 };
  const [cart] = await db.select().from(psCarts).where(and(eq(psCarts.storeId, storeId), eq(psCarts.token, token))).limit(1);
  if (!cart) return { lines: [] as CartLine[], subtotal: 0n, total: 0n, depositAmount: 0n, count: 0 };
  const rows = await db.select({
    itemId: psCartItems.id, quantity: psCartItems.quantity,
    variantId: psVariants.id, variantName: psVariants.name, variantValue: psVariants.value, variantActive: psVariants.active,
    variantPrice: psVariants.price, productId: psProducts.id, productName: psProducts.name, productSlug: psProducts.slug,
    productPrice: psProducts.price, productStatus: psProducts.status,
    available: psInventory.quantityOnHand,
  }).from(psCartItems)
    .innerJoin(psVariants, eq(psVariants.id, psCartItems.variantId))
    .innerJoin(psProducts, eq(psProducts.id, psVariants.productId))
    .leftJoin(psInventory, eq(psInventory.variantId, psVariants.id))
    .where(and(eq(psCartItems.cartId, cart.id), eq(psProducts.storeId, storeId)))
    .orderBy(asc(psCartItems.createdAt));

  const ids = rows.map((row) => row.productId);
  const images = ids.length
    ? await db.select({ productId: psProductImages.productId, assetId: psProductImages.assetId }).from(psProductImages).where(inArray(psProductImages.productId, ids)).orderBy(asc(psProductImages.position))
    : [];
  const firstImage = new Map<string, string>();
  for (const image of images) if (!firstImage.has(image.productId)) firstImage.set(image.productId, `/api/pocketshop/assets/${image.assetId}`);

  const lines: CartLine[] = rows.map((row) => {
    const unitPrice = row.variantPrice ?? row.productPrice;
    return {
      id: row.itemId, variantId: row.variantId, productId: row.productId, productName: row.productName, productSlug: row.productSlug,
      variantName: [row.variantName, row.variantValue].filter((part) => part !== "Default").join(" · "),
      imageUrl: firstImage.get(row.productId) ?? null, quantity: row.quantity, unitPrice,
      available: row.productStatus === "ACTIVE" && row.variantActive ? (row.available ?? 0) : 0,
      lineTotal: unitPrice * BigInt(row.quantity),
    };
  });
  const totals = calculateCartTotals(lines.map((line) => ({ quantity: line.quantity, unitPrice: line.unitPrice })));
  return { lines, ...totals, count: lines.reduce((sum, line) => sum + line.quantity, 0), currency };
}

export async function addCartItem(storeId: string, token: string, variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new ApplicationError("Choose a valid quantity.", "INVALID_QUANTITY");
  const [variant] = await db.select({ id: psVariants.id, active: psVariants.active, storeId: psVariants.storeId }).from(psVariants)
    .where(and(eq(psVariants.id, variantId), eq(psVariants.storeId, storeId))).limit(1);
  if (!variant?.active) throw new ApplicationError("This variant is not available.", "VARIANT_UNAVAILABLE", 404);
  const cart = await getOrCreateCart(storeId, token);
  await db.insert(psCartItems).values({ cartId: cart.id, variantId, quantity })
    .onConflictDoUpdate({ target: [psCartItems.cartId, psCartItems.variantId], set: { quantity: sqlQuantity(quantity) } });
}

function sqlQuantity(quantity: number) {
  // Avoids accepting a race-inflated quantity: additions replace, never accumulate unbounded.
  return Math.min(quantity, 999);
}

export async function updateCartItem(storeId: string, token: string, itemId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) throw new ApplicationError("Choose a valid quantity.", "INVALID_QUANTITY");
  const [cart] = await db.select().from(psCarts).where(and(eq(psCarts.storeId, storeId), eq(psCarts.token, token))).limit(1);
  if (!cart) return;
  if (quantity === 0) {
    await db.delete(psCartItems).where(and(eq(psCartItems.id, itemId), eq(psCartItems.cartId, cart.id)));
    return;
  }
  await db.update(psCartItems).set({ quantity }).where(and(eq(psCartItems.id, itemId), eq(psCartItems.cartId, cart.id)));
}

export async function clearCart(cartId: string) {
  await db.delete(psCartItems).where(eq(psCartItems.cartId, cartId));
}
