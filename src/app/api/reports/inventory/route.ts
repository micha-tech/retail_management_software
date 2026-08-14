import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db/client";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";

function csv(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: NextRequest) {
  const access = await requirePermission("report:read");
  const accessible = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const requestedBranch = request.nextUrl.searchParams.get("branch");
  const selected = accessible.find((branch) => branch.id === requestedBranch);
  const branchIds = selected ? [selected.id] : accessible.map((branch) => branch.id);
  const records = branchIds.length ? await db.execute<{ branch: string; product: string; sku: string; quantity: number; reorder: number; value: string }>(sql`select b.name branch,p.name product,p.sku,bi.quantity_on_hand quantity,greatest(bi.reorder_level,p.minimum_stock_level)::int reorder,(bi.quantity_on_hand*p.cost_price)::text value from branch_inventory bi join branches b on b.id=bi.branch_id join products p on p.id=bi.product_id where bi.business_id=${access.business.id} and bi.branch_id in (${sql.join(branchIds.map((id)=>sql`${id}`),sql`, `)}) order by b.name,p.name`) : [];
  const body = ["Branch,Product,SKU,Quantity,Reorder level,Stock value minor units", ...records.map((row) => [row.branch,row.product,row.sku,row.quantity,row.reorder,row.value].map(csv).join(","))].join("\n");
  return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=inventory.csv","Cache-Control":"private, no-store"}});
}
