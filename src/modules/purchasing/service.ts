import "server-only";
import { and, eq, inArray, sql, sum } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { auditLogs, branchInventory, products, purchaseOrderItems, purchaseOrderPayments, purchaseOrders, stockMovements, stockReceiptItems, stockReceipts, suppliers } from "@/db/schema";
import { ApplicationError } from "@/lib/errors";
import { activeInventoryCount, inventoryBranchLock } from "@/modules/inventory/count-guard";

export type PurchaseLine = { productId: string; quantity: number; unitCost: bigint };

export async function createSupplier(input:{businessId:string;userId:string;name:string;contactName?:string;phone?:string;email?:string;address?:string;taxId?:string;paymentTermsDays:number;leadTimeDays:number;notes?:string}) {
  const [supplier]=await db.insert(suppliers).values({businessId:input.businessId,name:input.name.trim(),contactName:input.contactName?.trim()||null,phone:input.phone?.trim()||null,email:input.email?.trim().toLowerCase()||null,address:input.address?.trim()||null,taxId:input.taxId?.trim()||null,paymentTermsDays:input.paymentTermsDays,leadTimeDays:input.leadTimeDays,notes:input.notes?.trim()||null}).returning();
  await db.insert(auditLogs).values({businessId:input.businessId,userId:input.userId,action:"supplier.created",entityType:"supplier",entityId:supplier.id,metadata:{name:supplier.name}});
  return supplier;
}

export async function createPurchaseOrder(input:{businessId:string;branchId:string;supplierId:string;userId:string;expectedAt?:Date;notes?:string;lines:PurchaseLine[]}) {
  if(!input.lines.length||new Set(input.lines.map(x=>x.productId)).size!==input.lines.length)throw new ApplicationError("Add at least one unique product.","INVALID_PURCHASE_ORDER");
  return db.transaction(async tx=>{
    const [supplier]=await tx.select({id:suppliers.id}).from(suppliers).where(and(eq(suppliers.id,input.supplierId),eq(suppliers.businessId,input.businessId),eq(suppliers.active,true))).limit(1);
    if(!supplier)throw new ApplicationError("Supplier is unavailable.","INVALID_SUPPLIER");
    const catalogue=await tx.select({id:products.id,name:products.name,sku:products.sku,active:products.active}).from(products).where(and(eq(products.businessId,input.businessId),inArray(products.id,input.lines.map(x=>x.productId))));
    if(catalogue.length!==input.lines.length||catalogue.some(x=>!x.active))throw new ApplicationError("One or more products are unavailable.","INVALID_PRODUCT");
    if(input.lines.some(x=>!Number.isInteger(x.quantity)||x.quantity<=0||x.unitCost<0n))throw new ApplicationError("Order quantities and costs are invalid.","INVALID_PURCHASE_ORDER");
    const orderNumber=`PO-${Date.now()}-${randomUUID().slice(0,5).toUpperCase()}`;
    const [order]=await tx.insert(purchaseOrders).values({businessId:input.businessId,branchId:input.branchId,supplierId:input.supplierId,orderNumber,expectedAt:input.expectedAt,notes:input.notes?.trim()||null,createdBy:input.userId}).returning();
    await tx.insert(purchaseOrderItems).values(input.lines.map(line=>{const product=catalogue.find(x=>x.id===line.productId)!;return{purchaseOrderId:order.id,productId:line.productId,productNameSnapshot:product.name,skuSnapshot:product.sku,orderedQuantity:line.quantity,unitCost:line.unitCost};}));
    await tx.insert(auditLogs).values({businessId:input.businessId,branchId:input.branchId,userId:input.userId,action:"purchase_order.created",entityType:"purchase_order",entityId:order.id,metadata:{orderNumber,lineCount:input.lines.length}});
    return order;
  });
}

export async function placePurchaseOrder(input:{businessId:string;orderId:string;userId:string}) {
  return db.transaction(async tx=>{const rows=await tx.execute<{id:string;branch_id:string;status:string}>(sql`select id,branch_id,status::text from purchase_orders where id=${input.orderId} and business_id=${input.businessId} for update`);const order=rows[0];if(!order||order.status!=="DRAFT")throw new ApplicationError("Only a draft order can be placed.","INVALID_ORDER_STATE",409);await tx.update(purchaseOrders).set({status:"ORDERED",orderedAt:new Date(),orderedBy:input.userId,updatedAt:new Date()}).where(eq(purchaseOrders.id,input.orderId));await tx.insert(auditLogs).values({businessId:input.businessId,branchId:order.branch_id,userId:input.userId,action:"purchase_order.placed",entityType:"purchase_order",entityId:input.orderId,metadata:{}});});
}

export async function receivePurchaseOrder(input:{businessId:string;orderId:string;userId:string;supplierReference?:string;notes?:string;items:{itemId:string;quantity:number}[]}) {
  const positive=input.items.filter(x=>Number.isInteger(x.quantity)&&x.quantity>0);if(!positive.length)throw new ApplicationError("Enter at least one received quantity.","EMPTY_RECEIPT");
  return db.transaction(async tx=>{
    const rows=await tx.execute<{id:string;branch_id:string;status:string}>(sql`select id,branch_id,status::text from purchase_orders where id=${input.orderId} and business_id=${input.businessId} for update`);const order=rows[0];
    if(!order||!["ORDERED","PARTIALLY_RECEIVED"].includes(order.status))throw new ApplicationError("This order is not open for receiving.","INVALID_ORDER_STATE",409);
    await tx.execute(inventoryBranchLock(order.branch_id));const active=await tx.execute<{count_number:string}>(activeInventoryCount(order.branch_id));if(active[0])throw new ApplicationError(`Inventory count ${active[0].count_number} is active. Receiving is paused.`,"INVENTORY_COUNT_ACTIVE",409);
    const lines=await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId,input.orderId));
    const byId=new Map(lines.map(x=>[x.id,x]));for(const entry of positive){const line=byId.get(entry.itemId);if(!line||entry.quantity>line.orderedQuantity-line.receivedQuantity)throw new ApplicationError("A received quantity exceeds the outstanding order quantity.","OVER_RECEIPT");}
    const receiptNumber=`RCV-${Date.now()}-${randomUUID().slice(0,5).toUpperCase()}`;const [receipt]=await tx.insert(stockReceipts).values({businessId:input.businessId,branchId:order.branch_id,purchaseOrderId:input.orderId,receiptNumber,supplierReference:input.supplierReference?.trim()||null,notes:input.notes?.trim()||null,receivedBy:input.userId}).returning();
    for(const entry of positive){const line=byId.get(entry.itemId)!;await tx.insert(stockReceiptItems).values({receiptId:receipt.id,productId:line.productId,quantity:entry.quantity,unitCost:line.unitCost});const[balance]=await tx.insert(branchInventory).values({businessId:input.businessId,branchId:order.branch_id,productId:line.productId,quantityOnHand:entry.quantity}).onConflictDoUpdate({target:[branchInventory.branchId,branchInventory.productId],set:{quantityOnHand:sql`${branchInventory.quantityOnHand}+${entry.quantity}`,updatedAt:new Date()}}).returning({after:branchInventory.quantityOnHand});await tx.insert(stockMovements).values({businessId:input.businessId,branchId:order.branch_id,productId:line.productId,movementType:"STOCK_RECEIVED",quantity:entry.quantity,quantityBefore:balance.after-entry.quantity,quantityAfter:balance.after,referenceType:"purchase_order",referenceId:input.orderId,performedBy:input.userId});await tx.update(purchaseOrderItems).set({receivedQuantity:sql`${purchaseOrderItems.receivedQuantity}+${entry.quantity}`}).where(eq(purchaseOrderItems.id,entry.itemId));await tx.update(products).set({costPrice:line.unitCost,updatedAt:new Date()}).where(and(eq(products.id,line.productId),eq(products.businessId,input.businessId)));}
    const outstanding=await tx.execute<{remaining:string}>(sql`select coalesce(sum(ordered_quantity-received_quantity),0)::text remaining from purchase_order_items where purchase_order_id=${input.orderId}`);const complete=BigInt(outstanding[0]?.remaining??"0")===0n;await tx.update(purchaseOrders).set({status:complete?"RECEIVED":"PARTIALLY_RECEIVED",completedAt:complete?new Date():null,updatedAt:new Date()}).where(eq(purchaseOrders.id,input.orderId));await tx.insert(auditLogs).values({businessId:input.businessId,branchId:order.branch_id,userId:input.userId,action:"purchase_order.received",entityType:"purchase_order",entityId:input.orderId,metadata:{receiptId:receipt.id,receiptNumber,lineCount:positive.length,complete}});return receipt;
  });
}

export async function recordPurchasePayment(input:{businessId:string;orderId:string;userId:string;amount:bigint;paymentMethod:"CASH"|"BANK_TRANSFER"|"CARD"|"MOBILE_MONEY"|"OTHER";reference?:string;notes?:string}) {
  if(input.amount<=0n)throw new ApplicationError("Payment amount must be positive.","INVALID_PAYMENT");return db.transaction(async tx=>{const rows=await tx.execute<{id:string;branch_id:string;status:string}>(sql`select id,branch_id,status::text from purchase_orders where id=${input.orderId} and business_id=${input.businessId} for update`);const order=rows[0];if(!order)throw new ApplicationError("Purchase order not found.","ORDER_NOT_FOUND",404);if(order.status==="DRAFT"||order.status==="CANCELLED")throw new ApplicationError("Payments can only be recorded against an active order.","INVALID_ORDER_STATE",409);const [totalRow]=await tx.select({total:sql<bigint>`coalesce(sum(${purchaseOrderItems.orderedQuantity}*${purchaseOrderItems.unitCost}),0)`}).from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId,input.orderId));const [paidRow]=await tx.select({paid:sum(purchaseOrderPayments.amount)}).from(purchaseOrderPayments).where(eq(purchaseOrderPayments.purchaseOrderId,input.orderId));const outstanding=BigInt(totalRow?.total??0)-BigInt(paidRow?.paid??0);if(input.amount>outstanding)throw new ApplicationError("Payment exceeds the outstanding order balance.","OVERPAYMENT");const[payment]=await tx.insert(purchaseOrderPayments).values({businessId:input.businessId,purchaseOrderId:input.orderId,amount:input.amount,paymentMethod:input.paymentMethod,reference:input.reference?.trim()||null,notes:input.notes?.trim()||null,paidBy:input.userId}).returning();await tx.insert(auditLogs).values({businessId:input.businessId,branchId:order.branch_id,userId:input.userId,action:"purchase_order.payment_recorded",entityType:"purchase_order_payment",entityId:payment.id,metadata:{orderId:input.orderId,amount:input.amount.toString(),paymentMethod:input.paymentMethod}});return payment;});
}
