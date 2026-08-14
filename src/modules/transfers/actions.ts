"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { stockTransfers } from "@/db/schema";
import { withToast } from "@/lib/toast";
import { requireBranchAccess, requirePermission } from "@/modules/auth/authorization";
import { createTransfer, dispatchTransfer, receiveTransfer } from "./service";
export async function createTransferAction(formData:FormData){const access=await requirePermission("inventory:manage");const parsed=z.object({sourceBranchId:z.uuid(),destinationBranchId:z.uuid(),productId:z.uuid(),quantity:z.coerce.number().int().positive(),notes:z.string().trim().max(500).optional()}).safeParse(Object.fromEntries(formData));if(!parsed.success)redirect("/transfers/new?error=Check+the+transfer+details.");await Promise.all([requireBranchAccess(parsed.data.sourceBranchId),requireBranchAccess(parsed.data.destinationBranchId)]);await createTransfer({businessId:access.business.id,sourceBranchId:parsed.data.sourceBranchId,destinationBranchId:parsed.data.destinationBranchId,userId:access.user.id,notes:parsed.data.notes,items:[{productId:parsed.data.productId,quantity:parsed.data.quantity}]});revalidatePath("/transfers");redirect(withToast("/transfers", "Transfer draft created successfully."));}
export async function dispatchTransferAction(formData:FormData){const access=await requirePermission("inventory:manage");const id=z.uuid().parse(formData.get("transferId"));const [record]=await db.select().from(stockTransfers).where(and(eq(stockTransfers.id,id),eq(stockTransfers.businessId,access.business.id))).limit(1);if(!record)redirect("/transfers");await requireBranchAccess(record.sourceBranchId);await dispatchTransfer({businessId:access.business.id,transferId:id,userId:access.user.id});revalidatePath("/transfers");redirect(withToast("/transfers", "Transfer dispatched successfully."));}
export async function receiveTransferAction(formData:FormData){const access=await requirePermission("inventory:manage");const id=z.uuid().parse(formData.get("transferId"));const [record]=await db.select().from(stockTransfers).where(and(eq(stockTransfers.id,id),eq(stockTransfers.businessId,access.business.id))).limit(1);if(!record)redirect("/transfers");await requireBranchAccess(record.destinationBranchId);await receiveTransfer({businessId:access.business.id,transferId:id,userId:access.user.id});revalidatePath("/transfers");redirect(withToast("/transfers", "Transfer received and inventory updated."));}
