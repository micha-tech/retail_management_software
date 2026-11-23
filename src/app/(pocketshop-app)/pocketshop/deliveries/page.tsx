import { ActionForm } from "@/components/pocketshop/action-form";
import { Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { deleteDeliveryZoneAction, saveDeliveryZoneAction } from "@/modules/pocketshop/store-actions";
import { getDeliveryZones } from "@/modules/pocketshop/queries";

export const metadata = { title: "Deliveries" };

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { store, business, settings } = await requirePocketStore();
  const query = await searchParams;
  const zones = await getDeliveryZones(store.id, business.id);
  return (
    <>
      <PageHeader eyebrow="Fulfilment" title="Deliveries" description="Define areas, delivery charges and timing. Pickup orders need no zone." />
      <main className="ps-page">
        {query.saved && <div className="ps-success" style={{ marginBottom: 16 }}>Delivery zone saved.</div>}
        <div className="ps-grid">
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Delivery areas</h2><p>Charges shown at checkout are read from these records.</p></div></div>
            {zones.length === 0 ? <p className="ps-hint">No zones yet. Add one to show delivery fees at checkout.</p> : (
              <div className="ps-mobile-list">{zones.map((zone) => <div className="ps-list-item" key={zone.id}>
                <div><strong>{zone.name}</strong><small>{zone.description ?? zone.estimatedDays ?? "No estimate"}</small></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><StatusPill value={zone.active ? "active" : "hidden"} kind={zone.active ? "active" : undefined} /><strong><Money amount={zone.fee} currency={store.currency} /></strong>
                  <form action={deleteDeliveryZoneAction}><input type="hidden" name="zoneId" value={zone.id} /><button className="ps-button secondary small" type="submit">Remove</button></form>
                </div>
              </div>)}</div>
            )}
          </section>
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Add or edit a zone</h2><p>Fees use your store currency.</p></div></div>
            <ActionForm action={saveDeliveryZoneAction} submitLabel="Save zone" initial={{}}>
              <label>Zone name<input name="name" minLength={2} maxLength={80} required /></label>
              <label>Description<textarea name="description" maxLength={300} /></label>
              <label>Fee<input name="fee" inputMode="decimal" placeholder="0.00" pattern="^\d+(\.\d{1,2})?$" required /></label>
              <label>Estimated delivery time<input name="estimatedDays" maxLength={60} placeholder="1–2 business days" /></label>
              <label className="ps-check"><input type="checkbox" name="active" defaultChecked />Available at checkout</label>
            </ActionForm>
          </section>
        </div>
        <section className="ps-card">
          <div className="ps-card-head"><h2>Current options</h2></div>
          <dl className="ps-detail-list">
            <div><dt>Delivery</dt><dd>{settings.deliveryEnabled ? "Available" : "Not offered"}</dd></div>
            <div><dt>Pickup</dt><dd>{settings.pickupEnabled ? "Available" : "Not offered"}</dd></div>
            {settings.deliveryNote && <div><dt>Delivery note</dt><dd>{settings.deliveryNote}</dd></div>}
          </dl>
          <p className="ps-hint" style={{ marginTop: 14 }}>Change delivery and pickup availability in Preferences or Store settings.</p>
        </section>
      </main>
    </>
  );
}
