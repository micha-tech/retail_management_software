"use client";

import { useActionState } from "react";
import { onboardAction } from "@/modules/auth/actions";
import type { ActionState } from "@/modules/auth/schemas";

const initialState: ActionState = {};

export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboardAction, initialState);
  return (
    <form action={action} className="form-stack">
      <div className="form-section"><span>Owner</span><div className="form-grid">
        <label>Full name<input name="ownerName" autoComplete="name" required /></label>
        <label>Work email<input name="email" type="email" autoComplete="email" required /></label>
      </div><label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} required /><small>12+ characters with uppercase, lowercase, and a number.</small></label></div>
      <div className="form-section"><span>Business</span><div className="form-grid">
        <label>Business name<input name="businessName" required /></label>
        <label>Currency<select name="currency" defaultValue="NGN"><option value="NGN">NGN — Nigerian naira</option><option value="USD">USD — US dollar</option><option value="GBP">GBP — Pound sterling</option><option value="GHS">GHS — Ghanaian cedi</option></select></label>
        <label>Timezone<input name="timezone" defaultValue="Africa/Lagos" required /></label>
      </div></div>
      <div className="form-section"><span>First branch</span><div className="form-grid">
        <label>Branch name<input name="branchName" placeholder="Ikeja" required /></label>
        <label>Branch code<input name="branchCode" placeholder="IKJ" required /></label>
      </div><label>Address<input name="address" /></label></div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.fieldErrors && <p className="form-error" role="alert">Please review the highlighted details and try again.</p>}
      <button className="button primary" disabled={pending}>{pending ? "Creating workspace…" : "Create business"}</button>
    </form>
  );
}
