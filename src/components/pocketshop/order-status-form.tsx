"use client";

import { useActionState } from "react";
import { updateOrderStatusAction } from "@/modules/pocketshop/order-actions";
import type { FulfilmentStatus } from "@/modules/pocketshop/lib/commerce";

export function OrderStatusForm({ orderId, current, options }: { orderId: string; current: FulfilmentStatus; options: FulfilmentStatus[] }) {
  const [state, action, pending] = useActionState(updateOrderStatusAction, {});
  if (options.length === 0) return <p className="ps-hint">This order has reached its final state.</p>;
  return (
    <form action={action} className="ps-form">
      <p className="ps-hint">Current status: {current.replaceAll("_", " ")}</p>
      <input type="hidden" name="orderId" value={orderId} />
      <label>New status<select name="status" defaultValue={options[0]}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>
      <label>Tracking reference (required for dispatch)<input name="trackingRef" maxLength={100} placeholder="Courier waybill or rider reference" /></label>
      <label>Internal note<textarea name="note" maxLength={500} placeholder="Optional note for the order history" /></label>
      {state.error && <p className="ps-error" role="alert">{state.error}</p>}
      <button className="ps-button" disabled={pending}>{pending ? "Updating…" : "Update order"}</button>
    </form>
  );
}
