import Image from "next/image";
import Link from "next/link";
import { and, eq } from "drizzle-orm";

import { EmptyState, Money, PageHeader, StatusPill } from "@/components/pocketshop/ui";
import { db } from "@/db/client";
import { psCategories } from "@/db/schema";
import { requirePocketStore } from "@/modules/pocketshop/authorization";
import { deleteProductAction, duplicateProductAction, setProductStatusAction } from "@/modules/pocketshop/product-actions";
import { getVendorProducts } from "@/modules/pocketshop/queries";
import { createCategoryAction, toggleCategoryAction } from "@/modules/pocketshop/store-actions";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type Search = { q?: string; status?: string; categoryId?: string; saved?: string; duplicated?: string; deleted?: string; statusUpdated?: string; imported?: string; categorySaved?: string; error?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { store, business } = await requirePocketStore();
  const query = await searchParams;
  const [products, categories] = await Promise.all([
    getVendorProducts(store.id, business.id, query),
    db.select().from(psCategories).where(and(eq(psCategories.storeId, store.id), eq(psCategories.businessId, business.id))).orderBy(psCategories.name),
  ]);
  const notice = query.saved ? "Product saved." : query.duplicated ? "Product duplicated as a draft." : query.deleted ? "Product deleted." : query.statusUpdated ? "Status updated." : query.imported ? `${query.imported} products imported.` : query.categorySaved ? "Category created." : null;

  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Products" description="Manage what your customers can browse and buy."
        actions={<><Link className="ps-button secondary" href="/pocketshop/products/import">Import CSV</Link><Link className="ps-button" href="/pocketshop/products/new">Add product</Link></>} />
      <main className="ps-page">
        {notice && <div className="ps-success" style={{ marginBottom: 16 }}>{notice}</div>}
        {query.error && <div className="ps-error" style={{ marginBottom: 16 }} role="alert">{query.error}</div>}
        <form className="ps-toolbar" method="get">
          <label className="ps-search">Search
            <span style={{ position: "absolute", left: 12, top: 34, color: "#8a9098" }}>⌕</span>
            <input name="q" defaultValue={query.q ?? ""} placeholder="Name or SKU" />
          </label>
          <label>Status<select name="status" defaultValue={query.status ?? ""}><option value="">All</option><option value="ACTIVE">Active</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label>
          <label>Category<select name="categoryId" defaultValue={query.categoryId ?? ""}><option value="">All</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <button className="ps-button secondary" type="submit">Filter</button>
        </form>

        <section className="ps-card">
          <div className="ps-card-head"><div><h2>{products.length} product{products.length === 1 ? "" : "s"}</h2><p>Active products appear on your storefront.</p></div></div>
          {products.length === 0 ? <EmptyState title="No products found" message="Add your first product or adjust the filters above." href="/pocketshop/products/new" cta="Add product" /> : (
            <>
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{products.map(({ product, categoryName, stock, variants, imageUrl }) => (
                    <tr key={product.id}>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {imageUrl ? <Image className="ps-thumb" src={imageUrl} alt="" width={46} height={46} unoptimized /> : <div className="ps-thumb" />}
                        <div><strong>{product.name}</strong><small>{product.sku} · {variants} variant{variants === 1 ? "" : "s"}</small></div>
                      </div></td>
                      <td>{categoryName ?? "—"}</td>
                      <td><Money amount={product.price} currency={store.currency} />{product.compareAtPrice && <small>Was <Money amount={product.compareAtPrice} currency={store.currency} /></small>}</td>
                      <td>{stock}</td>
                      <td><StatusPill value={product.status} kind={product.status === "ACTIVE" ? "active" : product.status === "DRAFT" ? "warning" : undefined} /></td>
                      <td><div className="ps-actions">
                        <Link className="ps-button secondary small" href={`/pocketshop/products/${product.id}`}>Edit</Link>
                        <form action={duplicateProductAction}><input type="hidden" name="productId" value={product.id} /><button className="ps-button secondary small">Duplicate</button></form>
                        <form action={setProductStatusAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="status" value={product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"} />
                          <button className="ps-button secondary small">{product.status === "ACTIVE" ? "Archive" : "Activate"}</button>
                        </form>
                        <details><summary style={{ cursor: "pointer", fontSize: 12 }}>Delete</summary>
                          <form action={deleteProductAction} style={{ display: "grid", gap: 7, marginTop: 8, maxWidth: 190 }}>
                            <input type="hidden" name="productId" value={product.id} />
                            <input name="confirm" placeholder="Type DELETE" aria-label="Type DELETE to confirm" />
                            <button className="ps-button danger small" type="submit">Confirm delete</button>
                          </form>
                        </details>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="ps-mobile-list">
                {products.map(({ product, categoryName, stock, imageUrl }) => (
                  <div className="ps-list-item" key={product.id}>
                    <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                      {imageUrl ? <Image src={imageUrl} alt="" width={46} height={46} className="ps-thumb" unoptimized /> : <div className="ps-thumb" />}
                      <div><strong>{product.name}</strong><small>{product.sku} · <Money amount={product.price} currency={store.currency} /> · {stock} in stock</small><small>{categoryName ?? "Uncategorised"}</small></div>
                    </div>
                    <Link className="ps-button secondary small" href={`/pocketshop/products/${product.id}`}>Edit</Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="ps-card">
          <div className="ps-card-head"><div><h2>Categories</h2><p>Help customers browse your catalogue.</p></div></div>
          <div className="ps-actions" style={{ marginBottom: 14 }}>{categories.map((category) => (
            <form key={category.id} action={toggleCategoryAction} style={{ display: "inline" }}>
              <input type="hidden" name="categoryId" value={category.id} />
              <button type="submit" className={`ps-pill ${category.active ? "active" : ""}`} style={{ border: 0 }}>{category.name}{category.active ? "" : " (hidden)"}</button>
            </form>
          ))}</div>
          <form action={createCategoryAction} style={{ display: "flex", gap: 9, maxWidth: 380 }}>
            <input name="name" placeholder="New category name" minLength={2} maxLength={80} required />
            <button className="ps-button secondary" type="submit">Add</button>
          </form>
        </section>
      </main>
    </>
  );
}

