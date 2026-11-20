import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { psAssets } from "@/db/schema";
import { MAX_IMAGE_BYTES, validateImage } from "./lib/security";

const UPLOAD_ROOT = process.env.POCKETSHOP_UPLOAD_DIR
  ? path.resolve(process.env.POCKETSHOP_UPLOAD_DIR)
  : path.join(process.cwd(), ".data", "pocketshop", "uploads");

function extensionFor(mime: string) {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/avif" ? "avif" : "jpg";
}

export function assetUrl(assetId: string) {
  return `/api/pocketshop/assets/${assetId}`;
}

/**
 * Local filesystem adapter. It keeps binaries out of PostgreSQL and exposes a
 * stable URL. Serverless deployments must provide persistent object storage;
 * see docs/POCKETSHOP.md for the required adapter contract.
 */
export async function storeImage(input: { storeId: string; businessId: string; file: File }) {
  if (input.file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 5 MB or smaller.");
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const error = validateImage(bytes, input.file.type, input.file.size);
  if (error) throw new Error(error);

  const id = randomUUID();
  const fileName = `${id}.${extensionFor(input.file.type)}`;
  const relativePath = path.join(input.businessId, input.storeId, fileName);
  const destination = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: "wx" });

  try {
    const [asset] = await db.insert(psAssets).values({
      id, storeId: input.storeId, businessId: input.businessId,
      fileName: input.file.name.slice(0, 200) || fileName,
      filePath: relativePath, mimeType: input.file.type, sizeBytes: bytes.length,
    }).returning();
    return asset;
  } catch (error) {
    await import("node:fs/promises").then((fs) => fs.unlink(destination).catch(() => undefined));
    throw error;
  }
}

export async function readAsset(assetId: string) {
  const [asset] = await db.select().from(psAssets).where(eq(psAssets.id, assetId)).limit(1);
  if (!asset) return null;
  const bytes = await readFile(path.join(UPLOAD_ROOT, asset.filePath));
  return { asset, bytes };
}

export async function verifyStoreAssetOwnership(urls: string[], storeId: string, businessId: string) {
  const ids = urls.map((url) => url.match(/\/api\/pocketshop\/assets\/([0-9a-f-]{36})$/i)?.[1]).filter((id): id is string => Boolean(id));
  if (ids.length !== urls.length || new Set(ids).size !== ids.length) return false;
  const { inArray, and } = await import("drizzle-orm");
  const rows = await db.select({ id: psAssets.id }).from(psAssets).where(and(inArray(psAssets.id, ids), eq(psAssets.storeId, storeId), eq(psAssets.businessId, businessId)));
  return rows.length === ids.length;
}
