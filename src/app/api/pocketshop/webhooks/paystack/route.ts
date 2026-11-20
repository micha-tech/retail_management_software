import { confirmGatewayOrder } from "@/modules/pocketshop/checkout";
import { parseGatewayWebhook } from "@/modules/pocketshop/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Raw body is required: the HMAC covers the exact bytes Paystack sent. */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature");
  const event = parseGatewayWebhook(raw, signature);
  if (!event) return new Response("Invalid signature", { status: 401 });

  if (event.event === "charge.success" && event.data?.status === "success" && event.data.reference && typeof event.data.amount === "number") {
    try {
      await confirmGatewayOrder(event.data.reference, BigInt(event.data.amount));
    } catch {
      return new Response("Temporary failure", { status: 503 });
    }
  }
  return Response.json({ received: true });
}
