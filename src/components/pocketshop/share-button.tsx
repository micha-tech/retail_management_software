"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="ps-button secondary small" onClick={async () => {
      const url = window.location.href;
      try {
        if (navigator.share) await navigator.share({ title, url });
        else { await navigator.clipboard.writeText(url); setCopied(true); }
      } catch { /* User cancelled the native share sheet. */ }
    }}><Share2 size={14} />{copied ? "Link copied" : "Share"}</button>
  );
}
