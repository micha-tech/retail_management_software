import { StockAdjustForm } from "@/components/pocketshop/stock-adjust-form";
import { DateText, EmptyState, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { getInventoryMovements, getVendorInventory } from "@/modules/pocketshop/queries";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; adjusted?: string }> }) {
  const { store, business } = await requirePocketStore();
  const query = await searchParams;
  const [rows, movements] = await Promise.all([
    getVendorInventory(store.id, business.id, query.q),
    getInventoryMovements(store.id, business.id),
  ]);

  return (
    <>
      <PageHeader eyebrow="Stock" title="Inventory" description="Adjust stock and trace every movement." />
      <main className="ps-page">
        {query.adjusted && <div className="ps-success" style={{ marginBottom: 16 }}>Stock updated.</div>}
        <form className="ps-toolbar" method="get"><label className="ps-search">Search<input name="q" defaultValue={query.q ?? ""} placeholder="Product or SKU" /></label><button className="ps-button secondary">Search</button></form>
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Stock levels</h2><p>Available units exclude quantities reserved for unpaid orders.</p></div></div>
          {rows.length === 0 ? <EmptyState title="No inventory records" message="Add a product with stock to begin." href="/pocketshop/products/new" cta="Add product" /> : (
            <>
              <div className="ps-table-wrap"><table className="ps-table"><thead><tr><th>Product</th><th>Available</th><th>Reserved</th><th>Status</th><th>Adjust</th></tr></thead><tbody>
                {rows.map(({ inventory, product, variant }) => (
                  <tr key={inventory.id}>
                    <td><strong>{product.name}</strong><small>{variant.name} · {variant.value} · {variant.sku}</small></td>
                    <td>{inventory.quantityOnHand}</td><td>{inventory.reserved}</td>
                    <td><StatusPill value={inventory.quantityOnHand === 0 ? "out of stock" : inventory.quantityOnHand <= product.lowStockThreshold ? "low stock" : "in stock"} kind={inventory.quantityOnHand === 0 ? "danger" : inventory.quantityOnHand <= product.lowStockThreshold ? "warning" : "active"} /></td>
                    <td><StockAdjustForm inventoryId={inventory.id} /></td>
                  </tr>
                ))}
              </tbody></table></div>
              <div className="ps-mobile-list">{rows.map(({ inventory, product, variant }) => (
                <div className="ps-list-item" key={inventory.id} style={{ alignItems: "start" }}>
                  <div><strong>{product.name}</strong><small>{variant.name} · {variant.value}</small><small>{inventory.quantityOnHand} available · {inventory.reserved} reserved</small></div>
                  <StockAdjustForm inventoryId={inventory.id} />
                </div>
              ))}</div>
            </>
          )}
        </section>
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Stock movements</h2><p>Recent adjustments, reservations, sales and returns.</p></div></div>
          {movements.length === 0 ? <EmptyState title="No movements yet" message="Stock changes will be recorded here." /> : (
            <div className="ps-mobile-list">{movements.map(({ movement, productName, variantName }) => (
              <div className="ps-list-item" key={movement.id}>
                <div><strong>{productName} · {variantName}</strong><small>{movement.note ?? movement.movementType.replaceAll("_", " ").toLowerCase()} · <DateText value={movement.createdAt} /></small></div>
                <div style={{ textAlign: "right" }}><strong style={{ color: movement.quantity > 0 ? "#177245" : "#a33131" }}>{movement.quantity > 0 ? "+" : ""}{movement.quantity}</strong><small>{movement.quantityBefore} → {movement.quantityAfter}</small></div>
              </div>
            ))}</div>
          )}
        </section>
      </main>
    </>
  );
}
