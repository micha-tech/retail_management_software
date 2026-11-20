import { ImageField } from "@/components/pocketshop/image-field";
import { PageHeader } from "@/components/pocketshop/ui";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { updateStoreProfileAction } from "@/modules/pocketshop/store-actions";

export const metadata = { title: "Store profile" };
export const dynamic = "force-dynamic";

export default async function StorePage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { store } = await requirePocketStore();
  const query = await searchParams;
  const hours = store.openingHours && typeof store.openingHours === "object" ? store.openingHours as Record<string, unknown> : {};
  const socials = store.socialLinks && typeof store.socialLinks === "object" ? store.socialLinks as Record<string, unknown> : {};
  const stringify = (value: Record<string, unknown>) => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "string")), null, 2);

  return (
    <>
      <PageHeader eyebrow="Your business" title="Store profile" description="Everything customers see on your public storefront."
        actions={<a className="ps-button secondary" href={`/store/${store.slug}`} target="_blank">View storefront</a>} />
      <main className="ps-page narrow">
        {query.saved && <div className="ps-success" style={{ marginBottom: 16 }}>Store profile saved.</div>}
        {query.error && <div className="ps-error" style={{ marginBottom: 16 }}>{query.error}</div>}
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Public profile</h2><p>Your store URL: /store/{store.slug}</p></div></div>
          <form action={updateStoreProfileAction} className="ps-form">
            <div className="ps-form-grid">
              <label>Store name<input name="name" defaultValue={store.name} minLength={2} maxLength={120} required /></label>
              <label>Store URL<input name="slug" defaultValue={store.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} required /></label>
              <label>Category<input name="category" defaultValue={store.category ?? ""} maxLength={80} required /></label>
              <label>Phone<input name="phone" type="tel" defaultValue={store.phone ?? ""} maxLength={30} /></label>
              <label>WhatsApp<input name="whatsapp" type="tel" defaultValue={store.whatsapp ?? ""} maxLength={30} /></label>
              <label>Email<input name="email" type="email" defaultValue={store.email ?? ""} maxLength={254} /></label>
              <label>Address<input name="address" defaultValue={store.address ?? ""} maxLength={300} /></label>
              <label>City<input name="city" defaultValue={store.city ?? ""} maxLength={80} /></label>
              <label>State<input name="state" defaultValue={store.state ?? ""} maxLength={80} /></label>
              <label>Country<input name="country" defaultValue={store.country ?? ""} maxLength={80} /></label>
            </div>
            <label>Description<textarea name="description" defaultValue={store.description ?? ""} maxLength={1000} /></label>
            <div className="ps-form-grid">
              <ImageField name="logoUrl" initialUrl={store.logoUrl} label="Store logo" />
              <ImageField name="bannerUrl" initialUrl={store.bannerUrl} label="Cover image" />
            </div>
            <label>Opening hours (JSON)<textarea name="openingHours" defaultValue={stringify(hours)} maxLength={3000} placeholder={'{"Mon-Fri":"9:00-18:00"}'} /></label>
            <label>Social links (JSON)<textarea name="socialLinks" defaultValue={stringify(socials)} maxLength={3000} placeholder={'{"Instagram":"https://instagram.com/yourstore"}'} /></label>
            <label className="ps-check"><input type="checkbox" name="published" defaultChecked={store.published} />Storefront published and visible to customers</label>
            <button className="ps-button" type="submit">Save store profile</button>
          </form>
        </section>
      </main>
    </>
  );
}
