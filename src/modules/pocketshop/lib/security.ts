import { createHash, timingSafeEqual } from "node:crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Pure decision helper used by the database-backed limiter. */
export function rateLimitDecision(attempts: number, windowStart: Date, limit: number, windowMs: number, now = new Date()) {
  if (now.getTime() - windowStart.getTime() >= windowMs) return { allowed: true, resetWindow: true, attempts: 1 };
  return { allowed: attempts < limit, resetWindow: false, attempts: attempts + 1 };
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImage(bytes: Uint8Array, mimeType: string, size: number): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) return "Only JPG, PNG, WebP and AVIF images are supported.";
  if (size === 0 || size > MAX_IMAGE_BYTES) return "Images must be between 1 byte and 5 MB.";
  if (bytes.length !== size) return "The uploaded file is incomplete.";
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const isAvif = String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if ((mimeType === "image/jpeg" && !isJpeg) || (mimeType === "image/png" && !isPng) || (mimeType === "image/webp" && !isWebp) || (mimeType === "image/avif" && !isAvif)) {
    return "The file contents do not match the image type.";
  }
  return null;
}
