import Link from "next/link";
import { notFound } from "next/navigation";

import { FavoriteButton } from "@/components/pocketshop/favorite-button";
import { ProductGallery } from "@/components/pocketshop/gallery";
import { ProductCard } from "@/components/pocketshop/product-card";
import { ShareButton } from "@/components/pocketshop/share-button";
import { EmptyState } from "@/components/pocketshop/ui";
import { formatMoney } from "@/lib/money";
import { getPublishedStore } from "@/modules/pocketshop/authorization";
import { addToCartAction } from "@/modules/pocketshop/cart-actions";
import { getStorefrontData, getStorefrontProduct } from "@/modules/pocketshop/queries";

export const dynamic = "force-dynamic";

export default async function StorefrontProductPage({ params }: { params: Promise<{ storeSlug: string; productSlug: string }> }) {
  const { storeSlug, productSlug } = await params;
  const { store } = await getPublishedStore(storeSlug);
  const detail = await getStorefrontProduct(store.id, productSlug);
  if (!detail) notFound();
  const { product, images, variants, category } = detail;
  const availableVariants = variants.filter((variant) => variant.active);
  const { products } = await getStorefrontData(store.id);
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  const discount = product.compareAtPrice && product.compareAtPrice > product.price
    ? Math.round(Number((product.compareAtPrice - product.price) * 100n / product.compareAtPrice)) : 0;

  return (
    <main className="ps-shop-main">
      <div style={{ paddingTop: 16, fontSize: 12, color: "#6d737b" }}><Link href={`/store/${store.slug}`}>{store.name}</Link> / {category ? <Link href={`/store/${store.slug}?category=${category.id}`}>{category.name}</Link> : "Products"} / {product.name}</div>
      <section className="ps-product-detail">
        <div style={{ position: "relative" }}>
          <ProductGallery images={images} name={product.name} />
          <div style={{ position: "absolute", top: 10, right: 10 }}><FavoriteButton productId={product.id} /></div>
        </div>
        <div className="ps-detail">
          <span className="ps-detail-eyebrow">{category?.name ?? store.name}</span>
          <h1>{product.name}</h1>
          <div className="ps-price" style={{ marginTop: 0 }}><b style={{ fontSize: 22 }}>{formatMoney(product.price, store.currency)}</b>{product.compareAtPrice && product.compareAtPrice > product.price && <s>{formatMoney(product.compareAtPrice, store.currency)}</s>}{discount > 0 && <span className="ps-pill danger">−{discount}%</span>}</div>
          {product.description && <p className="ps-detail-description" style={{ whiteSpace: "pre-line" }}>{product.description}</p>}
          <div className="ps-buy-card">
            {availableVariants.length === 0 ? <p className="ps-error">This product is currently unavailable.</p> : (
              <form action={addToCartAction}>
                <input type="hidden" name="storeSlug" value={store.slug} />
                <span className="ps-hint" style={{ display: "block", marginBottom: 9 }}>{availableVariants.length > 1 ? "Choose an option" : "Available option"}</span>
                <div className="ps-variant-options">
                  {availableVariants.map((variant) => (
                    <label key={variant.id}>
                      <input type="radio" name="variantId" value={variant.id} defaultChecked={variant.isDefault} disabled={variant.available <= 0} />
                      <span>{variant.name}: {variant.value}{variant.available <= 0 ? " · sold out" : variant.price && variant.price !== product.price ? ` · ${formatMoney(variant.price, store.currency)}` : ""}</span>
                    </label>
                  ))}
                </div>
                <div className="ps-detail-actions">
                  <input name="quantity" type="number" min={1} max={99} defaultValue={1} aria-label="Quantity" />
                  <button className="ps-button" type="submit">Add to cart</button>
                </div>
                <p className="ps-stock-note">Prices and stock are confirmed when you place your order.</p>
              </form>
            )}
          </div>
          <div className="ps-secondary-actions">
            <ShareButton title={`${product.name} · ${store.name}`} />
            {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${store.name}, I have a question about ${product.name}.`)}`} target="_blank" rel="noreferrer">Ask about this product</a>}
            <Link href={`/store/${store.slug}/cart`}>View cart</Link>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="ps-section">
          <div className="ps-section-head"><div><h2>You may also like</h2><p>More from {store.name}</p></div></div>
          <div className="ps-product-grid">{related.map((item) => <ProductCard key={item.id} product={item} storeSlug={store.slug} currency={store.currency} />)}</div>
        </section>
      )}
      {related.length === 0 && <EmptyState title="More coming soon" message="Check back for new products from this store." />}
    </main>
  );
}
