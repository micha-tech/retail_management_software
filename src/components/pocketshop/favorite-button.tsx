"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

export function FavoriteButton({ productId }: { productId: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const current: string[] = JSON.parse(localStorage.getItem("pocketshop-favourites") ?? "[]");
      setSaved(current.includes(productId));
    } catch { setSaved(false); }
  }, [productId]);

  function toggle() {
    try {
      const current: string[] = JSON.parse(localStorage.getItem("pocketshop-favourites") ?? "[]");
      const next = current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId];
      localStorage.setItem("pocketshop-favourites", JSON.stringify(next.slice(-200)));
      setSaved(next.includes(productId));
    } catch { /* Storage may be unavailable in private mode. */ }
  }

  return (
    <button type="button" className={`ps-favorite${saved ? " saved" : ""}`} onClick={toggle}
      aria-label={saved ? "Remove from saved items" : "Save this product"} aria-pressed={saved} title="Saved on this device">
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
