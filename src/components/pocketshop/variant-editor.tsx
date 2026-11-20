"use client";

import { useState } from "react";

export type VariantRow = { id?: string; name: string; value: string; sku: string; price: string; active: boolean; quantity: number };

export function VariantEditor({ initial }: { initial?: VariantRow[] }) {
  const [rows, setRows] = useState<VariantRow[]>(initial?.length ? initial : [{ name: "Default", value: "Standard", sku: "", price: "", active: true, quantity: 0 }]);

  function update(index: number, patch: Partial<VariantRow>) {
    setRows((current) => current.map((row, position) => position === index ? { ...row, ...patch } : row));
  }

  return (
    <div className="ps-stack">
      {rows.map((row, index) => (
        <div className="ps-variant" key={row.id ?? index}>
          <label>Option<input value={row.name} placeholder="Size" onChange={(event) => update(index, { name: event.target.value })} maxLength={40} required /></label>
          <label>Value<input value={row.value} placeholder="Medium" onChange={(event) => update(index, { value: event.target.value })} maxLength={40} required /></label>
          <label>SKU<input value={row.sku} placeholder="Optional" onChange={(event) => update(index, { sku: event.target.value })} maxLength={64} /></label>
          <label>Price (optional)<input value={row.price} placeholder="Uses product price" inputMode="decimal" onChange={(event) => update(index, { price: event.target.value })} /></label>
          <label>Stock<input type="number" min={0} max={1000000} value={row.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} /></label>
          <button type="button" className="ps-button secondary small" disabled={rows.length === 1}
            onClick={() => setRows((current) => current.filter((_, position) => position !== index))}>Remove</button>
          <label className="ps-check full"><input type="checkbox" checked={row.active} onChange={(event) => update(index, { active: event.target.checked })} />Available for purchase</label>
        </div>
      ))}
      <button type="button" className="ps-button secondary small" onClick={() => setRows((current) => [...current, { name: "", value: "", sku: "", price: "", active: true, quantity: 0 }])}>Add another variant</button>
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
    </div>
  );
}
