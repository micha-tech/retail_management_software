"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { ToastType } from "@/lib/toast";

const toastDetails = {
  success: { title: "Action completed", icon: CheckCircle2 },
  error: { title: "Action failed", icon: CircleAlert },
  info: { title: "Notice", icon: Info },
} satisfies Record<ToastType, { title: string; icon: typeof CheckCircle2 }>;

export function ActionToast() {
  const searchParams = useSearchParams();
  const message = searchParams.get("toast")?.trim().slice(0, 240) || "";
  const requestedType = searchParams.get("toastType");
  const type: ToastType = requestedType === "error" || requestedType === "info" ? requestedType : "success";
  const toastId = searchParams.get("toastId") || `${type}:${message}`;
  const [dismissedId, setDismissedId] = useState("");
  const visible = Boolean(message) && dismissedId !== toastId;
  const details = toastDetails[type];
  const Icon = details.icon;

  const dismiss = useCallback(() => {
    setDismissedId(toastId);
    const next = new URLSearchParams(window.location.search);
    next.delete("toast");
    next.delete("toastType");
    next.delete("toastId");
    const query = next.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [toastId]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(dismiss, 5200);
    return () => window.clearTimeout(timer);
  }, [dismiss, visible]);

  if (!visible) return null;

  return <div className={`action-toast toast-${type}`} role={type === "error" ? "alert" : "status"} aria-live={type === "error" ? "assertive" : "polite"}>
    <div className="toast-icon"><Icon size={20}/></div>
    <div className="toast-copy"><strong>{details.title}</strong><span>{message}</span></div>
    <button type="button" onClick={dismiss} aria-label="Dismiss notification"><X size={17}/></button>
    <div className="toast-progress" aria-hidden="true"/>
  </div>;
}
