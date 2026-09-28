"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApplicationError } from "@/lib/errors";
import { withToast } from "@/lib/toast";
import { requirePermission } from "@/modules/auth/authorization";
import { voidSale } from "./reversal";
export async function voidSaleAction(formData:FormData){const access=await requirePermission("sales:read");if(!["OWNER","ADMIN"].includes(access.role))redirect("/sales");const parsed=z.object({saleId:z.uuid(),reason:z.string().trim().min(5).max(500)}).safeParse(Object.fromEntries(formData));if(!parsed.success)redirect(`/sales/${String(formData.get("saleId"))}?error=A+detailed+reason+is+required.`);try{await voidSale({businessId:access.business.id,saleId:parsed.data.saleId,userId:access.user.id,reason:parsed.data.reason});}catch(error){const message=error instanceof ApplicationError?error.message:"The sale could not be voided.";redirect(`/sales/${parsed.data.saleId}?error=${encodeURIComponent(message)}`);}revalidatePath("/sales");redirect(withToast(`/sales/${parsed.data.saleId}`, "Sale voided and inventory restored."));}
