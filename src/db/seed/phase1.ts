import { hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, and, eq } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import postgres from "postgres";

import { auditLogs, branches, branchAssignments, branchInventory, businessMemberships, businesses, categories, payments, posSessions, products, saleItems, sales, stockMovements, users, type BusinessRole } from "../schema";
import { seedCategories, seedProducts, seedProductValues } from "./catalog";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const seedPassword = process.env.SEED_PASSWORD;
if (!databaseUrl || !seedPassword || seedPassword.length < 12) throw new Error("DATABASE_URL and a 12+ character SEED_PASSWORD are required.");
if (process.env.VERCEL_ENV === "production") throw new Error("Development seed cannot run in production.");
const configuredSeedPassword = seedPassword;

const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
    : undefined;
const client = postgres(databaseUrl, { max: 1, prepare: false, ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined });
const database = drizzle(client);

const DEMO_NAME = "Relay Market Group";

type BranchSeed = { name: string; code: string; address: string; manager: string; cashier: string };
const branchSeeds: BranchSeed[] = [
  { name: "Ikeja", code: "IKJ", address: "12 Allen Avenue, Ikeja", manager: "Ife Eze", cashier: "Mariam Yusuf" },
  { name: "Lekki", code: "LEK", address: "8 Admiralty Way, Lekki", manager: "Emeka Nwosu", cashier: "Chidi James" },
  { name: "Abuja Central", code: "ABJ", address: "21 Aminu Kano Crescent, Abuja", manager: "Grace Audu", cashier: "Bola Adeyemi" },
];

function staffList(): { name: string; email: string; role: BusinessRole; branches: string[] }[] {
  return [
    { name: "Ada Okafor", email: "owner@relay.example", role: "OWNER", branches: branchSeeds.map((b) => b.code) },
    { name: "Tunde Bello", email: "admin@relay.example", role: "ADMIN", branches: branchSeeds.map((b) => b.code) },
    ...branchSeeds.flatMap((branch) => [
      { name: branch.manager, email: branch.manager.toLowerCase().replace(/[^a-z]+/g, ".") + "@relay.example", role: "BRANCH_MANAGER" as BusinessRole, branches: [branch.code] },
      { name: branch.cashier, email: branch.cashier.toLowerCase().replace(/[^a-z]+/g, ".") + "@relay.example", role: "CASHIER" as BusinessRole, branches: [branch.code] },
    ]),
  ];
}

type Tx = Parameters<Parameters<typeof database.transaction>[0]>[0];

async function ensureStaff(tx: Tx, businessId: string, members: ReturnType<typeof staffList>, branchIds: Map<string, string>, passwordHash: string) {
  const staffIds = new Map<string, string>();
  let ownerId = "";
  for (const member of members) {
    let [user] = await tx.select({ id: users.id }).from(users).where(eq(users.email, member.email)).limit(1);
    if (!user) {
      [user] = await tx.insert(users).values({ name: member.name, email: member.email, passwordHash, mustChangePassword: false }).returning({ id: users.id });
    }
    if (member.role === "OWNER") ownerId = user.id;
    staffIds.set(member.email, user.id);
    const [existingMembership] = await tx.select({ userId: businessMemberships.userId }).from(businessMemberships).where(and(eq(businessMemberships.businessId, businessId), eq(businessMemberships.userId, user.id))).limit(1);
    if (!existingMembership) await tx.insert(businessMemberships).values({ businessId, userId: user.id, role: member.role });
    for (const code of member.branches) {
      const [assignment] = await tx.select({ userId: branchAssignments.userId }).from(branchAssignments).where(and(eq(branchAssignments.businessId, businessId), eq(branchAssignments.branchId, branchIds.get(code)!), eq(branchAssignments.userId, user.id))).limit(1);
      if (!assignment) await tx.insert(branchAssignments).values({ businessId, branchId: branchIds.get(code)!, userId: user.id });
    }
  }
  return { staffIds, ownerId };
}

async function seedBaseCatalogue(tx: Tx, businessId: string) {
  for (const name of seedCategories) {
    await tx.insert(categories).values({ businessId, name }).onConflictDoNothing();
  }
  const categoryRows = await tx.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.businessId, businessId));
  const categoryIds = new Map(categoryRows.map((c) => [c.name, c.id]));
  await tx.insert(products).values(seedProducts.map((product, index) => ({ businessId, categoryId: categoryIds.get(product.category), ...seedProductValues(product, index) }))).onConflictDoNothing().returning({ id: products.id });
  const allProducts = await tx.select().from(products).where(eq(products.businessId, businessId));
  return allProducts;
}

async function seedPerBranchInventory(tx: Tx, input: { businessId: string; branchId: string; productRows: typeof products.$inferSelect[]; ownerId: string; referenceId: string }) {
  let added = 0;
  for (const [index, product] of input.productRows.entries()) {
    const quantity = 80 + (index % 7) * 10;
    const [balance] = await tx.insert(branchInventory).values({ businessId: input.businessId, branchId: input.branchId, productId: product.id, quantityOnHand: quantity, reorderLevel: 10 }).onConflictDoNothing().returning({ quantityOnHand: branchInventory.quantityOnHand });
    if (balance) {
      await tx.insert(stockMovements).values({ businessId: input.businessId, branchId: input.branchId, productId: product.id, movementType: "OPENING_STOCK", quantity, quantityBefore: 0, quantityAfter: quantity, referenceType: "development_seed", referenceId: input.referenceId, reason: "Realistic development opening stock", performedBy: input.ownerId });
      added += 1;
    }
  }
  return added;
}

async function seedBranchSales(tx: Tx, input: { businessId: string; branchId: string; cashierId: string; productRows: typeof products.$inferSelect[]; dayOffset: number; saleStartIndex: number }) {
  const { businessId, branchId, cashierId, productRows, dayOffset, saleStartIndex } = input;
  const [existingSale] = await tx.select({ id: sales.id }).from(sales).where(eq(sales.branchId, branchId)).limit(1);
  if (existingSale) return; // branch history already seeded
  const openingCash = 2000000n;
  const [session] = await tx.insert(posSessions).values({ businessId, branchId, cashierId, openingCash, status: "CLOSED", openedAt: new Date(Date.now() - (8 + dayOffset) * 86400000), closedAt: new Date(Date.now() - dayOffset * 86400000), expectedCash: openingCash, actualCash: openingCash, cashDifference: 0n }).returning();
  let seededCashSales = 0n;
  for (let index = 0; index < 15; index += 1) {
    const product = productRows[(index + saleStartIndex) % productRows.length];
    const quantity = 1 + (index % 3);
    const total = product.sellingPrice * BigInt(quantity);
    const createdAt = new Date(Date.now() - (14 + dayOffset - index) * 12 * 60 * 60 * 1000);
    const paymentMethod = index % 3 === 0 ? "CASH" : index % 3 === 1 ? "CARD" : "BANK_TRANSFER";
    if (paymentMethod === "CASH") seededCashSales += total;
    const [existing] = await tx.select({ id: sales.id }).from(sales).where(and(eq(sales.businessId, businessId), eq(sales.idempotencyKey, `seed-checkout-${String(saleStartIndex + index + 1).padStart(4, "0")}`))).limit(1);
    if (existing) continue;
    const [sale] = await tx.insert(sales).values({ businessId, branchId, posSessionId: session.id, cashierId, saleNumber: `SEED-SAL-${String(saleStartIndex + index + 1).padStart(4, "0")}`, subtotal: total, total, idempotencyKey: `seed-checkout-${String(saleStartIndex + index + 1).padStart(4, "0")}`, createdAt, completedAt: createdAt }).returning();
    await tx.insert(saleItems).values({ saleId: sale.id, productId: product.id, productNameSnapshot: product.name, skuSnapshot: product.sku, quantity, unitPrice: product.sellingPrice, costPriceSnapshot: product.costPrice, lineTotal: total });
    await tx.insert(payments).values({ businessId, branchId, saleId: sale.id, posSessionId: session.id, paymentMethod, amount: total, receivedBy: cashierId, createdAt });
    const [bal] = await tx.select({ quantityOnHand: branchInventory.quantityOnHand }).from(branchInventory).where(and(eq(branchInventory.branchId, branchId), eq(branchInventory.productId, product.id))).limit(1);
    const before = bal?.quantityOnHand ?? quantity;
    const after = before - quantity;
    await tx.update(branchInventory).set({ quantityOnHand: Math.max(after, 0), updatedAt: new Date() }).where(and(eq(branchInventory.branchId, branchId), eq(branchInventory.productId, product.id)));
    await tx.insert(stockMovements).values({ businessId, branchId, productId: product.id, movementType: "SALE", quantity: -quantity, quantityBefore: before, quantityAfter: Math.max(after, 0), referenceType: "sale", referenceId: sale.id, performedBy: cashierId, createdAt });
  }
  await tx.update(posSessions).set({ expectedCash: openingCash + seededCashSales, actualCash: openingCash + seededCashSales, cashDifference: 0n }).where(sql`${posSessions.id} = ${session.id}`);
}

async function main() {
  try {
    const passwordHash = await hash(configuredSeedPassword, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    let outcome = "";
    await database.transaction(async (tx) => {
      let [business] = await tx.select().from(businesses).where(eq(businesses.name, DEMO_NAME)).limit(1);
      if (!business) {
        [business] = await tx.insert(businesses).values({ name: DEMO_NAME, currency: "NGN", timezone: "Africa/Lagos", email: "operations@relay.example" }).returning();
        outcome = "created";
      } else {
        outcome = "repaired";
      }

      for (const branch of branchSeeds) {
        await tx.insert(branches).values({ businessId: business.id, name: branch.name, code: branch.code, address: branch.address, timezone: "Africa/Lagos" }).onConflictDoNothing();
      }
      const branchRows = await tx.select({ id: branches.id, code: branches.code }).from(branches).where(eq(branches.businessId, business.id));
      const branchIds = new Map(branchRows.map((b) => [b.code, b.id]));
      if (branchIds.size !== branchSeeds.length) throw new Error("Demo branches are not all present.");

      const { staffIds, ownerId } = await ensureStaff(tx, business.id, staffList(), branchIds, passwordHash);
      const productRows = await seedBaseCatalogue(tx, business.id);

      let totalInventoryAdded = 0;
      for (const branch of branchRows) {
        totalInventoryAdded += await seedPerBranchInventory(tx, { businessId: business.id, branchId: branch.id, productRows, ownerId, referenceId: business.id });
      }

      let saleStartIndex = 0;
      for (const branch of branchRows) {
        const branchSeed = branchSeeds.find((b) => b.code === branch.code)!;
        const cashierId = staffIds.get(branchSeed.cashier.toLowerCase().replace(/[^a-z]+/g, ".") + "@relay.example")!;
        await seedBranchSales(tx, { businessId: business.id, branchId: branch.id, cashierId, productRows, dayOffset: branchRows.findIndex((b) => b.id === branch.id), saleStartIndex });
        saleStartIndex += 15;
      }

      await tx.insert(auditLogs).values({ businessId: business.id, userId: ownerId, action: "development.seeded", entityType: "business", entityId: business.id, metadata: { mode: outcome, branchCount: branchRows.length, productCount: productRows.length, inventoryAdded: totalInventoryAdded } });
    });

    console.info(`Demo data ${outcome} for ${DEMO_NAME} (${branchSeeds.length} branches, ${seedProducts.length} products). All demo staff log in with SEED_PASSWORD.`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database seed failed.");
  process.exitCode = 1;
});
