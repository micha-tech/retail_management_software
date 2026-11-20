"use client";

import { useActionState } from "react";
import { commitProductImportAction, importProductsPreviewAction, type ImportPreviewState } from "@/modules/pocketshop/product-actions";

export function ImportCsvForm() {
  const [state, action, pending] = useActionState<ImportPreviewState, FormData>(importProductsPreviewAction, {});
  return (
    <>
      <section className="ps-card">
        <div className="ps-card-head"><div><h2>1. Paste your CSV</h2><p>Required columns: name, sku, price, quantity. Optional: compare_at_price, description, category, low_stock_threshold, status.</p></div></div>
        <form action={action} className="ps-form">
          <textarea name="csv" defaultValue={state.csv ?? ""} rows={12} placeholder={"name,sku,price,quantity,category\nLinen Shirt,LINEN-001,12500,12,Clothing"} maxLength={500000} required />
          {state.error && <p className="ps-error" role="alert">{state.error}</p>}
          <button className="ps-button secondary" disabled={pending}>{pending ? "Checking…" : "Preview import"}</button>
        </form>
      </section>
      {state.rows && state.rows.length > 0 && (
        <section className="ps-card">
          <div className="ps-card-head"><div><h2>2. Confirm {state.total} product{state.total === 1 ? "" : "s"}</h2><p>Nothing has been created yet.</p></div></div>
          <div className="ps-table-wrap">
            <table className="ps-table"><thead><tr><th>Row</th><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Category</th></tr></thead>
              <tbody>{state.rows.map((row) => <tr key={row.row}><td>{row.row}</td><td><strong>{row.name}</strong></td><td>{row.sku}</td><td>{row.price}</td><td>{row.quantity}</td><td>{row.category || "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <form action={commitProductImportAction} style={{ marginTop: 18 }}>
            <input type="hidden" name="csv" value={state.csv ?? ""} />
            <button className="ps-button" type="submit">Import {state.total} products</button>
          </form>
          <p className="ps-hint" style={{ marginTop: 10 }}>The file is validated again on commit. If any row becomes invalid, no products are created.</p>
        </section>
      )}
    </>
  );
}
