import { releaseExpiredReservations } from "@/modules/pocketshop/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const released = await releaseExpiredReservations(100);
  return Response.json({ released });
}
