import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFileSync } from "node:fs";
import postgres from "postgres";

import { branches, branchInventory, businessMemberships, businesses, categories, products, stockMovements, users } from "../schema";
import { seedCategories, seedProducts, seedProductValues } from "./catalog";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (process.env.VERCEL_ENV === "production") throw new Error("Development catalogue cannot run in production.");

const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
    : undefined;
const client = postgres(databaseUrl, { max: 1, prepare: false, ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined });
const database = drizzle(client);

async function main() {
  try {
    const result = await database.transaction(async (tx) => {
      const owners = await tx.select({ userId: users.id, email: users.email, businessId: businessMemberships.businessId, businessName: businesses.name })
        .from(users)
        .innerJoin(businessMemberships, eq(businessMemberships.userId, users.id))
        .innerJoin(businesses, eq(businesses.id, businessMemberships.businessId))
        .where(and(eq(businessMemberships.role, "OWNER"), eq(businesses.active, true)));
      const owner = owners.find((candidate) => candidate.email === "owner@relay.example") ?? (owners.length === 1 ? owners[0] : undefined);
      if (!owner) {
        const choices = owners.map((candidate) => `${candidate.businessName} (${candidate.email})`).join(", ");
        throw new Error(owners.length === 0
          ? "No active owner business was found. Run npm run db:seed first."
          : `Multiple owner businesses were found; catalogue target is ambiguous: ${choices}`);
      }

      await tx.insert(categories).values(seedCategories.map((name) => ({ businessId: owner.businessId, name }))).onConflictDoNothing();
      const categoryRows = await tx.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.businessId, owner.businessId));
      const categoryIds = new Map(categoryRows.map((category) => [category.name, category.id]));

      const insertedProducts = await tx.insert(products).values(seedProducts.map((product, index) => ({
        businessId: owner.businessId,
        categoryId: categoryIds.get(product.category),
        ...seedProductValues(product, index),
      }))).onConflictDoNothing().returning();

      const demoBranches = await tx.select({ id: branches.id }).from(branches).where(eq(branches.businessId, owner.businessId));
      for (const branch of demoBranches) {
        for (const [index, product] of insertedProducts.entries()) {
          const quantity = 80 + (index % 7) * 10;
          await tx.insert(branchInventory).values({ businessId: owner.businessId, branchId: branch.id, productId: product.id, quantityOnHand: quantity, reorderLevel: 10 }).onConflictDoNothing();
          await tx.insert(stockMovements).values({ businessId: owner.businessId, branchId: branch.id, productId: product.id, movementType: "OPENING_STOCK", quantity, quantityBefore: 0, quantityAfter: quantity, referenceType: "development_catalogue", referenceId: owner.businessId, reason: "Expanded development product catalogue", performedBy: owner.userId });
        }
      }

      return { insertedCount: insertedProducts.length, businessName: owner.businessName };
    });
    console.info(`Development catalogue ready for ${result.businessName}. Added ${result.insertedCount} products; target catalogue size is ${seedProducts.length}.`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalogue expansion failed.");
  process.exitCode = 1;
});
