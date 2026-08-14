"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseMoney } from "@/lib/money";
import { withToast } from "@/lib/toast";
import { requireBranchAccess } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";
import { adjustStock, receiveStock } from "./service";

const receiveSchema = z.object({ branchId: z.uuid(), productId: z.uuid(), quantity: z.coerce.number().int().positive(), unitCost: z.string().regex(/^\d+(\.\d{1,2})?$/), supplierReference: z.string().trim().max(120).optional(), notes: z.string().trim().max(500).optional() });
export async function receiveStockAction(formData: FormData) {
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/inventory/receive?error=Check+the+receipt+details.");
  const access = await requireBranchAccess(parsed.data.branchId); if (!hasPermission(access.role, "inventory:manage", access.permissions) || !["OWNER", "ADMIN", "BRANCH_MANAGER", "STOREKEEPER"].includes(access.role)) redirect("/overview");
  await receiveStock({ businessId: access.business.id, branchId: access.branch.id, userId: access.user.id, supplierReference: parsed.data.supplierReference, notes: parsed.data.notes, items: [{ productId: parsed.data.productId, quantity: parsed.data.quantity, unitCost: parseMoney(parsed.data.unitCost) }] });
  revalidatePath("/inventory"); redirect(withToast("/inventory", "Stock received successfully."));
}
const adjustSchema = z.object({ branchId: z.uuid(), productId: z.uuid(), newQuantity: z.coerce.number().int().min(0), reason: z.string().trim().min(3).max(500) });
export async function adjustStockAction(formData: FormData) { const parsed = adjustSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) redirect("/inventory/adjust?error=Check+the+adjustment+details."); const access = await requireBranchAccess(parsed.data.branchId); if (!hasPermission(access.role, "inventory:manage", access.permissions) || !["OWNER", "ADMIN", "BRANCH_MANAGER", "STOREKEEPER"].includes(access.role)) redirect("/overview"); await adjustStock({ businessId: access.business.id, branchId: access.branch.id, productId: parsed.data.productId, userId: access.user.id, newQuantity: parsed.data.newQuantity, reason: parsed.data.reason }); revalidatePath("/inventory"); redirect(withToast("/inventory", "Inventory adjustment recorded.")); }
