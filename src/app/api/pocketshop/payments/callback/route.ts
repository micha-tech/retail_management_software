import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { psOrders, psPayments, psStores } from "@/db/schema";
import { ORDER_COOKIE } from "@/modules/pocketshop/lib/constants";
import { confirmGatewayOrder } from "@/modules/pocketshop/checkout";
import { hashToken } from "@/modules/pocketshop/lib/security";
import { verifyGatewayPayment } from "@/modules/pocketshop/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The return URL only triggers a server-side gateway verification, never a status change by itself. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference") ?? "";
  const fail = (path: string, reason: string) => NextResponse.redirect(new URL(`${path}?error=${reason}`, request.url));

  const [payment] = reference
    ? await db.select().from(psPayments).where(and(eq(psPayments.provider, "PAYSTACK"), eq(psPayments.providerReference, reference))).limit(1)
    : [];
  const [order] = payment ? await db.select().from(psOrders).where(eq(psOrders.id, payment.orderId)).limit(1) : [];
  const [store] = order ? await db.select().from(psStores).where(eq(psStores.id, order.storeId)).limit(1) : [];
  if (!payment || !order || !store) return fail("/", "payment_reference_invalid");
  const trackPath = `/store/${store.slug}/track/${order.reference}`;

  const token = (await cookies()).get(ORDER_COOKIE)?.value;
  if (!token || hashToken(token) !== order.accessTokenHash) return fail(trackPath, "order_link_expired");

  const verified = await verifyGatewayPayment(reference);
  if (payment.status !== "PAID") {
    if (!verified.verified || !verified.paid || verified.amount === null) return fail(trackPath, "payment_not_confirmed");
    await confirmGatewayOrder(reference, verified.amount);
  }
  revalidatePath(trackPath);
  revalidatePath("/pocketshop/orders");
  return NextResponse.redirect(new URL(`${trackPath}?payment=confirmed`, request.url));
}
