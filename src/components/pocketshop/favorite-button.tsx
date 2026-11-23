"use client";

import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pocketshop-favourites";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readSaved(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function FavoriteButton({ productId }: { productId: string }) {
  const saved = useSyncExternalStore(
    subscribe,
    () => readSaved().includes(productId),
    () => false,
  );

  function toggle() {
    try {
      const current = readSaved();
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-200)));
      listeners.forEach((listener) => listener());
    } catch {
      /* Storage may be unavailable in private mode. */
    }
  }

  return (
    <button type="button" className={`ps-favorite${saved ? " saved" : ""}`} onClick={toggle}
      aria-label={saved ? "Remove from saved items" : "Save this product"} aria-pressed={saved} title="Saved on this device">
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
