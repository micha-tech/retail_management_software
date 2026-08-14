"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { auditLogs, categories, products } from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { requirePermission } from "@/modules/auth/authorization";
import { categorySchema, productSchema, updateProductSchema } from "./schemas";

async function categoryBelongsToBusiness(categoryId: string | undefined, businessId: string) {
  if (!categoryId) return true;
  const [category] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, categoryId), eq(categories.businessId, businessId))).limit(1);
  return Boolean(category);
}

export async function createCategoryAction(formData: FormData) {
  const access = await requirePermission("product:manage");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/products/new?error=Enter+a+valid+category+name.");
  try { await db.insert(categories).values({ businessId: access.business.id, name: parsed.data.name }); }
  catch (error) { if ((error as { code?: string }).code !== "23505") throw error; }
  revalidatePath("/products/new"); redirect("/products/new");
}

export async function createProductAction(formData: FormData) {
  const access = await requirePermission("product:manage");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/products/new?error=Please+check+the+product+details.");
  if (!await categoryBelongsToBusiness(parsed.data.categoryId, access.business.id)) redirect("/products/new?error=That+category+is+not+available.");
  try {
    await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({ businessId: access.business.id, name: parsed.data.name, sku: parsed.data.sku, barcode: parsed.data.barcode || null, categoryId: parsed.data.categoryId || null, description: parsed.data.description || null, sellingPrice: parseMoney(parsed.data.sellingPrice), costPrice: parseMoney(parsed.data.costPrice), unit: parsed.data.unit, minimumStockLevel: parsed.data.minimumStockLevel, trackInventory: parsed.data.trackInventory === "on" }).returning({ id: products.id });
      await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: "product.created", entityType: "product", entityId: product.id, metadata: { sku: parsed.data.sku } });
    });
  } catch (error) { if ((error as { code?: string }).code === "23505") redirect("/products/new?error=That+SKU+or+barcode+already+exists."); throw error; }
  revalidatePath("/products"); redirect("/products");
}

export async function updateProductAction(formData: FormData) {
  const access = await requirePermission("product:manage");
  const parsed = updateProductSchema.safeParse(Object.fromEntries(formData));
  const fallbackId = String(formData.get("productId") || "");
  if (!parsed.success) redirect(`/products/${fallbackId}/edit?error=Please+check+the+product+details.`);
  const data = parsed.data;
  if (!await categoryBelongsToBusiness(data.categoryId, access.business.id)) redirect(`/products/${data.productId}/edit?error=That+category+is+not+available.`);
  const [existing] = await db.select().from(products).where(and(eq(products.id, data.productId), eq(products.businessId, access.business.id))).limit(1);
  if (!existing) redirect("/products");
  try {
    await db.transaction(async (tx) => {
      await tx.update(products).set({ name: data.name, sku: data.sku, barcode: data.barcode || null, categoryId: data.categoryId || null, description: data.description || null, sellingPrice: parseMoney(data.sellingPrice), costPrice: parseMoney(data.costPrice), unit: data.unit, minimumStockLevel: data.minimumStockLevel, trackInventory: data.trackInventory === "on", active: data.active === "on", updatedAt: new Date() }).where(and(eq(products.id, data.productId), eq(products.businessId, access.business.id)));
      await tx.insert(auditLogs).values({ businessId: access.business.id, userId: access.user.id, action: existing.sellingPrice !== parseMoney(data.sellingPrice) ? "product.price_changed" : "product.updated", entityType: "product", entityId: data.productId, metadata: { sku: data.sku, oldPrice: existing.sellingPrice.toString(), newPrice: parseMoney(data.sellingPrice).toString(), active: data.active === "on" } });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") redirect(`/products/${data.productId}/edit?error=That+SKU+or+barcode+already+exists.`);
    throw error;
  }
  revalidatePath("/products");
  redirect("/products");
}
