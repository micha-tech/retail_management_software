"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { uploadProductImageAction } from "@/modules/pocketshop/product-actions";

async function upload(file: File) {
  const data = new FormData();
  data.set("file", file);
  const result = await uploadProductImageAction(data);
  if (result.error) throw new Error(result.error);
  if (!result.url) throw new Error("Upload failed.");
  return result.url;
}

export function ImageField({ name, initialUrl, label = "Image" }: { name: string; initialUrl?: string | null; label?: string }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="ps-upload">
      <span className="ps-hint">{label} · JPG, PNG, WebP or AVIF up to 5 MB</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setError("");
          startTransition(async () => {
            try { setUrl(await upload(file)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
          });
        }} />
      {pending && <span className="ps-hint">Uploading…</span>}
      {error && <span className="ps-field-error">{error}</span>}
      <input type="hidden" name={name} value={url} />
      {url && (
        <div className="ps-upload-preview">
          <Image src={url} alt="Selected upload" width={52} height={52} unoptimized />
          <span>{url.split("/").pop()}</span>
          <button type="button" className="ps-button secondary small" onClick={() => setUrl("")}>Remove</button>
        </div>
      )}
    </div>
  );
}

export function MultipleImageField({ name, initialUrls = [], label = "Product photos" }: { name: string; initialUrls?: string[]; label?: string }) {
  const [urls, setUrls] = useState(initialUrls);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="ps-upload">
      <span className="ps-hint">{label} · up to 8 images, JPG/PNG/WebP/AVIF, 5 MB each. The first image is the cover.</span>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={pending || urls.length >= 8}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setError("");
          startTransition(async () => {
            try {
              const uploaded = await upload(file);
              setUrls((current) => [...current, uploaded].slice(0, 8));
            } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed."); }
          });
        }} />
      {pending && <span className="ps-hint">Uploading…</span>}
      {error && <span className="ps-field-error">{error}</span>}
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      {urls.length > 0 && (
        <div className="ps-image-grid">
          {urls.map((url, index) => (
            <div className="ps-image-tile" key={url}>
              <Image src={url} alt={`Product image ${index + 1}`} width={90} height={90} unoptimized />
              {index === 0 && <span className="ps-pill" style={{ position: "absolute", bottom: 4, left: 4 }}>Cover</span>}
              <button type="button" aria-label="Remove image" onClick={() => setUrls((current) => current.filter((item) => item !== url))}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
