import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { payments, saleItems, sales } from "@/db/schema";
import { formatMoney } from "@/lib/money";
import { requireBranchAccess, requireBusinessAccess } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";

export default async function PosReceipt({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireBusinessAccess();
  const { id } = await params;
  const [sale] = await db.select().from(sales).where(and(eq(sales.id, id), eq(sales.businessId, access.business.id))).limit(1);
  if (!sale) notFound();
  await requireBranchAccess(sale.branchId);
  if (sale.cashierId !== access.user.id && !hasPermission(access.role, "sales:read", access.permissions)) notFound();
  const [items, paymentRows] = await Promise.all([
    db.select().from(saleItems).where(eq(saleItems.saleId, id)),
    db.select().from(payments).where(eq(payments.saleId, id)),
  ]);
  return <><header className="topbar"><div><Link className="back-link" href="/pos"><ArrowLeft size={15}/> POS</Link><p className="eyebrow">Sale receipt</p><h1>{sale.saleNumber}</h1><p>{sale.completedAt.toLocaleString()}</p></div><strong>{formatMoney(sale.total, access.business.currency)}</strong></header><main className="page narrow"><section className="surface table-surface"><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.productNameSnapshot}</strong><small>{item.skuSnapshot}</small></td><td>{item.quantity}</td><td>{formatMoney(item.unitPrice, access.business.currency)}</td><td>{formatMoney(item.lineTotal, access.business.currency)}</td></tr>)}</tbody></table></section><section className="surface compact-surface"><div className="payment-row"><span>Subtotal</span><strong>{formatMoney(sale.subtotal,access.business.currency)}</strong></div><div className="payment-row"><span>Discount</span><strong>-{formatMoney(sale.discountTotal,access.business.currency)}</strong></div><div className="payment-row"><span>Total</span><strong>{formatMoney(sale.total,access.business.currency)}</strong></div><h2>Payment</h2>{paymentRows.map((payment) => <div className="payment-row" key={payment.id}><span>{payment.paymentMethod.replaceAll("_", " ")} · {payment.status}</span><strong>{formatMoney(payment.amount, access.business.currency)}</strong></div>)}</section></main></>;
}
