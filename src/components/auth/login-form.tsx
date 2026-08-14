"use client";

import { useActionState } from "react";
import { loginAction } from "@/modules/auth/actions";
import type { ActionState } from "@/modules/auth/schemas";

const initialState: ActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="form-stack">
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      {state.fieldErrors?.email && <p className="field-error">{state.fieldErrors.email[0]}</p>}
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
