"use client";

import { useEffect, useState, useActionState } from "react";
import { checkoutAction } from "@/modules/pocketshop/cart-actions";
import type { PocketActionState } from "@/modules/pocketshop/schemas";

type Zone = { id: string; name: string; fee: string; estimatedDays: string | null };
type Props = {
  storeSlug: string;
  zones: Zone[];
  paymentMethods: string[];
  paymentTiming: string;
  onlinePayments: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
};

export function CheckoutForm({ storeSlug, zones, paymentMethods, paymentTiming, onlinePayments, deliveryEnabled, pickupEnabled }: Props) {
  const [state, action, pending] = useActionState<PocketActionState, FormData>(checkoutAction, {});
  const [key, setKey] = useState("");
  const [delivery, setDelivery] = useState<"DELIVERY" | "PICKUP">(deliveryEnabled ? "DELIVERY" : "PICKUP");
  useEffect(() => setKey(crypto.randomUUID()), []);
  const methods = paymentMethods.filter((method) => (method === "CARD" || method === "USSD" ? onlinePayments : true));
  const money = (minor: string) => (Number(minor) / 100).toFixed(2);

  return (
    <form action={action} className="ps-stack">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="idempotencyKey" value={key} />
      <div className="ps-checkout-card">
        <h2>Your details</h2>
        <div className="ps-form ps-form-grid">
          <label>Full name<input name="customerName" autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label>Phone number<input name="customerPhone" type="tel" autoComplete="tel" minLength={7} maxLength={30} required /></label>
          <label className="full">Email (optional)<input name="customerEmail" type="email" autoComplete="email" /></label>
        </div>
      </div>
      <div className="ps-checkout-card">
        <h2>How would you like to receive your order?</h2>
        <div className="ps-radio-grid">
          <label className="ps-radio-card"><input type="radio" name="deliveryMethod" value="DELIVERY" disabled={!deliveryEnabled} checked={delivery === "DELIVERY"} onChange={() => setDelivery("DELIVERY")} /><span>Delivery</span></label>
          <label className="ps-radio-card"><input type="radio" name="deliveryMethod" value="PICKUP" disabled={!pickupEnabled} checked={delivery === "PICKUP"} onChange={() => setDelivery("PICKUP")} /><span>Pickup from store</span></label>
        </div>
        {delivery === "DELIVERY" && (
          <div className="ps-form ps-form-grid" style={{ marginTop: 18 }}>
            {zones.length > 0 && (
              <label className="full">Delivery area
                <select name="deliveryZoneId" defaultValue="">
                  <option value="">Select an area</option>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · ₦{money(zone.fee)}{zone.estimatedDays ? ` · ${zone.estimatedDays}` : ""}</option>)}
                </select>
              </label>
            )}
            <label className="full">Delivery address<input name="address" autoComplete="street-address" maxLength={300} /></label>
            <label>City<input name="city" autoComplete="address-level2" maxLength={80} /></label>
            <label>State<input name="state" autoComplete="address-level1" maxLength={80} /></label>
            <label className="full">Delivery instructions (optional)<textarea name="deliveryInstructions" maxLength={500} placeholder="Landmark, gate code, preferred time…" /></label>
          </div>
        )}
      </div>
      <div className="ps-checkout-card">
        <h2>Payment</h2>
        <p className="ps-hint" style={{ marginBottom: 14 }}>
          {paymentTiming === "ON_DELIVERY" ? "Pay when your order arrives or when you collect it." : paymentTiming === "PARTIAL" ? "A deposit is required now; the balance is paid on delivery." : "Payment is required before fulfilment."}
        </p>
        <div className="ps-radio-grid">
          {methods.map((method) => (
            <label className="ps-radio-card" key={method}>
              <input type="radio" name="paymentMethod" value={method} defaultChecked={method === methods[0]} />
              <span>{method === "CASH_ON_DELIVERY" ? "Cash on delivery" : method === "BANK_TRANSFER" ? "Bank transfer" : method === "CARD" ? "Card" : "USSD"}</span>
            </label>
          ))}
        </div>
      </div>
      {state.error && <p className="ps-error" role="alert">{state.error}</p>}
      <button className="ps-button" disabled={pending || !key}>{pending ? "Placing order…" : "Place order"}</button>
      <p className="ps-hint">Prices and stock are checked again on the server before your order is confirmed.</p>
    </form>
  );
}
