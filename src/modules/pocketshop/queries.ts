import "server-only";

import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import {
  psCategories, psCustomers, psDeliveryZones, psInventory, psInventoryMovements, psOrderEvents,
  psOrders, psOrderItems, psPayments, psProductImages, psProducts, psStores, psVariants,
} from "@/db/schema";

type Filters = { q?: string; status?: string; categoryId?: string };

export async function getVendorDashboard(storeId: string, businessId: string) {
  const storeFilter = and(eq(psOrders.storeId, storeId), eq(psOrders.businessId, businessId));
  const [[orderCount], [revenue], [pendingCount], [productCount], [lowStock], recentOrders, recentEvents] = await Promise.all([
    db.select({ value: count() }).from(psOrders).where(storeFilter),
    db.select({ value: sql<string>`coalesce(sum(${psOrders.total}), 0)` }).from(psOrders).where(and(storeFilter, eq(psOrders.paymentStatus, "PAID"))),
    db.select({ value: count() }).from(psOrders).where(and(storeFilter, eq(psOrders.fulfilmentStatus, "PENDING_PAYMENT"))),
    db.select({ value: count() }).from(psProducts).where(and(eq(psProducts.storeId, storeId), eq(psProducts.businessId, businessId), eq(psProducts.status, "ACTIVE"))),
    db.select({ value: count() }).from(psInventory)
      .innerJoin(psProducts, eq(psProducts.id, psInventory.productId))
      .where(and(eq(psInventory.storeId, storeId), sql`${psInventory.quantityOnHand} <= ${psProducts.lowStockThreshold}`)),
    db.select().from(psOrders).where(storeFilter).orderBy(desc(psOrders.createdAt)).limit(6),
    db.select({ event: psOrderEvents, reference: psOrders.reference }).from(psOrderEvents)
      .innerJoin(psOrders, eq(psOrders.id, psOrderEvents.orderId))
      .where(eq(psOrders.storeId, storeId)).orderBy(desc(psOrderEvents.createdAt)).limit(6),
  ]);
  return {
    orders: orderCount.value,
    revenue: BigInt(revenue.value ?? "0"),
    pending: pendingCount.value,
    products: productCount.value,
    lowStock: lowStock.value,
    recentOrders,
    recentEvents,
  };
}

export async function getVendorProducts(storeId: string, businessId: string, filters: Filters = {}) {
  const conditions: SQL[] = [eq(psProducts.storeId, storeId), eq(psProducts.businessId, businessId)];
  if (filters.status) conditions.push(eq(psProducts.status, filters.status as "DRAFT" | "ACTIVE" | "ARCHIVED"));
  if (filters.categoryId) conditions.push(eq(psProducts.categoryId, filters.categoryId));
  if (filters.q) conditions.push(or(ilike(psProducts.name, `%${filters.q}%`), ilike(psProducts.sku, `%${filters.q}%`))!);
  const rows = await db.select({
    product: psProducts,
    categoryName: psCategories.name,
    stock: sql<number>`coalesce(sum(${psInventory.quantityOnHand}), 0)::int`,
    variants: sql<number>`count(distinct ${psVariants.id})::int`,
  }).from(psProducts)
    .leftJoin(psCategories, eq(psCategories.id, psProducts.categoryId))
    .leftJoin(psVariants, eq(psVariants.productId, psProducts.id))
    .leftJoin(psInventory, eq(psInventory.variantId, psVariants.id))
    .where(and(...conditions))
    .groupBy(psProducts.id, psCategories.name)
    .orderBy(desc(psProducts.createdAt));
  const ids = rows.map((row) => row.product.id);
  const images = ids.length ? await db.select({ productId: psProductImages.productId, assetId: psProductImages.assetId })
    .from(psProductImages).where(inArray(psProductImages.productId, ids)).orderBy(asc(psProductImages.position)) : [];
  const first = new Map<string, string>();
  for (const image of images) if (!first.has(image.productId)) first.set(image.productId, `/api/pocketshop/assets/${image.assetId}`);
  return rows.map((row) => ({ ...row, imageUrl: first.get(row.product.id) ?? null }));
}

export async function getProductForEdit(storeId: string, businessId: string, id: string) {
  const [product] = await db.select().from(psProducts)
    .where(and(eq(psProducts.id, id), eq(psProducts.storeId, storeId), eq(psProducts.businessId, businessId))).limit(1);
  if (!product) return null;
  const [variants, images, inventory, categories] = await Promise.all([
    db.select().from(psVariants).where(eq(psVariants.productId, id)).orderBy(asc(psVariants.createdAt)),
    db.select().from(psProductImages).where(eq(psProductImages.productId, id)).orderBy(asc(psProductImages.position)),
    db.select().from(psInventory).where(eq(psInventory.productId, id)),
    db.select().from(psCategories).where(and(eq(psCategories.storeId, storeId), eq(psCategories.active, true))).orderBy(asc(psCategories.name)),
  ]);
  const stockByVariant = new Map(inventory.map((row) => [row.variantId, row.quantityOnHand]));
  return {
    product, categories,
    variants: variants.map((variant) => ({
      id: variant.id, name: variant.name, value: variant.value, sku: variant.sku,
      price: (variant.price ?? product.price / 1n).toString(), active: variant.active,
      quantity: stockByVariant.get(variant.id) ?? 0,
    })).map((variant) => ({ ...variant, price: variant.price === "" ? "" : (Number(variant.price) / 100).toFixed(2) })),
    images: images.map((image) => `/api/pocketshop/assets/${image.assetId}`),
  };
}

export async function getVendorInventory(storeId: string, businessId: string, q?: string) {
  const conditions: SQL[] = [eq(psInventory.storeId, storeId), eq(psInventory.businessId, businessId)];
  if (q) conditions.push(or(ilike(psProducts.name, `%${q}%`), ilike(psProducts.sku, `%${q}%`), ilike(psVariants.sku, `%${q}%`))!);
  return db.select({
    inventory: psInventory, product: psProducts, variant: psVariants,
  }).from(psInventory)
    .innerJoin(psProducts, eq(psProducts.id, psInventory.productId))
    .innerJoin(psVariants, eq(psVariants.id, psInventory.variantId))
    .where(and(...conditions)).orderBy(asc(psProducts.name), asc(psVariants.name));
}

export async function getInventoryMovements(storeId: string, businessId: string, limit = 30) {
  return db.select({ movement: psInventoryMovements, productName: psProducts.name, variantName: psVariants.name })
    .from(psInventoryMovements)
    .innerJoin(psProducts, eq(psProducts.id, psInventoryMovements.productId))
    .innerJoin(psVariants, eq(psVariants.id, psInventoryMovements.variantId))
    .where(and(eq(psInventoryMovements.storeId, storeId), eq(psInventoryMovements.businessId, businessId)))
    .orderBy(desc(psInventoryMovements.createdAt)).limit(limit);
}

export async function getVendorOrders(storeId: string, businessId: string, status?: string, q?: string) {
  const conditions: SQL[] = [eq(psOrders.storeId, storeId), eq(psOrders.businessId, businessId)];
  if (status) conditions.push(eq(psOrders.fulfilmentStatus, status as typeof psOrders.$inferSelect["fulfilmentStatus"]));
  if (q) conditions.push(or(ilike(psOrders.reference, `%${q}%`), ilike(psOrders.customerName, `%${q}%`), ilike(psOrders.customerPhone, `%${q}%`))!);
  return db.select().from(psOrders).where(and(...conditions)).orderBy(desc(psOrders.createdAt)).limit(200);
}

export async function getOrderDetail(storeId: string, businessId: string, id: string) {
  const [order] = await db.select().from(psOrders)
    .where(and(eq(psOrders.id, id), eq(psOrders.storeId, storeId), eq(psOrders.businessId, businessId))).limit(1);
  if (!order) return null;
  const [items, events, payments] = await Promise.all([
    db.select().from(psOrderItems).where(eq(psOrderItems.orderId, order.id)),
    db.select().from(psOrderEvents).where(eq(psOrderEvents.orderId, order.id)).orderBy(desc(psOrderEvents.createdAt)),
    db.select().from(psPayments).where(eq(psPayments.orderId, order.id)).orderBy(desc(psPayments.createdAt)),
  ]);
  return { order, items, events, payments };
}

export async function getVendorCustomers(storeId: string, businessId: string, q?: string) {
  const conditions: SQL[] = [eq(psCustomers.storeId, storeId), eq(psCustomers.businessId, businessId)];
  if (q) conditions.push(or(ilike(psCustomers.name, `%${q}%`), ilike(psCustomers.phone, `%${q}%`), ilike(psCustomers.email, `%${q}%`))!);
  const customers = await db.select().from(psCustomers).where(and(...conditions)).orderBy(desc(psCustomers.createdAt)).limit(200);
  const orders = await db.select({ customerId: psOrders.customerId, total: psOrders.total, createdAt: psOrders.createdAt })
    .from(psOrders).where(and(eq(psOrders.storeId, storeId), eq(psOrders.businessId, businessId)));
  return customers.map((customer) => {
    const own = orders.filter((order) => order.customerId === customer.id);
    return {
      customer,
      orderCount: own.length,
      totalSpent: own.reduce((sum, order) => sum + order.total, 0n),
      lastPurchase: own.reduce<Date | null>((latest, order) => !latest || order.createdAt > latest ? order.createdAt : latest, null),
    };
  });
}

export async function getVendorPayments(storeId: string, businessId: string) {
  return db.select({ payment: psPayments, order: psOrders }).from(psPayments)
    .innerJoin(psOrders, eq(psOrders.id, psPayments.orderId))
    .where(and(eq(psPayments.storeId, storeId), eq(psOrders.businessId, businessId)))
    .orderBy(desc(psPayments.createdAt)).limit(200);
}

export async function getDeliveryZones(storeId: string, businessId: string) {
  return db.select().from(psDeliveryZones)
    .where(and(eq(psDeliveryZones.storeId, storeId), eq(psDeliveryZones.businessId, businessId)))
    .orderBy(asc(psDeliveryZones.name));
}

export async function getStorefrontData(storeId: string, categoryId?: string, q?: string) {
  const conditions: SQL[] = [eq(psProducts.storeId, storeId), eq(psProducts.status, "ACTIVE")];
  if (categoryId) conditions.push(eq(psProducts.categoryId, categoryId));
  if (q) conditions.push(ilike(psProducts.name, `%${q}%`));
  const products = await db.select({ product: psProducts, categoryName: psCategories.name })
    .from(psProducts).leftJoin(psCategories, eq(psCategories.id, psProducts.categoryId))
    .where(and(...conditions)).orderBy(desc(psProducts.featured), asc(psProducts.name)).limit(120);
  const productIds = products.map((row) => row.product.id);
  const [categories, variantRows] = await Promise.all([
    db.select().from(psCategories).where(and(eq(psCategories.storeId, storeId), eq(psCategories.active, true))).orderBy(asc(psCategories.name)),
    productIds.length ? db.select({
      productId: psVariants.productId, variantId: psVariants.id, active: psVariants.active, quantity: psInventory.quantityOnHand,
    }).from(psVariants).leftJoin(psInventory, eq(psInventory.variantId, psVariants.id))
      .where(and(eq(psVariants.storeId, storeId), inArray(psVariants.productId, productIds))) : Promise.resolve([]),
  ]);
  const images = productIds.length ? await db.select({ productId: psProductImages.productId, assetId: psProductImages.assetId })
    .from(psProductImages).where(inArray(psProductImages.productId, productIds)).orderBy(asc(psProductImages.position)) : [];
  const imageMap = new Map<string, string[]>();
  for (const image of images) {
    const list = imageMap.get(image.productId) ?? [];
    if (list.length < 2) list.push(`/api/pocketshop/assets/${image.assetId}`);
    imageMap.set(image.productId, list);
  }
  return {
    products: products.map((row) => {
      const variants = variantRows.filter((variant) => variant.productId === row.product.id);
      return {
        ...row.product,
        categoryName: row.categoryName,
        images: imageMap.get(row.product.id) ?? [],
        defaultVariantId: variants.find((variant) => variant.active)?.variantId ?? null,
        available: variants.some((variant) => variant.active && (variant.quantity ?? 0) > 0),
      };
    }),
    categories,
  };
}

export async function getStorefrontProduct(storeId: string, slug: string) {
  const [row] = await db.select().from(psProducts)
    .where(and(eq(psProducts.storeId, storeId), eq(psProducts.slug, slug), eq(psProducts.status, "ACTIVE"))).limit(1);
  if (!row) return null;
  const [images, variants, category] = await Promise.all([
    db.select().from(psProductImages).where(eq(psProductImages.productId, row.id)).orderBy(asc(psProductImages.position)),
    db.select({ variant: psVariants, available: psInventory.quantityOnHand }).from(psVariants)
      .leftJoin(psInventory, eq(psInventory.variantId, psVariants.id))
      .where(and(eq(psVariants.productId, row.id), eq(psVariants.active, true))).orderBy(asc(psVariants.createdAt)),
    row.categoryId ? db.select().from(psCategories).where(eq(psCategories.id, row.categoryId)).limit(1) : Promise.resolve([]),
  ]);
  return {
    product: row,
    images: images.map((image) => `/api/pocketshop/assets/${image.assetId}`),
    variants: variants.map((item) => ({ ...item.variant, available: item.available ?? 0 })),
    category: category[0] ?? null,
  };
}

export async function getPublicOrder(storeId: string, reference: string, tokenHash: string) {
  const [order] = await db.select().from(psOrders)
    .where(and(eq(psOrders.storeId, storeId), eq(psOrders.reference, reference), eq(psOrders.accessTokenHash, tokenHash))).limit(1);
  if (!order) return null;
  const [items, events, payments, store] = await Promise.all([
    db.select().from(psOrderItems).where(eq(psOrderItems.orderId, order.id)),
    db.select().from(psOrderEvents).where(eq(psOrderEvents.orderId, order.id)).orderBy(desc(psOrderEvents.createdAt)),
    db.select().from(psPayments).where(eq(psPayments.orderId, order.id)).orderBy(desc(psPayments.createdAt)),
    db.select().from(psStores).where(eq(psStores.id, storeId)).limit(1),
  ]);
  return { order, items, events, payments, store: store[0] ?? null };
}
