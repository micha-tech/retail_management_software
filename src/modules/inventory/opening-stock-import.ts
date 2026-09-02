import "server-only";

import { and, eq, ilike, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";

import { db } from "@/db/client";
import { auditLogs, branchInventory, categories, products, stockMovements } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { parseCsv } from "@/lib/csv";
import { activeInventoryCount, inventoryBranchLock } from "./count-guard";

const moneyPattern = /^\d+(\.\d{1,2})?$/;
const intPattern = /^\d+$/;

export const OPENING_STOCK_COLUMNS = [
  "category",
  "name",
  "sku",
  "barcode",
  "unit",
  "selling_price",
  "cost_price",
  "branch_code",
  "branch_name",
  "stock",
] as const;

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replaceAll(" ", "_");
}

export type LoadedRow = { rowNumber: number; values: Record<string, string> };

function toLoadedRows(rows: unknown[][]) {
  if (!rows.length) throw new ApplicationError("The file is empty.", "INVALID_OPENING_STOCK_FILE");
  const headers = rows[0].map((cell) => normalizeHeader(String(cell)));
  const loaded: LoadedRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const cells = rows[i] ?? [];
    if (cells.every((c) => c === "" || c === null || c === undefined)) continue;
    loaded.push({ rowNumber: i + 1, values: Object.fromEntries(headers.map((header, column) => [header, String(cells[column] ?? "").trim()])) });
  }
  return loaded;
}

export async function readOpeningStockFile(file: File): Promise<LoadedRow[]> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith(".csv");
  const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");
  if (!isCsv && !isXlsx) throw new ApplicationError("Choose a .csv, .xlsx, or .xls file.", "INVALID_OPENING_STOCK_FILE");
  if (file.size === 0 || file.size > 5_000_000) throw new ApplicationError("Choose a file no larger than 5 MB.", "INVALID_OPENING_STOCK_FILE");
  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = isCsv ? toLoadedRows(parseCsv(buffer.toString("utf8").replace(/^\uFEFF/, ""), 5_000)) : readXlsx(buffer);
  if (!rows.length) throw new ApplicationError("The file has no rows.", "INVALID_OPENING_STOCK_FILE");
  return rows;
}

function readXlsx(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ApplicationError("The spreadsheet has no sheets.", "INVALID_OPENING_STOCK_FILE");
  const rows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
  return toLoadedRows(rows);
}

export type ImportBranch = { id: string; code: string; name: string };

export type OpeningStockRow = {
  rowNumber: number;
  category?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  unit: string;
  sellingPrice: bigint;
  costPrice: bigint;
  branchCode?: string;
  branchName?: string;
  stock: number;
};

export function buildOpeningStockRows(rows: LoadedRow[]): OpeningStockRow[] {
  return rows.map((row): OpeningStockRow => {
    const v = row.values;
    if (v.stock !== "" && !intPattern.test(v.stock)) throw new ApplicationError(`Row ${row.rowNumber}: stock must be a whole number.`, "INVALID_OPENING_STOCK_FILE");
    const stock = Number(v.stock === "" ? "0" : v.stock);
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2_000_000_000) throw new ApplicationError(`Row ${row.rowNumber}: stock must be between 0 and 2,000,000,000.`, "INVALID_OPENING_STOCK_FILE");
    if (v.selling_price !== "" && !moneyPattern.test(v.selling_price)) throw new ApplicationError(`Row ${row.rowNumber}: selling price must be a valid amount (e.g. 1500.50).`, "INVALID_OPENING_STOCK_FILE");
    if (v.cost_price !== "" && !moneyPattern.test(v.cost_price)) throw new ApplicationError(`Row ${row.rowNumber}: cost price must be a valid amount.`, "INVALID_OPENING_STOCK_FILE");
    if (!v.branch_code && !v.branch_name) throw new ApplicationError(`Row ${row.rowNumber}: a branch is required (branch_code or branch_name).`, "INVALID_OPENING_STOCK_FILE");
    if (!v.sku && !v.name) throw new ApplicationError(`Row ${row.rowNumber}: the product requires a sku or a name.`, "INVALID_OPENING_STOCK_FILE");
    return {
      rowNumber: row.rowNumber,
      category: v.category || undefined,
      name: v.name || undefined,
      sku: v.sku ? v.sku.toUpperCase() : undefined,
      barcode: v.barcode || undefined,
      unit: v.unit || "each",
      sellingPrice: v.selling_price ? parseMoney(v.selling_price) : 0n,
      costPrice: v.cost_price ? parseMoney(v.cost_price) : 0n,
      branchCode: v.branch_code ? v.branch_code.toUpperCase() : undefined,
      branchName: v.branch_name || undefined,
      stock,
    };
  });
}

function resolveBranch(row: OpeningStockRow, branches: ImportBranch[]): ImportBranch {
  if (row.branchCode) {
    const branch = branches.find((b) => b.code.toUpperCase() === row.branchCode);
    if (!branch) throw new ApplicationError(`Row ${row.rowNumber}: branch code "${row.branchCode}" was not found for this business.`, "INVALID_BRANCH");
    return branch;
  }
  const matches = branches.filter((b) => b.name.trim().toLowerCase() === row.branchName?.trim().toLowerCase());
  if (matches.length !== 1) throw new ApplicationError(`Row ${row.rowNumber}: branch name "${row.branchName}" is unknown or ambiguous. Use branch_code instead.`, "INVALID_BRANCH");
  return matches[0];
}

export type OpeningStockResult = {
  created: number;
  updated: number;
  balances: number;
  skipped: number;
  total: number;
};

export async function importOpeningStock(input: { businessId: string; userId: string; branches: ImportBranch[]; rows: OpeningStockRow[] }) {
  let created = 0;
  let updated = 0;
  let balances = 0;
  let skipped = 0;
  const runId = randomUUID();
  const categoryIds = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const row of input.rows) {
      const branch = resolveBranch(row, input.branches);
      await tx.execute(inventoryBranchLock(branch.id));
      const active = await tx.execute<{ id: string; count_number: string }>(activeInventoryCount(branch.id));
      if (active[0]) throw new ApplicationError(`Inventory count ${active[0].count_number} is active at branch ${branch.name}. Opening stock is paused.`, "INVENTORY_COUNT_ACTIVE", 409);

      let product = null;
      if (row.sku) {
        const match = await tx.select({ id: products.id }).from(products).where(and(eq(products.businessId, input.businessId), eq(products.sku, row.sku))).limit(1);
        product = match[0];
      }
      if (!product && row.name) {
        const match = await tx.select({ id: products.id }).from(products).where(and(eq(products.businessId, input.businessId), ilike(products.name, row.name))).limit(1);
        product = match[0];
      }

      if (!product) {
        if (!row.name || row.name.length < 2) { skipped += 1; continue; }
        const sku = row.sku ?? `OS-${randomUUID().slice(0, 6).toUpperCase()}`;
        let categoryId: string | null = null;
        if (row.category) {
          const key = row.category.trim().toLowerCase();
          const cached = categoryIds.get(key);
          if (cached) {
            categoryId = cached;
          } else {
            const existing = await tx.select({ id: categories.id }).from(categories).where(and(eq(categories.businessId, input.businessId), eq(categories.name, row.category))).limit(1);
            categoryId = existing[0]?.id ?? null;
            if (!categoryId) {
              const [inserted] = await tx.insert(categories).values({ businessId: input.businessId, name: row.category }).returning({ id: categories.id });
              categoryId = inserted.id;
            }
            categoryIds.set(key, categoryId);
          }
        }
        const [insertedProduct] = await tx.insert(products).values({
          businessId: input.businessId,
          categoryId,
          name: row.name,
          sku,
          barcode: row.barcode || null,
          sellingPrice: row.sellingPrice,
          costPrice: row.costPrice,
          unit: row.unit,
          trackInventory: true,
        }).returning({ id: products.id });
        product = insertedProduct;
        created += 1;
        await tx.insert(auditLogs).values({ businessId: input.businessId, userId: input.userId, action: "product.imported", entityType: "product", entityId: product.id, metadata: { sku, source: "opening_stock_import", runId } });
      } else if (row.sellingPrice > 0n || row.costPrice > 0n) {
        await tx.update(products).set({ sellingPrice: row.sellingPrice > 0n ? row.sellingPrice : undefined, costPrice: row.costPrice > 0n ? row.costPrice : undefined, updatedAt: new Date() }).where(and(eq(products.id, product.id), eq(products.businessId, input.businessId)));
        updated += 1;
      }

      await tx.insert(branchInventory).values({ businessId: input.businessId, branchId: branch.id, productId: product.id, quantityOnHand: 0 }).onConflictDoNothing();
      const existing = await tx.execute<{ quantity_on_hand: number }>(sql`select quantity_on_hand from branch_inventory where business_id=${input.businessId} and branch_id=${branch.id} and product_id=${product.id} for update`);
      const before = existing[0]?.quantity_on_hand;
      if (before === undefined) throw new ApplicationError(`Row ${row.rowNumber}: could not lock inventory balance for branch ${branch.name}.`, "INVENTORY_NOT_FOUND");
      const delta = row.stock - before;
      await tx.update(branchInventory).set({ quantityOnHand: row.stock, updatedAt: new Date() }).where(and(eq(branchInventory.branchId, branch.id), eq(branchInventory.productId, product.id)));
      if (delta !== 0) {
        balances += 1;
        await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: branch.id, productId: product.id, movementType: "OPENING_STOCK", quantity: delta, quantityBefore: before, quantityAfter: row.stock, referenceType: "opening_stock_import", referenceId: runId, performedBy: input.userId });
      }
    }
  });

  return { created, updated, balances, skipped, total: input.rows.length } satisfies OpeningStockResult;
}