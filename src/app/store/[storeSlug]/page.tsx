import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/pocketshop/product-card";
import { EmptyState } from "@/components/pocketshop/ui";
import { getPublishedStore } from "@/modules/pocketshop/authorization";
import { getStorefrontData } from "@/modules/pocketshop/queries";

export const dynamic = "force-dynamic";

export default async function StorefrontHome({ params, searchParams }: { params: Promise<{ storeSlug: string }>; searchParams: Promise<{ category?: string; q?: string }> }) {
  const { storeSlug } = await params;
  const query = await searchParams;
  const { store, settings } = await getPublishedStore(storeSlug);
  const { products, categories } = await getStorefrontData(store.id, query.category, query.q);

  return (
    <main className="ps-shop-main">
      <section className="ps-hero">
        <div>
          <span className="ps-eyebrow">Welcome to {store.name}</span>
          <h1>{store.description ? store.description.slice(0, 120) : "Good things, carefully selected."}</h1>
          <p>{store.description ?? `Browse products from ${store.name} and order for ${settings.deliveryEnabled ? "delivery or pickup" : "pickup"}.`}</p>
          <div className="ps-hero-actions">
            <a className="ps-button" href="#products">Browse products</a>
            {store.whatsapp && <a className="ps-button secondary" href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">Chat with us</a>}
          </div>
        </div>
        <div className="ps-hero-media">
          {store.bannerUrl ? <Image src={store.bannerUrl} alt={`${store.name} cover`} fill sizes="(max-width: 900px) 100vw, 420px" priority unoptimized /> : <div className="ps-hero-placeholder">{store.name.slice(0, 2).toUpperCase()}</div>}
        </div>
      </section>

      <section className="ps-section" id="products">
        <div className="ps-section-head"><div><h2>{query.q ? `Results for “${query.q}”` : "Products"}</h2><p>{products.length} item{products.length === 1 ? "" : "s"} available to browse</p></div>
          <form method="get" style={{ display: "flex", gap: 8, maxWidth: 320, width: "100%" }}>
            <input name="q" defaultValue={query.q ?? ""} placeholder="Search products" aria-label="Search products" />
            <button className="ps-button secondary small" type="submit">Search</button>
          </form>
        </div>
        {categories.length > 0 && <div className="ps-category-strip"><Link className={query.category ? "" : "active"} href={`/store/${store.slug}`}>All</Link>{categories.map((category) => <Link key={category.id} className={query.category === category.id ? "active" : ""} href={`/store/${store.slug}?category=${category.id}`}>{category.name}</Link>)}</div>}
        {products.length === 0 ? <EmptyState title="Nothing here yet" message="Try another search or check back soon. New products are added regularly." /> : (
          <div className="ps-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} storeSlug={store.slug} currency={store.currency} />)}</div>
        )}
      </section>
    </main>
  );
}
