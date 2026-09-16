import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { assessStockoutRisk, type StockoutAssessment } from "./stockout-math";

export type StockoutRiskRecord = StockoutAssessment & {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  onHand: number;
  trailingUnits: number;
  incomingQuantity: number;
};

export async function listStockoutRisk(input: { businessId: string; branchIds: string[]; salesStart: Date; salesEnd: Date; windowDays?: number }) {
  if (!input.branchIds.length) return [] as StockoutRiskRecord[];
  const branchIds = sql.join(input.branchIds.map((id) => sql`${id}`), sql`, `);
  const rows = await db.execute<{ branch_id: string; branch_name: string; product_id: string; product_name: string; sku: string; on_hand: number; trailing_units: number; incoming_quantity: number }>(sql`
    select
      bi.branch_id,
      b.name as branch_name,
      bi.product_id,
      p.name as product_name,
      p.sku,
      bi.quantity_on_hand::int as on_hand,
      coalesce((
        select sum(si.quantity)
        from sale_items si
        join sales s on s.id = si.sale_id
        where s.business_id = ${input.businessId}
          and s.branch_id = bi.branch_id
          and s.status = 'COMPLETED'
          and s.created_at between ${input.salesStart} and ${input.salesEnd}
          and si.product_id = bi.product_id
      ), 0)::int as trailing_units,
      coalesce((
        select sum(poi.ordered_quantity - poi.received_quantity)
        from purchase_order_items poi
        join purchase_orders po on po.id = poi.purchase_order_id
        where po.business_id = ${input.businessId}
          and po.branch_id = bi.branch_id
          and po.status in ('ORDERED', 'PARTIALLY_RECEIVED')
          and poi.product_id = bi.product_id
      ), 0)::int as incoming_quantity
    from branch_inventory bi
    join branches b on b.id = bi.branch_id and b.business_id = bi.business_id
    join products p on p.id = bi.product_id and p.business_id = bi.business_id
    where bi.business_id = ${input.businessId}
      and bi.branch_id in (${branchIds})
      and p.active = true
      and p.track_inventory = true
    order by b.name, p.name
  `);

  return rows.map((row) => ({
    branchId: row.branch_id,
    branchName: row.branch_name,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    onHand: row.on_hand,
    trailingUnits: row.trailing_units,
    incomingQuantity: row.incoming_quantity,
    ...assessStockoutRisk({ onHand: row.on_hand, trailingUnits: row.trailing_units, incomingQuantity: row.incoming_quantity, windowDays: input.windowDays }),
  }));
}
