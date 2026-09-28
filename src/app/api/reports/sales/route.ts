import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db/client";
import { localDateToUtc, todayRange } from "@/lib/time";
import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  const access = await requirePermission("report:read");
  const accessible = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const selected = accessible.find((branch) => branch.id === request.nextUrl.searchParams.get("branch"));
  const branchIds = selected ? [selected.id] : accessible.map((branch) => branch.id);
  const today = todayRange(access.business.timezone);
  const from = request.nextUrl.searchParams.get("from") || today.date;
  const to = request.nextUrl.searchParams.get("to") || today.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return new Response("Invalid date range", { status: 400 });
  }

  const start = localDateToUtc(from, access.business.timezone).toISOString();
  const end = localDateToUtc(to, access.business.timezone, true).toISOString();
  const records = branchIds.length ? await db.execute<{
    sale_number: string;
    branch: string;
    cashier: string;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paid: string;
    credit: string;
    status: string;
    created_at: Date;
  }>(sql`select s.sale_number,b.name branch,u.name cashier,s.subtotal::text,s.discount_total::text discount,s.tax_total::text tax,s.total::text,coalesce((select sum(p.amount) from payments p where p.sale_id=s.id and p.status='COMPLETED'),0)::text paid,coalesce((select sum(ce.amount) from credit_entries ce where ce.sale_id=s.id and ce.type='SALE'),0)::text credit,s.status,s.created_at from sales s join branches b on b.id=s.branch_id join users u on u.id=s.cashier_id where s.business_id=${access.business.id} and s.branch_id in (${sql.join(branchIds.map((id) => sql`${id}`), sql`, `)}) and s.created_at between ${start} and ${end} order by s.created_at`) : [];

  const body = [
    "Sale number,Branch,Cashier,Subtotal minor units,Discount minor units,Tax minor units,Total minor units,Completed payments minor units,Credit minor units,Status,Created UTC",
    ...records.map((record) => [record.sale_number, record.branch, record.cashier, record.subtotal, record.discount, record.tax, record.total, record.paid, record.credit, record.status, new Date(record.created_at).toISOString()].map(csv).join(",")),
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${from}-${to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
