import { DateText, EmptyState, Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { confirmManualPaymentAction } from "@/modules/pocketshop/order-actions";
import { isPaystackConfigured } from "@/modules/pocketshop/payments";
import { getVendorPayments } from "@/modules/pocketshop/queries";

export const metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const { store, business } = await requirePocketStore();
  const query = await searchParams;
  const rows = await getVendorPayments(store.id, business.id);
  return (
    <>
      <PageHeader eyebrow="Money" title="Payments" description="Online payments are verified by the gateway. Manual methods need your confirmation." />
      <main className="ps-page">
        {query.confirmed && <div className="ps-success" style={{ marginBottom: 16 }}>Payment confirmed and order updated.</div>}
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>{isPaystackConfigured() ? "Online payments configured" : "Online payments not configured"}</h2><p>{isPaystackConfigured() ? "Card and USSD payments are verified by signed webhooks and server-side lookups." : "Enable a gateway in your environment to offer card or USSD payments. Bank transfer and cash work without one."}</p></div></div>
        </section>
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Payment records</h2><p>Amounts are the server-calculated amounts due.</p></div></div>
          {rows.length === 0 ? <EmptyState title="No payments yet" message="Payment records appear when customers place orders." /> : (
            <>
              <div className="ps-table-wrap"><table className="ps-table"><thead><tr><th>Order</th><th>Method</th><th>Provider</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr></thead><tbody>
                {rows.map(({ payment, order }) => <tr key={payment.id}>
                  <td><strong>{order.reference}</strong><small>{order.customerName}</small></td>
                  <td>{payment.method.replaceAll("_", " ")}</td><td>{payment.provider}</td>
                  <td><Money amount={payment.amount} currency={payment.currency} /></td>
                  <td><StatusPill value={payment.status} kind={payment.status === "PAID" ? "paid" : payment.status === "FAILED" ? "danger" : "pending"} /></td>
                  <td><DateText value={payment.createdAt} /></td>
                  <td>{payment.status === "PENDING" && payment.provider === "MANUAL" && <form action={confirmManualPaymentAction}><input type="hidden" name="orderId" value={order.id} /><button className="ps-button secondary small">Confirm</button></form>}</td>
                </tr>)}
              </tbody></table></div>
              <div className="ps-mobile-list">{rows.map(({ payment, order }) => <div className="ps-list-item" key={payment.id}><div><strong>{order.reference}</strong><small>{payment.method.replaceAll("_", " ")} · <DateText value={payment.createdAt} /></small><small><Money amount={payment.amount} currency={payment.currency} /></small></div><StatusPill value={payment.status} kind={payment.status === "PAID" ? "paid" : "pending"} /></div>)}</div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
