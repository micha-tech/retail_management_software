import Link from "next/link";
import { eq } from "drizzle-orm";

import { ActionForm } from "@/components/pocketshop/action-form";
import { ImageField } from "@/components/pocketshop/image-field";
import { PageHeader } from "@/components/pocketshop/ui";
import { db } from "@/db/client";
import { paymentBanks } from "@/db/schema";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { isPaystackConfigured } from "@/modules/pocketshop/payments";
import {
  publishStoreAction, savePaymentConfigAction, saveStoreBusinessAction,
  saveStoreIdentityAction, saveStorePreferencesAction,
} from "@/modules/pocketshop/store-actions";

export const metadata = { title: "Store setup" };
export const dynamic = "force-dynamic";

const STEPS = ["Identity", "Business", "Preferences", "Payments", "Launch"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string; error?: string }> }) {
  const { store, settings } = await requirePocketStore();
  const query = await searchParams;
  const requested = Number(query.step ?? store.onboardingStep);
  const step = Math.min(5, Math.max(1, Number.isInteger(requested) ? requested : 1));
  const [bank] = await db.select().from(paymentBanks).where(eq(paymentBanks.businessId, store.businessId)).limit(1);
  const onlinePayments = isPaystackConfigured();

  return (
    <>
      <PageHeader eyebrow="Store setup" title={`Step ${step} of 5 · ${STEPS[step - 1]}`} description="Your progress is saved as you go. You can change these settings later." />
      <main className="ps-page narrow">
        {query.error && <p className="ps-error" role="alert" style={{ marginBottom: 16 }}>{query.error}</p>}
        <div className="ps-progress" aria-label="Onboarding progress">{STEPS.map((_, index) => <span key={_} className={index < step ? "done" : ""} />)}</div>
        <nav className="ps-steps" aria-label="Setup steps">
          {STEPS.map((label, index) => <Link key={label} className={index + 1 === step ? "active" : ""} href={`/pocketshop/onboarding?step=${index + 1}`}>{index + 1}. {label}</Link>)}
        </nav>

        {step === 1 && (
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Introduce your store</h2><p>This is what customers will see first.</p></div></div>
            <ActionForm action={saveStoreIdentityAction} submitLabel="Save and continue">
              <label>Store name<input name="name" defaultValue={store.name} minLength={2} maxLength={120} required /></label>
              <label>Store URL
                <input name="slug" defaultValue={store.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} required />
                <small>Your shop will live at /store/{store.slug}. Use lowercase letters, numbers and hyphens.</small>
              </label>
              <label>Category<input name="category" defaultValue={store.category ?? ""} placeholder="Fashion, groceries, electronics…" maxLength={80} required /></label>
              <label>Description<textarea name="description" defaultValue={store.description ?? ""} maxLength={1000} placeholder="Tell customers what you sell and what makes your store useful." /></label>
              <ImageField name="logoUrl" initialUrl={store.logoUrl} label="Logo (optional)" />
              <ImageField name="bannerUrl" initialUrl={store.bannerUrl} label="Cover image (optional)" />
            </ActionForm>
          </section>
        )}

        {step === 2 && (
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Business details</h2><p>Used for delivery, receipts and customer contact.</p></div></div>
            <ActionForm action={saveStoreBusinessAction} submitLabel="Save and continue">
              <div className="ps-form-grid">
                <label>Phone<input name="phone" type="tel" defaultValue={store.phone ?? ""} minLength={7} maxLength={30} required /></label>
                <label>WhatsApp (optional)<input name="whatsapp" type="tel" defaultValue={store.whatsapp ?? ""} maxLength={30} placeholder="2348012345678" /></label>
                <label className="full">Email (optional)<input name="email" type="email" defaultValue={store.email ?? ""} /></label>
                <label className="full">Address<input name="address" defaultValue={store.address ?? ""} maxLength={300} required /></label>
                <label>City<input name="city" defaultValue={store.city ?? ""} maxLength={80} required /></label>
                <label>State<input name="state" defaultValue={store.state ?? ""} maxLength={80} required /></label>
                <label>Country<input name="country" defaultValue={store.country ?? "Nigeria"} maxLength={80} required /></label>
              </div>
            </ActionForm>
          </section>
        )}

        {step === 3 && (
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Shopping preferences</h2><p>Choose what customers can do at checkout.</p></div></div>
            <ActionForm action={saveStorePreferencesAction} submitLabel="Save and continue">
              <div className="ps-form-grid">
                <label>Currency<input name="currency" defaultValue={store.currency} maxLength={3} required /></label>
                <label>Timezone<input name="timezone" defaultValue={store.timezone} maxLength={100} required /></label>
              </div>
              <label className="ps-check"><input type="checkbox" name="deliveryEnabled" defaultChecked={settings.deliveryEnabled} />Offer delivery</label>
              <label className="ps-check"><input type="checkbox" name="pickupEnabled" defaultChecked={settings.pickupEnabled} />Offer pickup from store</label>
              <label className="ps-check"><input type="checkbox" name="notifyEmail" defaultChecked={settings.notifyEmail} />Email notifications when configured</label>
              <label>Delivery note<textarea name="deliveryNote" maxLength={500} placeholder="Explain how delivery works, order cut-offs, or pickup instructions." /></label>
            </ActionForm>
          </section>
        )}

        {step === 4 && (
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>How customers pay</h2><p>Only methods you configure here are offered at checkout.</p></div></div>
            <ActionForm action={savePaymentConfigAction} submitLabel="Save and continue">
              <label>Payment methods
                <div style={{ display: "grid", gap: 8, paddingTop: 6 }}>
                  <label className="ps-check"><input type="checkbox" name="methods" value="CASH_ON_DELIVERY" defaultChecked />Cash on delivery</label>
                  <label className="ps-check"><input type="checkbox" name="methods" value="BANK_TRANSFER" defaultChecked />Bank transfer (verify manually)</label>
                  <label className="ps-check"><input type="checkbox" name="methods" value="CARD" disabled={!onlinePayments} />Card {onlinePayments ? "" : "(requires gateway setup)"}</label>
                  <label className="ps-check"><input type="checkbox" name="methods" value="USSD" disabled={!onlinePayments} />USSD {onlinePayments ? "" : "(requires gateway setup)"}</label>
                </div>
              </label>
              <label>When should customers pay?
                <select name="paymentTiming" defaultValue="ON_DELIVERY">
                  <option value="BEFORE_DELIVERY">Before delivery</option>
                  <option value="ON_DELIVERY">On delivery or pickup</option>
                  <option value="PARTIAL">Partial deposit now</option>
                </select>
              </label>
              <label>Deposit percentage (for partial payments)<input name="depositPercent" type="number" min={0} max={100} defaultValue={0} /></label>
              <div className="ps-form-grid">
                <label>Bank name<input name="bankName" defaultValue={bank?.bankName ?? ""} maxLength={100} /></label>
                <label>Account name<input name="accountName" defaultValue={bank?.accountName ?? ""} maxLength={100} /></label>
                <label className="full">Account number<input name="accountNumber" defaultValue={bank?.accountNumber ?? ""} inputMode="numeric" pattern="[0-9]{8,20}" maxLength={20} /></label>
              </div>
              <p className="ps-hint">Card and USSD payments require a configured payment gateway. No payment is marked paid from a return link alone.</p>
            </ActionForm>
          </section>
        )}

        {step === 5 && (
          <section className="ps-card">
            <div className="ps-card-head"><div><h2>Preview and launch</h2><p>Check your storefront before customers can see it.</p></div></div>
            <dl className="ps-detail-list">
              <div><dt>Store</dt><dd>{store.name}</dd></div>
              <div><dt>Public address</dt><dd>/store/{store.slug}</dd></div>
              <div><dt>Contact</dt><dd>{store.phone}</dd></div>
              <div><dt>Address</dt><dd>{store.address}, {store.city}</dd></div>
            </dl>
            <div className="ps-actions" style={{ marginTop: 20 }}>
              <Link className="ps-button secondary" href={`/store/${store.slug}`} target="_blank">Preview storefront</Link>
              <Link className="ps-button secondary" href="/pocketshop/products/new">Add first product</Link>
            </div>
            <form action={publishStoreAction} style={{ marginTop: 22 }}>
              <button className="ps-button" type="submit">{store.published ? "Save and return to dashboard" : "Publish my store"}</button>
            </form>
            <p className="ps-hint" style={{ marginTop: 12 }}>You can unpublish or change these details any time from Store settings.</p>
          </section>
        )}
      </main>
    </>
  );
}

