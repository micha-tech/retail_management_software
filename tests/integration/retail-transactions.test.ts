import { randomUUID } from "node:crypto";
import { and, eq, sum } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDatabase, db } from "@/db/client";
import { branchAssignments, branchInventory, branches, businessMemberships, businesses, categories, inventoryCountItems, payments, posSessions, products, sales, stockMovements, users } from "@/db/schema";
import { createInventoryCount, importInventoryCountEntries, postInventoryCount, startInventoryCount, submitInventoryCountForReview } from "@/modules/inventory/count-service";
import { receiveStock } from "@/modules/inventory/service";
import { checkout, closePosSession, openPosSession } from "@/modules/pos/service";
import { voidSale } from "@/modules/sales/reversal";
import { createTransfer, dispatchTransfer, receiveTransfer } from "@/modules/transfers/service";

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const suite = enabled ? describe : describe.skip;

suite("transactional retail workflows", () => {
  const fixture = { businessId: "", sourceId: "", destinationId: "", userId: "", productId: "", sessionId: "", firstSaleId: "" };

  beforeAll(async () => {
    const suffix = randomUUID().slice(0,8);
    const [user] = await db.insert(users).values({ name: "Integration Owner", email: `integration-${suffix}@example.test`, passwordHash: "integration-test-only" }).returning();
    const [business] = await db.insert(businesses).values({ name: `Integration ${suffix}`, currency: "NGN", timezone: "Africa/Lagos" }).returning();
    await db.insert(businessMemberships).values({ businessId: business.id, userId: user.id, role: "OWNER" });
    const [source,destination] = await db.insert(branches).values([{ businessId: business.id, name: "Source", code: `S${suffix.toUpperCase()}`, timezone: "Africa/Lagos" },{ businessId: business.id, name: "Destination", code: `D${suffix.toUpperCase()}`, timezone: "Africa/Lagos" }]).returning();
    await db.insert(branchAssignments).values([{ businessId: business.id, branchId: source.id, userId: user.id },{ businessId: business.id, branchId: destination.id, userId: user.id }]);
    const [category] = await db.insert(categories).values({ businessId: business.id, name: `Beverages ${suffix}` }).returning();
    const [product] = await db.insert(products).values({ businessId: business.id, categoryId: category.id, name: "Integration Cola", sku: `COLA-${suffix}`, sellingPrice: 50_000n, costPrice: 30_000n, trackInventory: true }).returning();
    Object.assign(fixture,{businessId:business.id,sourceId:source.id,destinationId:destination.id,userId:user.id,productId:product.id});
  });

  afterAll(async () => { if (enabled) await closeDatabase(); });

  it("receives stock atomically with a branch balance", async () => {
    await receiveStock({ businessId: fixture.businessId, branchId: fixture.sourceId, userId: fixture.userId, items: [{ productId: fixture.productId, quantity: 10, unitCost: 30_000n }] });
    const [balance] = await db.select().from(branchInventory).where(and(eq(branchInventory.branchId,fixture.sourceId),eq(branchInventory.productId,fixture.productId)));
    expect(balance.quantityOnHand).toBe(10);
  });

  it("checks out once for repeated idempotency keys", async () => {
    const session = await openPosSession({ businessId: fixture.businessId, branchId: fixture.sourceId, cashierId: fixture.userId, openingCash: 200_000n });
    fixture.sessionId = session.id;
    const input = { businessId: fixture.businessId, branchId: fixture.sourceId, cashierId: fixture.userId, sessionId: session.id, idempotencyKey: randomUUID(), discountTotal: 100n, items: [{ productId: fixture.productId, quantity: 3 }], payments: [{ method: "CASH" as const, amount: 149_900n }] };
    const [first,retry] = await Promise.all([checkout(input),checkout(input)]);
    fixture.firstSaleId = first.id;
    expect(retry.id).toBe(first.id);
    const matching = await db.select().from(sales).where(and(eq(sales.businessId,fixture.businessId),eq(sales.idempotencyKey,input.idempotencyKey)));
    expect(matching).toHaveLength(1);
  });

  it("allows only one competing sale when stock is insufficient for both", async () => {
    const createInput = (idempotencyKey:string) => ({ businessId: fixture.businessId, branchId: fixture.sourceId, cashierId: fixture.userId, sessionId: fixture.sessionId, idempotencyKey, items: [{ productId: fixture.productId, quantity: 5 }], payments: [{ method: "CASH" as const, amount: 250_000n }] });
    const outcomes = await Promise.allSettled([checkout(createInput(randomUUID())),checkout(createInput(randomUUID()))]);
    expect(outcomes.filter((outcome)=>outcome.status==="fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome)=>outcome.status==="rejected")).toHaveLength(1);
  });

  it("dispatches and receives a transfer with both balances updated", async () => {
    const transfer = await createTransfer({ businessId: fixture.businessId, sourceBranchId: fixture.sourceId, destinationBranchId: fixture.destinationId, userId: fixture.userId, items: [{ productId: fixture.productId, quantity: 2 }] });
    await dispatchTransfer({ businessId: fixture.businessId, transferId: transfer.id, userId: fixture.userId });
    await receiveTransfer({ businessId: fixture.businessId, transferId: transfer.id, userId: fixture.userId });
    const balances = await db.select().from(branchInventory).where(eq(branchInventory.productId,fixture.productId));
    expect(balances.find((balance)=>balance.branchId===fixture.sourceId)?.quantityOnHand).toBe(0);
    expect(balances.find((balance)=>balance.branchId===fixture.destinationId)?.quantityOnHand).toBe(2);
  });

  it("voids without deleting history and closes the till exactly", async () => {
    await voidSale({ businessId: fixture.businessId, saleId: fixture.firstSaleId, userId: fixture.userId, reason: "Integration reversal verification" });
    const [cashSales] = await db.select({ total: sum(payments.amount) }).from(payments).where(and(eq(payments.posSessionId,fixture.sessionId),eq(payments.paymentMethod,"CASH"),eq(payments.status,"COMPLETED")));
    const expected = 200_000n + BigInt(cashSales?.total ?? 0);
    const closed = await closePosSession({ businessId: fixture.businessId, branchId: fixture.sourceId, cashierId: fixture.userId, sessionId: fixture.sessionId, actualCash: expected });
    expect(closed.cashDifference).toBe(0n);
    const [original] = await db.select().from(sales).where(eq(sales.id,fixture.firstSaleId));
    const [session] = await db.select().from(posSessions).where(eq(posSessions.id,fixture.sessionId));
    expect(original.status).toBe("VOIDED");
    expect(session.status).toBe("CLOSED");
  });

  it("pauses branch mutations and posts an audited physical-count correction", async () => {
    const count = await createInventoryCount({ businessId: fixture.businessId, branchId: fixture.destinationId, userId: fixture.userId, notes: "Integration stocktake" });
    await startInventoryCount({ businessId: fixture.businessId, branchId: fixture.destinationId, countId: count.id, userId: fixture.userId });
    await expect(receiveStock({ businessId: fixture.businessId, branchId: fixture.destinationId, userId: fixture.userId, items: [{ productId: fixture.productId, quantity: 1, unitCost: 30_000n }] })).rejects.toThrow(/inventory count/i);
    const [product] = await db.select({ sku: products.sku }).from(products).where(eq(products.id, fixture.productId));
    await importInventoryCountEntries({ businessId: fixture.businessId, branchId: fixture.destinationId, countId: count.id, userId: fixture.userId, entries: [{ sku: product.sku, countedQuantity: 3, notes: "Verified twice" }] });
    await submitInventoryCountForReview({ businessId: fixture.businessId, branchId: fixture.destinationId, countId: count.id, userId: fixture.userId });
    await postInventoryCount({ businessId: fixture.businessId, branchId: fixture.destinationId, countId: count.id, userId: fixture.userId });
    const [balance] = await db.select().from(branchInventory).where(and(eq(branchInventory.branchId, fixture.destinationId), eq(branchInventory.productId, fixture.productId)));
    const [movement] = await db.select().from(stockMovements).where(and(eq(stockMovements.referenceType, "inventory_count"), eq(stockMovements.referenceId, count.id)));
    expect(balance.quantityOnHand).toBe(3);
    expect(movement).toMatchObject({ movementType: "CORRECTION", quantity: 1, quantityBefore: 2, quantityAfter: 3 });
    await expect(db.update(inventoryCountItems).set({ notes: "tamper" }).where(eq(inventoryCountItems.countId, count.id))).rejects.toThrow(/immutable/i);
  });
});
