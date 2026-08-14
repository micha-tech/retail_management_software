"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/modules/auth/authorization";
import { voidSale } from "./reversal";
export async function voidSaleAction(formData:FormData){const access=await requirePermission("sales:read");if(!["OWNER","ADMIN"].includes(access.role))redirect("/sales");const parsed=z.object({saleId:z.uuid(),reason:z.string().trim().min(5).max(500)}).safeParse(Object.fromEntries(formData));if(!parsed.success)redirect(`/sales/${String(formData.get("saleId"))}?error=A+detailed+reason+is+required.`);await voidSale({businessId:access.business.id,saleId:parsed.data.saleId,userId:access.user.id,reason:parsed.data.reason});revalidatePath("/sales");redirect(`/sales/${parsed.data.saleId}`);}
