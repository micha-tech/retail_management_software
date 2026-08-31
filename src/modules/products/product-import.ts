import "server-only";

import { and, eq, or, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@/db/client";
import { auditLogs, branchInventory, categories, products, stockMovements } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { parseCsv } from "@/lib/csv";

export type LoadedRow = { rowNumber: number; values: Record<string, string> };

export const PRODUCT_IMPORT_COLUMNS = [
  "category",
  "name",
  "sku",
  "barcode",
  "description",
  "cost_price",
  "selling_price",
  "unit",
  "minimum_stock_level",
  "track_inventory",
  "opening_stock",
  "branch_code",
] as const;

export const REQUIRED_IMPORT_COLUMNS = ["name", "sku", "selling_price"] as const;

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replaceAll(" ", "_");
}

export async function readProductFile(file: File): Promise<LoadedRow[]> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");
  if (!isCsv && !isXlsx) throw new ApplicationError("Choose a .csv, .xlsx, or .xls file.", "INVALID_PRODUCT_FILE");
  if (file.size === 0 || file.size > 5_000_000) throw new ApplicationError("Choose a file no larger than 5 MB.", "INVALID_PRODUCT_FILE");
  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = isCsv ? parseProductCsv(buffer.toString("utf8")) : parseProductXlsx(buffer);
  if (!rows.length) throw new ApplicationError("The file has no product rows.", "INVALID_PRODUCT_FILE");
  return rows;
}

function requireColumns(headers: string[]) {
  for (const required of REQUIRED_IMPORT_COLUMNS) if (!headers.includes(required)) throw new ApplicationError(`File is missing the ${required} column.`, "INVALID_PRODUCT_FILE");
}

function toLoadedRows(rows: unknown[][]) {
  if (!rows.length) throw new ApplicationError("The file is empty.", "INVALID_PRODUCT_FILE");
  const headers = rows[0].map((cell) => normalizeHeader(String(cell)));
  requireColumns(headers);
  const loaded: LoadedRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i] ?? [];
    if (cells.every((c) => c === "" || c === null || c === undefined)) continue;
    loaded.push({ rowNumber: i + 1, values: Object.fromEntries(headers.map((header, column) => [header, String(cells[column] ?? "").trim()])) });
  }
  return loaded;
}

function parseProductCsv(text: string) {
  return toLoadedRows(parseCsv(text.replace(/^\uFEFF/, ""), 5_000));
}

function parseProductXlsx(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ApplicationError("The spreadsheet has no sheets.", "INVALID_PRODUCT_FILE");
  const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
  return toLoadedRows(rows);
}

type ImportEntry = {
  rowNumber: number;
  category?: string;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  costPrice: bigint;
  sellingPrice: bigint;
  unit: string;
  minimumStockLevel: number;
  trackInventory: boolean;
  openingStock: number;
  branchCode?: string;
};

const moneyPattern = /^\d+(\.\d{1,2})?$/;
const intPattern = /^\d+$/;

function parseEntry(row: LoadedRow): ImportEntry {
  const v = row.values;
  if (v.name.length < 2) throw new ApplicationError(`Row ${row.rowNumber}: name is required (at least 2 characters).`, "INVALID_PRODUCT_FILE");
  if (!v.sku) throw new ApplicationError(`Row ${row.rowNumber}: sku is required.`, "INVALID_PRODUCT_FILE");
  if (!moneyPattern.test(v.selling_price)) throw new ApplicationError(`Row ${row.rowNumber}: selling price must be a valid amount (e.g. 1500.50).`, "INVALID_PRODUCT_FILE");
  if (v.cost_price && !moneyPattern.test(v.cost_price)) throw new ApplicationError(`Row ${row.rowNumber}: cost price must be a valid amount.`, "INVALID_PRODUCT_FILE");
  const opening = v.opening_stock === "" ? "0" : v.opening_stock;
  if (!intPattern.test(opening)) throw new ApplicationError(`Row ${row.rowNumber}: opening stock must be a whole number.`, "INVALID_PRODUCT_FILE");
  const minimum = v.minimum_stock_level === "" ? "0" : v.minimum_stock_level;
  if (!intPattern.test(minimum)) throw new ApplicationError(`Row ${row.rowNumber}: minimum stock level must be a whole number.`, "INVALID_PRODUCT_FILE");
  const openingNumber = Number(opening);
  const minimumNumber = Number(minimum);
  if (!Number.isSafeInteger(openingNumber) || openingNumber > 2_000_000_000) throw new ApplicationError(`Row ${row.rowNumber}: opening stock is too large.`, "INVALID_PRODUCT_FILE");
  if (!Number.isSafeInteger(minimumNumber) || minimumNumber > 2_000_000_000) throw new ApplicationError(`Row ${row.rowNumber}: minimum stock level is too large.`, "INVALID_PRODUCT_FILE");
  const trackValue = v.track_inventory || "";
  const trackInventory = !["no", "false", "0"].includes(trackValue.toLowerCase());
  const sku = v.sku.toUpperCase();
  const branchCode = v.branch_code ? v.branch_code.toUpperCase() : undefined;
  return {
    rowNumber: row.rowNumber,
    category: v.category || undefined,
    name: v.name,
    sku,
    barcode: v.barcode || undefined,
    description: v.description || undefined,
    costPrice: v.cost_price ? parseMoney(v.cost_price) : 0n,
    sellingPrice: parseMoney(v.selling_price),
    unit: v.unit || "each",
    minimumStockLevel: minimumNumber,
    trackInventory,
    openingStock: openingNumber,
    branchCode,
  };
}

export function buildImportEntries(rows: LoadedRow[]) {
  return rows.map(parseEntry);
}

export type ImportBranch = { id: string; code: string };

export type ImportResult = { created: number; skipped: number; total: number };

export async function importProducts(input: { businessId: string; userId: string; branches: ImportBranch[]; entries: ImportEntry[] }) {
  let created = 0;
  let skipped = 0;
  const categoryIds = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const entry of input.entries) {
      let categoryId: string | null = null;
      if (entry.category) {
        const key = entry.category.trim().toLowerCase();
        const cached = categoryIds.get(key);
        if (cached) {
          categoryId = cached;
        } else {
          const existing = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.businessId, input.businessId), eq(categories.name, entry.category))).limit(1);
          categoryId = existing[0]?.id;
          if (!categoryId) {
            const [inserted] = await tx.insert(categories).values({ businessId: input.businessId, name: entry.category }).returning({ id: categories.id });
            categoryId = inserted.id;
          }
          categoryIds.set(key, categoryId);
        }
      }

      const dupConditions = [eq(products.businessId, input.businessId), eq(products.sku, entry.sku)];
      if (entry.barcode) dupConditions.push(eq(products.barcode, entry.barcode));
      const duplicate = await tx.select({ id: products.id }).from(products).where(or(...dupConditions)).limit(1);
      if (duplicate[0]) { skipped += 1; continue; }

      const [product] = await tx.insert(products).values({
        businessId: input.businessId,
        categoryId,
        name: entry.name,
        sku: entry.sku,
        barcode: entry.barcode || null,
        description: entry.description || null,
        sellingPrice: entry.sellingPrice,
        costPrice: entry.costPrice,
        unit: entry.unit,
        minimumStockLevel: entry.minimumStockLevel,
        trackInventory: entry.trackInventory,
      }).returning({ id: products.id });
      created += 1;

      await tx.insert(auditLogs).values({ businessId: input.businessId, userId: input.userId, action: "product.imported", entityType: "product", entityId: product.id, metadata: { sku: entry.sku } });

      if (entry.openingStock > 0 && entry.trackInventory) {
        const targets = entry.branchCode ? input.branches.filter((branch) => branch.code === entry.branchCode) : input.branches;
        for (const branch of targets) {
          const [balance] = await tx.insert(branchInventory).values({ businessId: input.businessId, branchId: branch.id, productId: product.id, quantityOnHand: entry.openingStock }).onConflictDoUpdate({ target: [branchInventory.branchId, branchInventory.productId], set: { quantityOnHand: sql`${branchInventory.quantityOnHand} + ${entry.openingStock}`, updatedAt: new Date() } }).returning({ after: branchInventory.quantityOnHand });
          await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: branch.id, productId: product.id, movementType: "OPENING_STOCK", quantity: entry.openingStock, quantityBefore: balance.after - entry.openingStock, quantityAfter: balance.after, referenceType: "product_import", referenceId: product.id, performedBy: input.userId });
        }
      }
    }
  });

  return { created, skipped, total: input.entries.length } satisfies ImportResult;
}
