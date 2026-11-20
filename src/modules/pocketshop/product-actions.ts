"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  psCartItems, psCategories, psInventory, psInventoryMovements, psOrderItems,
  psProductImages, psProducts, psVariants,
} from "@/db/schema";
import { parseMoney } from "@/lib/money";
import { ApplicationError } from "@/lib/errors";
import { assetUrl, storeImage, verifyStoreAssetOwnership } from "./assets";
import { requirePocketStore } from "./authorization";
import { adjustStock } from "./inventory";
import { normalizeSku, slugify } from "./lib/slugs";
import { parseProductImportRecord } from "./lib/products-import";
import type { PocketActionState } from "./schemas";
import { productSchema } from "./schemas";

export type ImportPreviewState = PocketActionState & {
  rows?: Array<{ row: number; name: string; sku: string; price: string; quantity: number; category: string }>;
  csv?: string;
  total?: number;
};

type VariantInput = { id?: string; name: string; value: string; sku: string; price: string; active: boolean; quantity: number };

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (!value || String(value).trim() === "") return fallback;
  try { return JSON.parse(String(value)) as T; } catch { throw new ApplicationError("Invalid form data.", "INVALID_FORM"); }
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function uniqueProductSlug(storeId: string, name: string, currentId?: string) {
  const base = slugify(name).slice(0, 72) || "product";
  const [taken] = await db.select({ id: psProducts.id }).from(psProducts)
    .where(and(eq(psProducts.storeId, storeId), eq(psProducts.slug, base))).limit(1);
  if (!taken || taken.id === currentId) return base;
  return `${base.slice(0, 66)}-${randomUUID().slice(0, 5)}`;
}

function parseVariants(raw: string, productPrice: bigint): { variants: VariantInput[]; prices: Map<string, bigint>; quantities: Map<string, number> } {
  const parsed = parseJson<VariantInput[]>(raw, []);
  const variants = Array.isArray(parsed) ? parsed : [];
  if (!variants.length) {
    return {
      variants: [{ name: "Default", value: "Standard", sku: "", price: "", active: true, quantity: 0 }],
      prices: new Map(), quantities: new Map(),
    };
  }
  if (variants.length > 50) throw new ApplicationError("A product can have at most 50 variants.", "TOO_MANY_VARIANTS");
  const prices = new Map<string, bigint>();
  const quantities = new Map<string, number>();
  const seen = new Set<string>();
  for (const [index, variant] of variants.entries()) {
    const name = String(variant.name ?? "").trim().slice(0, 40);
    const value = String(variant.value ?? "").trim().slice(0, 40);
    if (!name || !value) throw new ApplicationError(`Variant ${index + 1} needs an option name and value.`, "INVALID_VARIANT");
    const priceText = String(variant.price ?? "").trim();
    const price = priceText ? parseMoney(priceText) : productPrice;
    const quantity = Number(variant.quantity ?? 0);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) throw new ApplicationError(`Variant ${index + 1} has an invalid quantity.`, "INVALID_VARIANT");
    const key = `${name}\u0000${value}`;
    if (seen.has(key)) throw new ApplicationError("Variant options must be unique.", "DUPLICATE_VARIANT");
    seen.add(key);
    prices.set(key, price);
    quantities.set(key, quantity);
  }
  return { variants, prices, quantities };
}

async function verifyCategory(storeId: string, businessId: string, categoryId: string | undefined) {
  if (!categoryId) return null;
  const [category] = await db.select().from(psCategories)
    .where(and(eq(psCategories.id, categoryId), eq(psCategories.storeId, storeId), eq(psCategories.businessId, businessId))).limit(1);
  if (!category) throw new ApplicationError("Select a category from this store.", "INVALID_CATEGORY");
  return category.id;
}

export async function uploadProductImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    const { store, business } = await requirePocketStore();
    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "Choose an image file." };
    const asset = await storeImage({ storeId: store.id, businessId: business.id, file });
    return { url: assetUrl(asset.id) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Upload failed." };
  }
}

export async function saveProductAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  const { store, business } = await requirePocketStore();
  const parsed = productSchema.safeParse({
    name: formData.get("name"), sku: formData.get("sku"), description: formData.get("description"),
    categoryId: formData.get("categoryId") || undefined,
    price: formData.get("price"), compareAtPrice: formData.get("compareAtPrice") ?? "",
    lowStockThreshold: formData.get("lowStockThreshold"), weightGrams: formData.get("weightGrams") || 0,
    featured: formData.get("featured") === "on", status: formData.get("status"),
    variants: formData.get("variants") ?? "[]", imageUrls: formData.get("imageUrls") ?? "[]",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const data = parsed.data;
  const productId = String(formData.get("productId") || "") || undefined;
  if (productId && !/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Invalid product." };

  try {
    const price = parseMoney(data.price);
    const compareAt = data.compareAtPrice.trim() ? parseMoney(data.compareAtPrice) : null;
    if (compareAt !== null && compareAt < price) return { error: "Compare-at price cannot be lower than the selling price." };
    const categoryId = await verifyCategory(store.id, business.id, data.categoryId || undefined);
    const { variants, prices, quantities } = parseVariants(data.variants, price);
    const imageUrls = parseJson<string[]>(data.imageUrls, []);
    if (!Array.isArray(imageUrls) || imageUrls.length > 8 || imageUrls.some((url) => typeof url !== "string")) {
      return { error: "Choose up to 8 images." };
    }
    if (imageUrls.length && !await verifyStoreAssetOwnership(imageUrls, store.id, business.id)) {
      return { error: "One or more images do not belong to this store." };
    }

    let existing: typeof psProducts.$inferSelect | undefined;
    if (productId) {
      [existing] = await db.select().from(psProducts)
        .where(and(eq(psProducts.id, productId), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id))).limit(1);
      if (!existing) return { error: "Product not found." };
    }

    const skuOwners = await db.select({ id: psProducts.id }).from(psProducts)
      .where(and(eq(psProducts.storeId, store.id), eq(psProducts.sku, data.sku))).limit(1);
    if (skuOwners[0] && skuOwners[0].id !== productId) return { fieldErrors: { sku: ["That SKU is already used by another product."] } };

    const slug = await uniqueProductSlug(store.id, data.name, productId);
    const savedId = await db.transaction(async (tx) => {
      let id = productId ?? "";
      if (productId && existing) {
        await tx.update(psProducts).set({
          name: data.name, sku: data.sku, slug: existing.slug, description: data.description,
          categoryId, price, compareAtPrice: compareAt, status: data.status,
          lowStockThreshold: data.lowStockThreshold, weightGrams: data.weightGrams,
          featured: data.featured, updatedAt: new Date(),
        }).where(and(eq(psProducts.id, productId), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id)));
      } else {
        const [created] = await tx.insert(psProducts).values({
          storeId: store.id, businessId: business.id, categoryId, name: data.name, slug, sku: data.sku,
          description: data.description, price, compareAtPrice: compareAt, status: data.status,
          lowStockThreshold: data.lowStockThreshold, weightGrams: data.weightGrams, featured: data.featured,
        }).returning({ id: psProducts.id });
        id = created.id;
      }

      const storedVariants = await tx.select().from(psVariants).where(eq(psVariants.productId, id));
      const keepIds = new Set<string>();
      for (const [index, variant] of variants.entries()) {
        const key = `${variant.name}\u0000${variant.value}`;
        const variantSku = normalizeSku(variant.sku || `${data.sku}-${index + 1}`);
        const current = variant.id ? storedVariants.find((item) => item.id === variant.id) : undefined;
        if (variant.id && !current) throw new ApplicationError("A variant does not belong to this product.", "INVALID_VARIANT");
        const values = {
          name: variant.name, value: variant.value, sku: variantSku,
          price: prices.get(key) ?? price, active: variant.active,
          isDefault: index === 0,
        };
        let variantId = current?.id;
        if (current) {
          await tx.update(psVariants).set(values).where(and(eq(psVariants.id, current.id), eq(psVariants.storeId, store.id)));
        } else {
          const [created] = await tx.insert(psVariants).values({
            productId: id, storeId: store.id, businessId: business.id, ...values,
          }).returning({ id: psVariants.id });
          variantId = created.id;
          const opening = quantities.get(key) ?? 0;
          await tx.insert(psInventory).values({
            storeId: store.id, businessId: business.id, productId: id, variantId: created.id,
            quantityOnHand: opening,
          });
          if (opening > 0) {
            await tx.insert(psInventoryMovements).values({
              storeId: store.id, businessId: business.id, productId: id, variantId: created.id,
              quantity: opening, quantityBefore: 0, quantityAfter: opening,
              movementType: "IMPORT", referenceType: "product_create", note: "Opening stock entered with product",
            });
          }
        }
        if (variantId) keepIds.add(variantId);
      }
      for (const variant of storedVariants) {
        if (!keepIds.has(variant.id)) await tx.update(psVariants).set({ active: false, isDefault: false }).where(eq(psVariants.id, variant.id));
      }

      await tx.delete(psProductImages).where(eq(psProductImages.productId, id));
      const assetIds = imageUrls.map((url) => url.split("/").pop()!);
      for (const [position, assetId] of assetIds.entries()) {
        await tx.insert(psProductImages).values({ productId: id, storeId: store.id, assetId, position });
      }
      return id;
    });
    revalidatePath("/pocketshop/products");
    revalidatePath(`/store/${store.slug}`);
    redirect(`/pocketshop/products?saved=1&product=${savedId}`);
  } catch (error) {
    if (error instanceof ApplicationError) return { error: error.message };
    if ((error as { code?: string }).code === "23505") return { error: "A product or variant with that SKU already exists." };
    console.error(JSON.stringify({ event: "pocketshop_product_save_failed", productId: productId ?? null }));
    return { error: "The product could not be saved. Check the details and try again." };
  }
}

export async function duplicateProductAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const id = String(formData.get("productId") || "");
  const [source] = await db.select().from(psProducts)
    .where(and(eq(psProducts.id, id), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id))).limit(1);
  if (!source) redirectWithError("/pocketshop/products", "Product not found.");
  const variants = await db.select().from(psVariants).where(eq(psVariants.productId, source.id));
  const images = await db.select().from(psProductImages).where(eq(psProductImages.productId, source.id));
  const suffix = randomUUID().slice(0, 5).toUpperCase();
  await db.transaction(async (tx) => {
    const [copy] = await tx.insert(psProducts).values({
      storeId: store.id, businessId: business.id, categoryId: source.categoryId,
      name: `${source.name} (copy)`, slug: `${source.slug}-${suffix.toLowerCase()}`,
      sku: `${source.sku}-${suffix}`, description: source.description, price: source.price,
      compareAtPrice: source.compareAtPrice, status: "DRAFT", lowStockThreshold: source.lowStockThreshold,
      weightGrams: source.weightGrams, featured: false,
    }).returning({ id: psProducts.id });
    for (const [index, variant] of variants.entries()) {
      const [created] = await tx.insert(psVariants).values({
        productId: copy.id, storeId: store.id, businessId: business.id, name: variant.name, value: variant.value,
        sku: `${variant.sku}-${suffix}-${index + 1}`.slice(0, 64), price: variant.price,
        isDefault: index === 0, active: variant.active,
      }).returning({ id: psVariants.id });
      await tx.insert(psInventory).values({ storeId: store.id, businessId: business.id, productId: copy.id, variantId: created.id, quantityOnHand: 0 });
    }
    for (const [index, image] of images.entries()) {
      await tx.insert(psProductImages).values({ productId: copy.id, storeId: store.id, assetId: image.assetId, position: index, alt: image.alt });
    }
  });
  revalidatePath("/pocketshop/products");
  redirect("/pocketshop/products?duplicated=1");
}

export async function setProductStatusAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const id = String(formData.get("productId") || "");
  const status = String(formData.get("status") || "");
  if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) redirectWithError("/pocketshop/products", "Invalid status.");
  await db.update(psProducts).set({ status: status as "DRAFT" | "ACTIVE" | "ARCHIVED", updatedAt: new Date() })
    .where(and(eq(psProducts.id, id), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id)));
  revalidatePath("/pocketshop/products");
  revalidatePath(`/store/${store.slug}`);
  redirect("/pocketshop/products?statusUpdated=1");
}

export async function deleteProductAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const id = String(formData.get("productId") || "");
  if (String(formData.get("confirm") || "").toUpperCase() !== "DELETE") redirectWithError("/pocketshop/products", "Type DELETE to confirm.");
  const [product] = await db.select().from(psProducts)
    .where(and(eq(psProducts.id, id), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id))).limit(1);
  if (!product) redirectWithError("/pocketshop/products", "Product not found.");
  const [ordered] = await db.select({ id: psOrderItems.id }).from(psOrderItems).where(eq(psOrderItems.productId, id)).limit(1);
  const [inCart] = await db.select({ id: psCartItems.id }).from(psCartItems)
    .innerJoin(psVariants, eq(psVariants.id, psCartItems.variantId)).where(eq(psVariants.productId, id)).limit(1);
  if (ordered || inCart || product.status === "ACTIVE") redirectWithError("/pocketshop/products", "Archive this product first. Products with orders or active carts cannot be deleted.");
  await db.transaction(async (tx) => {
    await tx.delete(psInventory).where(and(eq(psInventory.productId, id), eq(psInventory.storeId, store.id), eq(psInventory.businessId, business.id)));
    await tx.delete(psProducts).where(and(eq(psProducts.id, id), eq(psProducts.storeId, store.id), eq(psProducts.businessId, business.id)));
  });
  revalidatePath("/pocketshop/products");
  redirect("/pocketshop/products?deleted=1");
}

export async function adjustStockAction(_state: PocketActionState, formData: FormData): Promise<PocketActionState> {
  try {
    const { store, business, user } = await requirePocketStore();
    await adjustStock({
      inventoryId: String(formData.get("inventoryId") || ""), storeId: store.id, businessId: business.id,
      quantity: Number(formData.get("quantity")), note: String(formData.get("note") || ""), actorUserId: user.id,
    });
    revalidatePath("/pocketshop/inventory");
    redirect("/pocketshop/inventory?adjusted=1");
  } catch (error) {
    return { error: error instanceof ApplicationError ? error.message : "Stock adjustment failed." };
  }
}

const HEADERS = ["name", "sku", "price", "compare_at_price", "description", "category", "quantity", "low_stock_threshold", "status"];

export async function importProductsPreviewAction(_state: ImportPreviewState, formData: FormData): Promise<ImportPreviewState> {
  const { store, business } = await requirePocketStore();
  const csv = String(formData.get("csv") || "").slice(0, 500_000);
  if (!csv.trim()) return { error: "Choose a CSV file first." };
  const { parseCsv } = await import("@/lib/csv");
  let matrix: string[][];
  try { matrix = parseCsv(csv); } catch (error) { return { error: error instanceof Error ? error.message : "The CSV could not be read." }; }
  if (matrix.length < 2) return { error: "The file needs a header row and at least one product." };
  if (matrix.length > 201) return { error: "Import up to 200 products at a time." };
  const header = matrix[0].map((cell) => cell.trim().toLowerCase().replaceAll(/[^a-z0-9_]/g, "_"));
  const missing = HEADERS.filter((name) => name !== "compare_at_price" && name !== "description" && name !== "category" && name !== "low_stock_threshold" && name !== "status" && !header.includes(name));
  if (missing.length) return { error: `Missing required columns: ${missing.join(", ")}.` };
  const errors: string[] = [];
  const rows: NonNullable<ImportPreviewState["rows"]> = [];
  const seen = new Set<string>();
  for (const [index, values] of matrix.slice(1).entries()) {
    const record = Object.fromEntries(header.map((name, position) => [name, values[position] ?? ""]));
    const result = parseProductImportRecord(record, index + 2);
    if (!result.ok) { errors.push(...result.errors.slice(0, 4)); continue; }
    const row = result.record;
    if (seen.has(row.sku)) errors.push(`Row ${row.row}: duplicate SKU ${row.sku} in this file.`);
    seen.add(row.sku);
    rows.push({ row: row.row, name: row.name, sku: row.sku, price: (row.price / 100n).toString(), quantity: row.quantity, category: row.category });
  }
  const existing = seen.size
    ? await db.select({ sku: psProducts.sku }).from(psProducts).where(and(eq(psProducts.storeId, store.id), inArray(psProducts.sku, [...seen])))
    : [];
  for (const item of existing) errors.push(`SKU ${item.sku} already exists in this store.`);
  if (errors.length) return { error: errors.slice(0, 12).join(" · "), rows: [], csv, total: errors.length };
  return { rows, csv, total: rows.length };
}

export async function commitProductImportAction(formData: FormData) {
  const { store, business } = await requirePocketStore();
  const csv = String(formData.get("csv") || "").slice(0, 500_000);
  const { parseCsv } = await import("@/lib/csv");
  const matrix = parseCsv(csv);
  const header = matrix[0].map((cell) => cell.trim().toLowerCase().replaceAll(/[^a-z0-9_]/g, "_"));
  const records = matrix.slice(1).map((values, index) => parseProductImportRecord(
    Object.fromEntries(header.map((name, position) => [name, values[position] ?? ""])), index + 2,
  ));
  if (records.some((record) => !record.ok)) redirectWithError("/pocketshop/products/import", "The file changed before import. Preview it again.");
  const valid = records.map((record) => record.ok ? record.record : null).filter((record): record is NonNullable<typeof record> => Boolean(record));
  if (!valid.length || valid.length > 200) redirectWithError("/pocketshop/products/import", "Import between 1 and 200 products.");

  try {
    await db.transaction(async (tx) => {
      for (const [index, record] of valid.entries()) {
        let categoryId: string | null = null;
        if (record.category) {
          const [category] = await tx.insert(psCategories).values({ storeId: store.id, businessId: business.id, name: record.category.slice(0, 80) })
            .onConflictDoNothing().returning({ id: psCategories.id });
          if (category) categoryId = category.id;
          else {
            const [found] = await tx.select({ id: psCategories.id }).from(psCategories)
              .where(and(eq(psCategories.storeId, store.id), eq(psCategories.name, record.category.slice(0, 80)))).limit(1);
            categoryId = found?.id ?? null;
          }
        }
        const [product] = await tx.insert(psProducts).values({
          storeId: store.id, businessId: business.id, categoryId,
          name: record.name, slug: `${slugify(record.name) || "product"}-${randomUUID().slice(0, 5)}`,
          sku: record.sku, description: record.description, price: record.price,
          compareAtPrice: record.compareAtPrice, status: record.status, lowStockThreshold: record.lowStockThreshold,
        }).returning({ id: psProducts.id });
        const [variant] = await tx.insert(psVariants).values({
          productId: product.id, storeId: store.id, businessId: business.id,
          name: "Default", value: "Standard", sku: record.sku, price: record.price, isDefault: true,
        }).returning({ id: psVariants.id });
        await tx.insert(psInventory).values({
          storeId: store.id, businessId: business.id, productId: product.id,
          variantId: variant.id, quantityOnHand: record.quantity,
        });
        if (record.quantity > 0) {
          await tx.insert(psInventoryMovements).values({
            storeId: store.id, businessId: business.id, productId: product.id, variantId: variant.id,
            quantity: record.quantity, quantityBefore: 0, quantityAfter: record.quantity,
            movementType: "IMPORT", referenceType: "csv_import", note: `Imported from CSV row ${record.row}`,
          });
        }
      }
    });
    revalidatePath("/pocketshop/products");
    revalidatePath(`/store/${store.slug}`);
    redirect(`/pocketshop/products?imported=${valid.length}`);
  } catch {
    redirectWithError("/pocketshop/products/import", "Import failed. No partial products were created. Check for duplicate SKUs and try again.");
  }
}

