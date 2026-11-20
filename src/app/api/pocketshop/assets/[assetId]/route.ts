import { readAsset } from "@/modules/pocketshop/assets";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return new Response("Not found", { status: 404 });
  try {
    const record = await readAsset(assetId);
    if (!record) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(record.bytes), {
      headers: {
        "Content-Type": record.asset.mimeType,
        "Content-Length": String(record.bytes.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
