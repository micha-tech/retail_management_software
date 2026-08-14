import { z } from "zod";

const moneyInput = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount.");
export const productSchema = z.object({ name: z.string().trim().min(2).max(200), sku: z.string().trim().min(1).max(80).transform((v) => v.toUpperCase()), barcode: z.string().trim().max(100).optional(), categoryId: z.union([z.literal(""), z.uuid()]).optional(), description: z.string().trim().max(1000).optional(), sellingPrice: moneyInput, costPrice: moneyInput, unit: z.string().trim().min(1).max(30), minimumStockLevel: z.coerce.number().int().min(0).max(1_000_000), trackInventory: z.string().optional() });
export const updateProductSchema = productSchema.extend({ productId: z.uuid(), active: z.string().optional() });
export const categorySchema = z.object({ name: z.string().trim().min(2).max(100) });
