import { ActionForm } from "@/components/pocketshop/action-form";
import { PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { paymentBanks } from "@/db/schema";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { isPaystackConfigured } from "@/modules/pocketshop/payments";
import { savePaymentConfigAction } from "@/modules/pocketshop/store-actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { store, business, settings } = await requirePocketStore();
  const [bank] = await db.select().from(paymentBanks).where(and(eq(paymentBanks.businessId, business.id), eq(paymentBanks.active, true))).limit(1);
  const online = isPaystackConfigured();
  const socials = store.socialLinks && typeof store.socialLinks === "object" ? store.socialLinks as Record<string, unknown> : {};

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" description="Payment options and communication channels for this store." />
      <main className="ps-page narrow">
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Payment configuration</h2><p>Changes apply to new checkouts. Existing orders keep their original method.</p></div></div>
          <ActionForm action={savePaymentConfigAction} submitLabel="Save payment settings">
            <label>Accepted methods
              <div style={{ display: "grid", gap: 8, paddingTop: 6 }}>
                <label className="ps-check"><input type="checkbox" name="methods" value="CASH_ON_DELIVERY" defaultChecked={settings.paymentMethods.includes("CASH_ON_DELIVERY")} />Cash on delivery</label>
                <label className="ps-check"><input type="checkbox" name="methods" value="BANK_TRANSFER" defaultChecked={settings.paymentMethods.includes("BANK_TRANSFER")} />Bank transfer</label>
                <label className="ps-check"><input type="checkbox" name="methods" value="CARD" disabled={!online} defaultChecked={settings.paymentMethods.includes("CARD")} />Card {online ? "" : "(gateway not configured)"}</label>
                <label className="ps-check"><input type="checkbox" name="methods" value="USSD" disabled={!online} defaultChecked={settings.paymentMethods.includes("USSD")} />USSD {online ? "" : "(gateway not configured)"}</label>
              </div>
            </label>
            <label>Payment timing<select name="paymentTiming" defaultValue={settings.paymentTiming}><option value="BEFORE_DELIVERY">Before delivery</option><option value="ON_DELIVERY">On delivery or pickup</option><option value="PARTIAL">Partial deposit now</option></select></label>
            <label>Deposit percentage<input name="depositPercent" type="number" min={0} max={100} defaultValue={settings.depositPercent} /></label>
            <div className="ps-form-grid">
              <label>Bank name<input name="bankName" defaultValue={bank?.bankName ?? ""} maxLength={100} /></label>
              <label>Account name<input name="accountName" defaultValue={bank?.accountName ?? ""} maxLength={100} /></label>
              <label className="full">Account number<input name="accountNumber" defaultValue={bank?.accountNumber ?? ""} inputMode="numeric" pattern="[0-9]{8,20}" maxLength={20} /></label>
            </div>
          </ActionForm>
        </section>
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Communication channels</h2><p>Customer conversations stay connected to this store.</p></div></div>
          <dl className="ps-detail-list">
            <div><dt>WhatsApp click-to-chat</dt><dd>{store.whatsapp ? <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Available</a> : "Add a number in Store profile"}</dd></div>
            <div><dt>Social profiles</dt><dd>{Object.keys(socials).length ? Object.keys(socials).join(", ") : "None added"}</dd></div>
            <div><dt>Official channel integrations</dt><dd><StatusPill value="not connected" /></dd></div>
          </dl>
          <p className="ps-hint" style={{ marginTop: 14 }}>Official API connections require provider permission and are never shown as connected without an authorised callback. Channel records are ready for that adapter; no account credentials are stored here.</p>
        </section>
      </main>
    </>
  );
}
