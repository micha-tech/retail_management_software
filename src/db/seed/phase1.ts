import { hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import postgres from "postgres";

import { auditLogs, branches, branchAssignments, branchInventory, businessMemberships, businesses, categories, payments, posSessions, products, saleItems, sales, stockMovements, users, type BusinessRole } from "../schema";

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

const staff: { name: string; email: string; role: BusinessRole; branches: string[] }[] = [
  { name: "Ada Okafor", email: "owner@relay.example", role: "OWNER", branches: ["IKJ", "LEK", "ABJ"] },
  { name: "Tunde Bello", email: "admin@relay.example", role: "ADMIN", branches: ["IKJ", "LEK", "ABJ"] },
  { name: "Ife Eze", email: "manager@relay.example", role: "BRANCH_MANAGER", branches: ["IKJ"] },
  { name: "Mariam Yusuf", email: "cashier.ikeja@relay.example", role: "CASHIER", branches: ["IKJ"] },
  { name: "Chidi James", email: "cashier.lekki@relay.example", role: "CASHIER", branches: ["LEK"] },
];

async function main() {
  try {
  const passwordHash = await hash(configuredSeedPassword, { type: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await database.transaction(async (tx) => {
    const [business] = await tx.insert(businesses).values({ name: "Relay Market Group", currency: "NGN", timezone: "Africa/Lagos", email: "operations@relay.example" }).returning({ id: businesses.id });
    const createdBranches = await tx.insert(branches).values([
      { businessId: business.id, name: "Ikeja", code: "IKJ", address: "12 Allen Avenue, Ikeja", timezone: "Africa/Lagos" },
      { businessId: business.id, name: "Lekki", code: "LEK", address: "8 Admiralty Way, Lekki", timezone: "Africa/Lagos" },
      { businessId: business.id, name: "Abuja Central", code: "ABJ", address: "21 Aminu Kano Crescent, Abuja", timezone: "Africa/Lagos" },
    ]).returning({ id: branches.id, code: branches.code });
    const branchIds = new Map(createdBranches.map((branch) => [branch.code, branch.id]));
    const staffIds = new Map<string,string>();
    let ownerId = "";
    for (const member of staff) {
      const [user] = await tx.insert(users).values({ name: member.name, email: member.email, passwordHash, mustChangePassword: member.role !== "OWNER" }).returning({ id: users.id });
      if (member.role === "OWNER") ownerId = user.id;
      staffIds.set(member.email, user.id);
      await tx.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: member.role });
      await tx.insert(branchAssignments).values(member.branches.map((code) => ({ businessId: business.id, branchId: branchIds.get(code)!, userId: user.id })));
    }
    const categoryRows = await tx.insert(categories).values(["Beverages","Groceries","Household","Personal Care","Pharmacy"].map((name)=>({businessId:business.id,name}))).returning({id:categories.id,name:categories.name});
    const categoryIds=new Map(categoryRows.map(c=>[c.name,c.id]));
    const productNames=["Coca-Cola 50cl","Pepsi 50cl","Bottled Water 75cl","Orange Juice 1L","Malt Drink 33cl","Rice 1kg","Beans 1kg","Garri 1kg","Spaghetti 500g","Noodles 120g","Vegetable Oil 1L","Tomato Paste 400g","Sugar 1kg","Salt 500g","Milk Powder 400g","Breakfast Cereal 500g","Laundry Detergent 1kg","Dishwashing Liquid 500ml","Toilet Tissue 4 Pack","Bleach 1L","Bath Soap 150g","Toothpaste 140g","Body Lotion 400ml","Shampoo 400ml","Deodorant 200ml","Paracetamol 500mg","Vitamin C Tablets","Hand Sanitizer 250ml","Face Mask 10 Pack","Cotton Wool 100g"];
    const productRows=await tx.insert(products).values(productNames.map((name,index)=>({businessId:business.id,categoryId:categoryIds.get(index<5?"Beverages":index<16?"Groceries":index<20?"Household":index<25?"Personal Care":"Pharmacy"),name,sku:`SKU-${String(index+1).padStart(3,"0")}`,barcode:`100000000${String(index+1).padStart(3,"0")}`,sellingPrice:BigInt(15000+index*2500),costPrice:BigInt(9000+index*1800),unit:"each",minimumStockLevel:10}))).returning();
    const inventoryBalances=new Map<string,number>();
    for(const branch of createdBranches){for(const [index,product] of productRows.entries()){const quantity=80+(index%7)*10;await tx.insert(branchInventory).values({businessId:business.id,branchId:branch.id,productId:product.id,quantityOnHand:quantity,reorderLevel:10});await tx.insert(stockMovements).values({businessId:business.id,branchId:branch.id,productId:product.id,movementType:"OPENING_STOCK",quantity,quantityBefore:0,quantityAfter:quantity,referenceType:"development_seed",referenceId:business.id,reason:"Realistic development opening stock",performedBy:ownerId});inventoryBalances.set(`${branch.id}:${product.id}`,quantity);}}
    const cashierId=staffIds.get("cashier.ikeja@relay.example")!;const ikejaId=branchIds.get("IKJ")!;
    const [session]=await tx.insert(posSessions).values({businessId:business.id,branchId:ikejaId,cashierId,openingCash:2000000n,status:"CLOSED",openedAt:new Date(Date.now()-8*86400000),closedAt:new Date(),expectedCash:2000000n,actualCash:2000000n,cashDifference:0n}).returning();
    let seededCashSales=0n;
    for(let index=0;index<15;index++){const product=productRows[index%productRows.length];const quantity=1+(index%3);const total=product.sellingPrice*BigInt(quantity);const createdAt=new Date(Date.now()-(14-index)*12*60*60*1000);const paymentMethod=index%3===0?"CASH":index%3===1?"CARD":"BANK_TRANSFER";if(paymentMethod==="CASH")seededCashSales+=total;const[sale]=await tx.insert(sales).values({businessId:business.id,branchId:ikejaId,posSessionId:session.id,cashierId,saleNumber:`SEED-SAL-${String(index+1).padStart(4,"0")}`,subtotal:total,total,idempotencyKey:`seed-checkout-${String(index+1).padStart(4,"0")}`,createdAt,completedAt:createdAt}).returning();await tx.insert(saleItems).values({saleId:sale.id,productId:product.id,productNameSnapshot:product.name,skuSnapshot:product.sku,quantity,unitPrice:product.sellingPrice,costPriceSnapshot:product.costPrice,lineTotal:total});await tx.insert(payments).values({businessId:business.id,branchId:ikejaId,saleId:sale.id,posSessionId:session.id,paymentMethod,amount:total,receivedBy:cashierId,createdAt});const key=`${ikejaId}:${product.id}`;const before=inventoryBalances.get(key)!;const after=before-quantity;inventoryBalances.set(key,after);await tx.update(branchInventory).set({quantityOnHand:after}).where(sql`${branchInventory.branchId}=${ikejaId} and ${branchInventory.productId}=${product.id}`);await tx.insert(stockMovements).values({businessId:business.id,branchId:ikejaId,productId:product.id,movementType:"SALE",quantity:-quantity,quantityBefore:before,quantityAfter:after,referenceType:"sale",referenceId:sale.id,performedBy:cashierId,createdAt});}
    await tx.update(posSessions).set({expectedCash:2000000n+seededCashSales,actualCash:2000000n+seededCashSales,cashDifference:0n}).where(sql`${posSessions.id}=${session.id}`);
    await tx.insert(auditLogs).values({ businessId: business.id, userId: ownerId, action: "development.seeded", entityType: "business", entityId: business.id, metadata: { staffCount: staff.length, branchCount: createdBranches.length,productCount:productRows.length,saleCount:15 } });
  });
  console.info("Development retail data seeded.");
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database seed failed.");
  process.exitCode = 1;
});
