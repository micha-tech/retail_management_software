import { and, asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { branches, inventoryCountItems, inventoryCounts } from "@/db/schema";
import { csvDocument } from "@/lib/csv";
import { requireBranchAccess, requirePermission } from "@/modules/auth/authorization";

export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){const access=await requirePermission("inventory:read");const{id}=await params;const[count]=await db.select({id:inventoryCounts.id,businessId:inventoryCounts.businessId,branchId:inventoryCounts.branchId,countNumber:inventoryCounts.countNumber,status:inventoryCounts.status,branchCode:branches.code,branchName:branches.name}).from(inventoryCounts).innerJoin(branches,eq(branches.id,inventoryCounts.branchId)).where(and(eq(inventoryCounts.id,id),eq(inventoryCounts.businessId,access.business.id))).limit(1);if(!count)notFound();await requireBranchAccess(count.branchId);const items=await db.select().from(inventoryCountItems).where(eq(inventoryCountItems.countId,count.id)).orderBy(asc(inventoryCountItems.skuSnapshot));const body=csvDocument(["count_number","status","branch_code","branch_name","sku","product_name","expected_quantity","counted_quantity","variance_quantity","posting_quantity_before","posted_adjustment","notes"],items.map((item)=>[count.countNumber,count.status,count.branchCode,count.branchName,item.skuSnapshot,item.productNameSnapshot,item.expectedQuantity,item.countedQuantity,item.varianceQuantity,item.postingQuantityBefore,item.postedAdjustment,item.notes]));return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${count.countNumber.toLowerCase()}.csv"`,"Cache-Control":"private, no-store"}});}
