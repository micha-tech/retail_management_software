import { csvDocument } from "@/lib/csv";
import { requirePermission } from "@/modules/auth/authorization";

const headers = ["category", "name", "sku", "barcode", "description", "cost_price", "selling_price", "unit", "minimum_stock_level", "track_inventory", "opening_stock", "branch_code"];

export async function GET() {
  await requirePermission("product:manage");
  const example = ["Beverages", "Coca-Cola 50cl", "COKE50", "5449000000996", "Chilled soda bottle", "220.00", "350.00", "each", "12", "yes", "0", ""];
  const body = csvDocument(headers, [example]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-template.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
