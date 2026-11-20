import { csvDocument } from "@/lib/csv";

export const runtime = "nodejs";

export function GET() {
  const headers = ["name", "sku", "price", "compare_at_price", "description", "category", "quantity", "low_stock_threshold", "status"];
  const rows = [["Linen Shirt", "LINEN-001", "12500", "15000", "Relaxed fit linen shirt", "Clothing", "12", "5", "ACTIVE"]];
  return new Response(csvDocument(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pocketshop-products-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
