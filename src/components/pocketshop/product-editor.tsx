"use client";

import Link from "next/link";
import { ActionForm } from "./action-form";
import { MultipleImageField } from "./image-field";
import { VariantEditor } from "./variant-editor";
import { saveProductAction } from "@/modules/pocketshop/product-actions";

type Data = {
  product: { id: string; name: string; sku: string; description: string | null; categoryId: string | null; price: bigint; compareAtPrice: bigint | null; lowStockThreshold: number; weightGrams: number | null; featured: boolean; status: "DRAFT" | "ACTIVE" | "ARCHIVED" } | null;
  categories: Array<{ id: string; name: string }>;
  variants: Array<{ id?: string; name: string; value: string; sku: string; price: string; active: boolean; quantity: number }>;
  images: string[];
};

const inputPrice = (value?: bigint | null) => value == null ? "" : `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;

export function ProductEditor({ data, currency }: { data: Data; currency: string }) {
  const product = data.product;
  return (
    <section className="ps-card">
      <div className="ps-card-head"><div><h2>{product ? "Edit product" : "Product details"}</h2><p>Prices are entered in {currency}.</p></div><Link className="ps-hint" href="/pocketshop/products">← Products</Link></div>
      <ActionForm action={saveProductAction} submitLabel={product ? "Save product" : "Create product"}>
        {(state) => <>
          {product && <input type="hidden" name="productId" value={product.id} />}
          <div className="ps-form-grid">
            <label>Product name<input name="name" defaultValue={product?.name ?? ""} minLength={2} maxLength={160} required /></label>
            {state.fieldErrors?.name && <p className="ps-field-error">{state.fieldErrors.name[0]}</p>}
            <label>SKU<input name="sku" defaultValue={product?.sku ?? ""} maxLength={64} required /></label>
            {state.fieldErrors?.sku && <p className="ps-field-error">{state.fieldErrors.sku[0]}</p>}
            <label>Category<select name="categoryId" defaultValue={product?.categoryId ?? ""}><option value="">Uncategorised</option>{data.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Status<select name="status" defaultValue={product?.status ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></label>
            <label>Selling price<input name="price" defaultValue={inputPrice(product?.price)} placeholder="0.00" inputMode="decimal" required /></label>
            {state.fieldErrors?.price && <p className="ps-field-error">{state.fieldErrors.price[0]}</p>}
            <label>Compare-at price (optional)<input name="compareAtPrice" defaultValue={inputPrice(product?.compareAtPrice)} placeholder="0.00" inputMode="decimal" /></label>
            <label>Low-stock alert at<input name="lowStockThreshold" type="number" min={0} max={1000000} defaultValue={product?.lowStockThreshold ?? 5} /></label>
            <label>Weight in grams (optional)<input name="weightGrams" type="number" min={0} max={1000000} defaultValue={product?.weightGrams ?? 0} /></label>
          </div>
          <label className="full">Description<textarea name="description" defaultValue={product?.description ?? ""} maxLength={2000} placeholder="Describe the product, materials, size, and what is included." /></label>
          <label className="ps-check"><input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} />Feature this product on the storefront</label>
          <div><span className="ps-hint" style={{ display: "block", marginBottom: 10 }}>Variants and stock</span><VariantEditor initial={data.variants} /></div>
          <MultipleImageField name="imageUrls" initialUrls={data.images} />
        </>}
      </ActionForm>
    </section>
  );
}
