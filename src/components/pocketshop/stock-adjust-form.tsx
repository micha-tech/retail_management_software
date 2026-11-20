"use client";

import { useActionState } from "react";
import { adjustStockAction } from "@/modules/pocketshop/product-actions";

export function StockAdjustForm({ inventoryId }: { inventoryId: string }) {
  const [state, action, pending] = useActionState(adjustStockAction, {});
  return (
    <form action={action} className="ps-form" style={{ gap: 7 }}>
      <input type="hidden" name="inventoryId" value={inventoryId} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
        <input name="quantity" type="number" min={-1000000} max={1000000} placeholder="+/- quantity" required aria-label="Stock adjustment quantity" />
        <button className="ps-button secondary small" disabled={pending} type="submit">Adjust</button>
      </div>
      <input name="note" placeholder="Reason for adjustment" minLength={3} maxLength={300} required aria-label="Reason for adjustment" />
      {state.error && <p className="ps-field-error">{state.error}</p>}
    </form>
  );
}
