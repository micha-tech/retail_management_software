"use client";

import { useActionState } from "react";
import { registerPocketShopAction } from "@/modules/pocketshop/auth-actions";

export function RegisterPocketForm() {
  const [state, action, pending] = useActionState(registerPocketShopAction, {});
  return (
    <form action={action} className="ps-form">
      <label>Full name<input name="fullName" autoComplete="name" minLength={2} maxLength={100} required /></label>
      {state.fieldErrors?.fullName && <p className="ps-field-error">{state.fieldErrors.fullName[0]}</p>}
      <label>Store name<input name="storeName" autoComplete="organization" minLength={2} maxLength={120} required /></label>
      {state.fieldErrors?.storeName && <p className="ps-field-error">{state.fieldErrors.storeName[0]}</p>}
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      {state.fieldErrors?.email && <p className="ps-field-error">{state.fieldErrors.email[0]}</p>}
      <label>Phone<input name="phone" type="tel" autoComplete="tel" minLength={7} maxLength={30} required /></label>
      {state.fieldErrors?.phone && <p className="ps-field-error">{state.fieldErrors.phone[0]}</p>}
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      {state.fieldErrors?.password && <p className="ps-field-error">{state.fieldErrors.password[0]}</p>}
      {state.error && <p className="ps-error" role="alert">{state.error}</p>}
      <button className="ps-button" disabled={pending}>{pending ? "Creating store…" : "Create my store"}</button>
    </form>
  );
}
