import { DateText, EmptyState, Money, PageHeader } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { saveCustomerNoteAction } from "@/modules/pocketshop/order-actions";
import { getVendorCustomers } from "@/modules/pocketshop/queries";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string }> }) {
  const { store, business } = await requirePocketStore();
  const query = await searchParams;
  const customers = await getVendorCustomers(store.id, business.id, query.q);
  return (
    <>
      <PageHeader eyebrow="Relationships" title="Customers" description="People who have ordered from this store. Each store keeps its own records." />
      <main className="ps-page">
        {query.saved && <div className="ps-success" style={{ marginBottom: 16 }}>Customer note saved.</div>}
        <form className="ps-toolbar" method="get"><label className="ps-search">Search<input name="q" defaultValue={query.q ?? ""} placeholder="Name, phone or email" /></label><button className="ps-button secondary">Search</button></form>
        <section className="ps-card">
          {customers.length === 0 ? <EmptyState title="No customers yet" message="Customers are created automatically when an order is placed." /> : (
            <div className="ps-table-wrap"><table className="ps-table"><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total purchases</th><th>Last purchase</th><th>Note</th></tr></thead><tbody>
              {customers.map(({ customer, orderCount, totalSpent, lastPurchase }) => <tr key={customer.id}>
                <td><strong>{customer.name}</strong><small>{[customer.city, customer.state].filter(Boolean).join(", ")}</small></td>
                <td><strong>{customer.phone}</strong><small>{customer.email ?? "—"}</small></td>
                <td>{orderCount}</td><td><Money amount={totalSpent} currency={store.currency} /></td><td><DateText value={lastPurchase} /></td>
                <td><form action={saveCustomerNoteAction} style={{ display: "flex", gap: 7, minWidth: 220 }}><input type="hidden" name="customerId" value={customer.id} /><input name="notes" defaultValue={customer.notes ?? ""} maxLength={1000} placeholder="Private note" /><button className="ps-button secondary small">Save</button></form></td>
              </tr>)}
            </tbody></table></div>
          )}
          <div className="ps-mobile-list">{customers.map(({ customer, orderCount, totalSpent }) => <div className="ps-list-item" key={customer.id}><div><strong>{customer.name}</strong><small>{customer.phone} · {orderCount} order{orderCount === 1 ? "" : "s"}</small><small><Money amount={totalSpent} currency={store.currency} /> total</small></div><a className="ps-button secondary small" href={`tel:${customer.phone}`}>Call</a></div>)}</div>
        </section>
      </main>
    </>
  );
}
