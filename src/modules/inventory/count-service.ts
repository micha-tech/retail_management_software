import "server-only";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@/db/client";
import { auditLogs, branchInventory, inventoryCountItems, inventoryCounts, posSessions, products, stockMovements } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { inventoryBranchLock } from "./count-guard";

type CountEntry = { itemId: string; countedQuantity: number; notes?: string };
type ImportedCountEntry = { sku: string; countedQuantity: number; notes?: string };

export async function createInventoryCount(input: { businessId: string; branchId: string; userId: string; notes?: string }) {
  const countNumber = `CNT-${Date.now()}-${randomUUID().slice(0,6).toUpperCase()}`;
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(inventoryBranchLock(input.branchId));
      const [count] = await tx.insert(inventoryCounts).values({ businessId: input.businessId, branchId: input.branchId, countNumber, notes: input.notes?.trim() || null, createdBy: input.userId }).returning();
      await tx.insert(auditLogs).values({ businessId: input.businessId, branchId: input.branchId, userId: input.userId, action: "inventory_count.created", entityType: "inventory_count", entityId: count.id, metadata: { countNumber } });
      return count;
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new ApplicationError("This branch already has an open inventory count.", "INVENTORY_COUNT_ACTIVE", 409);
    throw error;
  }
}

export async function startInventoryCount(input: { businessId: string; branchId: string; countId: string; userId: string }) {
  return db.transaction(async (tx) => {
    await tx.execute(inventoryBranchLock(input.branchId));
    const locked = await tx.execute<{ id:string; status:string; count_number:string }>(sql`select id,status,count_number from inventory_counts where id=${input.countId} and business_id=${input.businessId} and branch_id=${input.branchId} for update`);
    if (!locked[0] || locked[0].status !== "DRAFT") throw new ApplicationError("Only a draft count can be started.", "INVALID_COUNT_STATE", 409);
    const openSession = await tx.select({ id:posSessions.id }).from(posSessions).where(and(eq(posSessions.branchId,input.branchId),eq(posSessions.status,"OPEN"))).limit(1);
    if (openSession[0]) throw new ApplicationError("Close all POS sessions at this branch before starting the count.", "POS_SESSION_OPEN", 409);
    const catalogue = await tx.select({ productId:products.id,productName:products.name,sku:products.sku,expected:branchInventory.quantityOnHand }).from(products).leftJoin(branchInventory,and(eq(branchInventory.productId,products.id),eq(branchInventory.branchId,input.branchId))).where(and(eq(products.businessId,input.businessId),eq(products.active,true),eq(products.trackInventory,true))).orderBy(asc(products.id)).limit(5_001);
    if (!catalogue.length) throw new ApplicationError("Add tracked products before starting an inventory count.", "EMPTY_COUNT");
    if (catalogue.length > 5_000) throw new ApplicationError("This count exceeds the 5,000-product safety limit. Split the catalogue before counting.", "COUNT_TOO_LARGE");
    await tx.insert(inventoryCountItems).values(catalogue.map((product) => ({ businessId:input.businessId,branchId:input.branchId,countId:input.countId,productId:product.productId,productNameSnapshot:product.productName,skuSnapshot:product.sku,expectedQuantity:product.expected ?? 0 })));
    const [count] = await tx.update(inventoryCounts).set({ status:"COUNTING",startedBy:input.userId,startedAt:new Date(),updatedAt:new Date() }).where(eq(inventoryCounts.id,input.countId)).returning();
    await tx.insert(auditLogs).values({ businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.started",entityType:"inventory_count",entityId:input.countId,metadata:{countNumber:locked[0].count_number,itemCount:catalogue.length} });
    return count;
  });
}

async function ensureCountingCount(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], input: { businessId:string;branchId:string;countId:string }) {
  const locked = await tx.execute<{ id:string;status:string }>(sql`select id,status from inventory_counts where id=${input.countId} and business_id=${input.businessId} and branch_id=${input.branchId} for update`);
  if (!locked[0] || locked[0].status !== "COUNTING") throw new ApplicationError("This inventory count is not accepting quantities.", "INVALID_COUNT_STATE", 409);
}

export async function saveInventoryCountEntries(input: { businessId:string;branchId:string;countId:string;userId:string;entries:CountEntry[] }) {
  if (!input.entries.length || input.entries.length > 5_000 || new Set(input.entries.map((entry)=>entry.itemId)).size !== input.entries.length || input.entries.some((entry)=>!Number.isSafeInteger(entry.countedQuantity)||entry.countedQuantity<0||entry.countedQuantity>2_000_000_000||(entry.notes?.length??0)>500)) throw new ApplicationError("Count entries are invalid.", "INVALID_COUNT_ENTRIES");
  return db.transaction(async (tx) => {
    await ensureCountingCount(tx,input);
    const records = await tx.select({id:inventoryCountItems.id,expected:inventoryCountItems.expectedQuantity}).from(inventoryCountItems).where(and(eq(inventoryCountItems.countId,input.countId),inArray(inventoryCountItems.id,input.entries.map((entry)=>entry.itemId))));
    if (records.length !== input.entries.length) throw new ApplicationError("One or more count rows are unavailable.", "INVALID_COUNT_ENTRIES");
    const expectedById = new Map(records.map((record)=>[record.id,record.expected]));
    for (const entry of input.entries) await tx.update(inventoryCountItems).set({ countedQuantity:entry.countedQuantity,varianceQuantity:entry.countedQuantity-expectedById.get(entry.itemId)!,notes:entry.notes?.trim()||null,countedBy:input.userId,countedAt:new Date(),updatedAt:new Date() }).where(and(eq(inventoryCountItems.id,entry.itemId),eq(inventoryCountItems.countId,input.countId)));
    await tx.update(inventoryCounts).set({updatedAt:new Date()}).where(eq(inventoryCounts.id,input.countId));
    return records.length;
  });
}

export async function importInventoryCountEntries(input: { businessId:string;branchId:string;countId:string;userId:string;entries:ImportedCountEntry[] }) {
  if (!input.entries.length || input.entries.length > 5_000 || new Set(input.entries.map((entry)=>entry.sku.toUpperCase())).size !== input.entries.length || input.entries.some((entry)=>!entry.sku||!Number.isSafeInteger(entry.countedQuantity)||entry.countedQuantity<0||entry.countedQuantity>2_000_000_000||(entry.notes?.length??0)>500)) throw new ApplicationError("Imported count rows are invalid or contain duplicate SKUs.", "INVALID_COUNT_IMPORT");
  return db.transaction(async (tx) => {
    await ensureCountingCount(tx,input);
    const normalized = input.entries.map((entry)=>entry.sku.trim().toUpperCase());
    const records = await tx.select({id:inventoryCountItems.id,sku:inventoryCountItems.skuSnapshot,expected:inventoryCountItems.expectedQuantity}).from(inventoryCountItems).where(and(eq(inventoryCountItems.countId,input.countId),inArray(inventoryCountItems.skuSnapshot,normalized)));
    const bySku = new Map(records.map((record)=>[record.sku.toUpperCase(),record]));
    const unknown = normalized.filter((sku)=>!bySku.has(sku));
    if (unknown.length) throw new ApplicationError(`Unknown SKU in count file: ${unknown.slice(0,5).join(", ")}.`, "UNKNOWN_COUNT_SKU");
    for (const entry of input.entries) { const record=bySku.get(entry.sku.trim().toUpperCase())!; await tx.update(inventoryCountItems).set({countedQuantity:entry.countedQuantity,varianceQuantity:entry.countedQuantity-record.expected,notes:entry.notes?.trim()||null,countedBy:input.userId,countedAt:new Date(),updatedAt:new Date()}).where(eq(inventoryCountItems.id,record.id)); }
    await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.imported",entityType:"inventory_count",entityId:input.countId,metadata:{rowCount:input.entries.length}});
    return records.length;
  });
}

export async function submitInventoryCountForReview(input: { businessId:string;branchId:string;countId:string;userId:string }) {
  return db.transaction(async (tx) => {
    await ensureCountingCount(tx,input);
    const missing = await tx.select({id:inventoryCountItems.id}).from(inventoryCountItems).where(and(eq(inventoryCountItems.countId,input.countId),isNull(inventoryCountItems.countedQuantity))).limit(1);
    if (missing[0]) throw new ApplicationError("Every product needs a physical quantity before review.", "COUNT_INCOMPLETE");
    const [count]=await tx.update(inventoryCounts).set({status:"REVIEW",reviewedBy:input.userId,reviewedAt:new Date(),updatedAt:new Date()}).where(eq(inventoryCounts.id,input.countId)).returning();
    await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.reviewed",entityType:"inventory_count",entityId:input.countId,metadata:{}});
    return count;
  });
}

export async function reopenInventoryCount(input: { businessId:string;branchId:string;countId:string;userId:string }) {
  return db.transaction(async (tx)=>{const locked=await tx.execute<{id:string;status:string}>(sql`select id,status from inventory_counts where id=${input.countId} and business_id=${input.businessId} and branch_id=${input.branchId} for update`);if(!locked[0]||locked[0].status!=="REVIEW")throw new ApplicationError("Only a count under review can be reopened.","INVALID_COUNT_STATE",409);const[count]=await tx.update(inventoryCounts).set({status:"COUNTING",reviewedBy:null,reviewedAt:null,updatedAt:new Date()}).where(eq(inventoryCounts.id,input.countId)).returning();await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.reopened",entityType:"inventory_count",entityId:input.countId,metadata:{}});return count;});
}

export async function postInventoryCount(input: { businessId:string;branchId:string;countId:string;userId:string }) {
  return db.transaction(async (tx) => {
    await tx.execute(inventoryBranchLock(input.branchId));
    const locked=await tx.execute<{id:string;status:string;count_number:string}>(sql`select id,status,count_number from inventory_counts where id=${input.countId} and business_id=${input.businessId} and branch_id=${input.branchId} for update`);
    if(!locked[0]||locked[0].status!=="REVIEW")throw new ApplicationError("Only a reviewed count can be posted.","INVALID_COUNT_STATE",409);
    const items=await tx.select().from(inventoryCountItems).where(eq(inventoryCountItems.countId,input.countId)).orderBy(asc(inventoryCountItems.productId));
    if(!items.length||items.some((item)=>item.countedQuantity===null))throw new ApplicationError("The count is incomplete.","COUNT_INCOMPLETE");
    let adjustedItems=0;let netAdjustment=0;
    for(const item of items){await tx.insert(branchInventory).values({businessId:input.businessId,branchId:input.branchId,productId:item.productId,quantityOnHand:0}).onConflictDoNothing();const rows=await tx.execute<{quantity_on_hand:number}>(sql`select quantity_on_hand from branch_inventory where business_id=${input.businessId} and branch_id=${input.branchId} and product_id=${item.productId} for update`);const before=rows[0]?.quantity_on_hand;if(before===undefined)throw new ApplicationError("Inventory balance is unavailable.","INVENTORY_NOT_FOUND");if(before!==item.expectedQuantity)throw new ApplicationError(`Inventory changed during the count for ${item.skuSnapshot}. Cancel this count and create a new one.`,"COUNT_SNAPSHOT_STALE",409);const adjustment=item.countedQuantity!-before;if(adjustment!==0){await tx.update(branchInventory).set({quantityOnHand:item.countedQuantity!,updatedAt:new Date()}).where(and(eq(branchInventory.branchId,input.branchId),eq(branchInventory.productId,item.productId)));await tx.insert(stockMovements).values({businessId:input.businessId,branchId:input.branchId,productId:item.productId,movementType:"CORRECTION",quantity:adjustment,quantityBefore:before,quantityAfter:item.countedQuantity!,referenceType:"inventory_count",referenceId:input.countId,reason:`Posted inventory count ${locked[0].count_number}`,performedBy:input.userId});adjustedItems+=1;netAdjustment+=adjustment;}await tx.update(inventoryCountItems).set({postingQuantityBefore:before,postedAdjustment:adjustment,updatedAt:new Date()}).where(eq(inventoryCountItems.id,item.id));}
    const[count]=await tx.update(inventoryCounts).set({status:"POSTED",postedBy:input.userId,postedAt:new Date(),updatedAt:new Date()}).where(eq(inventoryCounts.id,input.countId)).returning();
    await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.posted",entityType:"inventory_count",entityId:input.countId,metadata:{adjustedItems,netAdjustment}});
    return count;
  });
}

export async function cancelInventoryCount(input:{businessId:string;branchId:string;countId:string;userId:string}){return db.transaction(async(tx)=>{await tx.execute(inventoryBranchLock(input.branchId));const locked=await tx.execute<{id:string;status:string}>(sql`select id,status from inventory_counts where id=${input.countId} and business_id=${input.businessId} and branch_id=${input.branchId} for update`);if(!locked[0]||!["DRAFT","COUNTING","REVIEW"].includes(locked[0].status))throw new ApplicationError("This count cannot be cancelled.","INVALID_COUNT_STATE",409);const[count]=await tx.update(inventoryCounts).set({status:"CANCELLED",cancelledAt:new Date(),updatedAt:new Date()}).where(eq(inventoryCounts.id,input.countId)).returning();await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"inventory_count.cancelled",entityType:"inventory_count",entityId:input.countId,metadata:{}});return count;});}
