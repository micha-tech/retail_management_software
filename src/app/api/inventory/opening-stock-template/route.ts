import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db/client";
import { csvDocument } from "@/lib/csv";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";

export async function GET(request: NextRequest) {
  const access = await requirePermission("inventory:read");
  const accessible = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const selected = accessible.find((branch) => branch.id === request.nextUrl.searchParams.get("branch"));
  const branchIds = selected ? [selected.id] : accessible.map((branch) => branch.id);
  const records = branchIds.length
    ? await db.execute<{ branch_code: string; branch_name: string; sku: string; product_name: string; selling_price: number; cost_price: number; stock: number }>(sql`
        select b.code branch_code, b.name branch_name, p.sku, p.name product_name,
          p.selling_price::numeric/100 selling_price, p.cost_price::numeric/100 cost_price,
          coalesce(bi.quantity_on_hand,0)::int stock
        from branches b
        cross join products p
        left join branch_inventory bi on bi.branch_id=b.id and bi.product_id=p.id
        where b.id in (${sql.join(branchIds.map((id) => sql`${id}`), sql`, `)})
          and p.business_id=${access.business.id} and p.active=true and p.track_inventory=true
        order by b.name, p.name`)
    : [];
  const body = csvDocument(
    ["branch_code", "branch_name", "sku", "product_name", "selling_price", "cost_price", "stock"],
    records.map((row) => [row.branch_code, row.branch_name, row.sku, row.product_name, row.selling_price, row.cost_price, row.stock]),
  );
  const suffix = selected ? selected.code.toLowerCase() : "all-branches";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opening-stock-${suffix}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}