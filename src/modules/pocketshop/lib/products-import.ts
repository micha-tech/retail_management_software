import { parseMoney } from "@/lib/money";
import { normalizeSku } from "./slugs";

export type ProductImportRow = {
  row: number;
  name: string;
  sku: string;
  price: bigint;
  compareAtPrice: bigint | null;
  description: string;
  category: string;
  quantity: number;
  lowStockThreshold: number;
  status: "DRAFT" | "ACTIVE";
};

const REQUIRED = ["name", "sku", "price"];

/** Validates a preview row. Nothing is written until every row passes. */
export function parseProductImportRecord(values: Record<string, string>, row: number): { ok: true; record: ProductImportRow } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const name = (values.name ?? "").trim();
  const sku = normalizeSku(values.sku ?? "");
  const category = (values.category ?? "").trim();
  const description = (values.description ?? "").trim();
  const status = ((values.status ?? "DRAFT").trim().toUpperCase() || "DRAFT") as ProductImportRow["status"];
  if (name.length < 2 || name.length > 160) errors.push("name must be 2–160 characters");
  if (!sku || sku.length > 64) errors.push("sku is required (max 64 characters)");
  if (!REQUIRED.every((key) => values[key] !== undefined)) errors.push("missing required columns");
  let price = 0n;
  let compareAtPrice: bigint | null = null;
  try { price = parseMoney(values.price ?? ""); } catch { errors.push("price must be a valid amount"); }
  if ((values.compare_at_price ?? "").trim()) {
    try { compareAtPrice = parseMoney(values.compare_at_price); } catch { errors.push("compare_at_price must be a valid amount"); }
  }
  if (compareAtPrice !== null && price > 0n && compareAtPrice < price) errors.push("compare_at_price cannot be lower than price");
  const quantity = Number(values.quantity ?? "0");
  const threshold = Number(values.low_stock_threshold ?? "5");
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000) errors.push("quantity must be a whole number from 0 to 1,000,000");
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1_000_000) errors.push("low_stock_threshold must be a whole number");
  if (!["DRAFT", "ACTIVE"].includes(status)) errors.push("status must be DRAFT or ACTIVE");
  if (description.length > 2000) errors.push("description is too long");
  if (category.length > 80) errors.push("category is too long");
  if (errors.length) return { ok: false, errors: errors.map((error) => `Row ${row}: ${error}`) };
  return { ok: true, record: { row, name, sku, price, compareAtPrice, description, category, quantity, lowStockThreshold: threshold, status } };
}
