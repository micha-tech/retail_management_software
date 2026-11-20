"use client";

import { useActionState, type ReactNode } from "react";
import type { PocketActionState } from "@/modules/pocketshop/schemas";

type Props = {
  action: (state: PocketActionState, formData: FormData) => Promise<PocketActionState>;
  children: ReactNode | ((state: PocketActionState) => ReactNode);
  submitLabel?: string;
  pendingLabel?: string;
  className?: string;
  buttonClass?: string;
  initial?: PocketActionState;
};

export function ActionForm({ action, children, submitLabel = "Save changes", pendingLabel = "Saving…", className = "ps-form", buttonClass = "ps-button", initial = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className={className}>
      {typeof children === "function" ? children(state) : children}
      {state.error && <p className="ps-error" role="alert">{state.error}</p>}
      <button className={buttonClass} disabled={pending}>{pending ? pendingLabel : submitLabel}</button>
    </form>
  );
}
