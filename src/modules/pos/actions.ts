"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApplicationError } from "@/lib/errors";
import { parseMoney } from "@/lib/money";
import { withToast } from "@/lib/toast";
import { requireBranchAccess } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";
import { checkout, closePosSession, openPosSession, recordCashMovement } from "./service";

export type CheckoutState = { error?: string; sale?: { id: string; saleNumber: string; total: string; idempotencyKey: string } };
const paymentMethods = ["CASH", "BANK_TRANSFER", "CARD", "MOBILE_MONEY", "OTHER"] as const;
function canOperatePos(access: Awaited<ReturnType<typeof requireBranchAccess>>) { return hasPermission(access.role, "pos:operate", access.permissions) && (["OWNER", "ADMIN", "BRANCH_MANAGER", "CASHIER"] as string[]).includes(access.role); }
export async function checkoutAction(_state: CheckoutState, formData: FormData): Promise<CheckoutState> { try { const branchId = z.uuid().parse(formData.get("branchId")); const access = await requireBranchAccess(branchId); if (!canOperatePos(access)) return { error: "You cannot operate POS." }; const sessionId = z.uuid().parse(formData.get("sessionId")); const rawItems = z.array(z.object({ productId: z.uuid(), quantity: z.number().int().positive() })).parse(JSON.parse(String(formData.get("items")))); const method = z.enum(paymentMethods).parse(formData.get("paymentMethod")); const idempotencyKey = z.string().min(12).max(100).parse(formData.get("idempotencyKey")); const result = await checkout({ businessId: access.business.id, branchId, cashierId: access.user.id, sessionId, idempotencyKey, discountTotal: parseMoney(String(formData.get("discountAmount") || "0")), items: rawItems, payments: [{ method, amount: parseMoney(String(formData.get("paymentAmount"))), reference: String(formData.get("reference") || "") }] }); return { sale: { id: result.id, saleNumber: result.saleNumber, total: result.total.toString(), idempotencyKey } }; } catch (error) { return { error: error instanceof ApplicationError ? error.message : "Checkout failed. No sale was recorded." }; } }
export async function openSessionAction(formData: FormData) { const branchId = z.uuid().parse(formData.get("branchId")); const access = await requireBranchAccess(branchId); if (!canOperatePos(access)) redirect("/overview"); try { await openPosSession({ businessId: access.business.id, branchId, cashierId: access.user.id, openingCash: parseMoney(String(formData.get("openingCash"))) }); } catch (error) { if ((error as { code?: string }).code === "23505") redirect("/pos?error=You+already+have+an+open+session+at+this+branch."); throw error; } redirect(withToast(`/pos?branch=${branchId}`, "POS session opened.")); }
export async function closeSessionAction(formData: FormData) {
  const branchId = z.uuid().parse(formData.get("branchId"));
  const sessionId = z.uuid().parse(formData.get("sessionId"));
  const access = await requireBranchAccess(branchId);
  if (!canOperatePos(access)) redirect("/overview");
  await closePosSession({ businessId: access.business.id, branchId, cashierId: access.user.id, sessionId, actualCash: parseMoney(String(formData.get("actualCash"))) });
  redirect(withToast(`/pos?branch=${branchId}&report=${sessionId}`, "POS session closed. Daily sales PDF ready."));
}
export async function cashMovementAction(formData: FormData) { const branchId=z.uuid().parse(formData.get("branchId")); const access=await requireBranchAccess(branchId);if(!canOperatePos(access))redirect("/overview"); try { await recordCashMovement({businessId:access.business.id,branchId,cashierId:access.user.id,sessionId:z.uuid().parse(formData.get("sessionId")),type:z.enum(["CASH_IN","CASH_OUT"]).parse(formData.get("type")),amount:parseMoney(String(formData.get("amount"))),reason:z.string().trim().min(3).max(300).parse(formData.get("reason"))}); } catch(error) { const message=error instanceof ApplicationError?error.message:"Cash movement failed."; redirect(`/pos?branch=${branchId}&error=${encodeURIComponent(message)}`); } redirect(withToast(`/pos?branch=${branchId}`, "Cash movement recorded.")); }
