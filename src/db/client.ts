import "server-only";

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) throw new Error("DATABASE_URL is not configured. Set it in the runtime environment before starting the application.");

let databaseHost: string;
try {
  databaseHost = new URL(connectionString).hostname;
} catch {
  throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
}
if (process.env.VERCEL && ["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error("DATABASE_URL points to localhost, which is not reachable from Vercel.");
}
if (process.env.VERCEL && process.env.DATABASE_CA_CERT_PATH) {
  throw new Error("DATABASE_CA_CERT_PATH cannot reference a workstation file on Vercel. Configure DATABASE_CA_CERT_BASE64 instead.");
}
const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
  : undefined;
if (process.env.NODE_ENV === "production" && databaseHost.endsWith(".aivencloud.com") && !caCertificate) {
  throw new Error("DATABASE_CA_CERT_BASE64 is required for verified TLS connections to Aiven in production.");
}

const globalForDatabase = globalThis as unknown as { retailSql?: ReturnType<typeof postgres> };
const sql = globalForDatabase.retailSql ?? postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 1 : 3,
  idle_timeout: process.env.NODE_ENV === "production" ? 5 : 20,
  max_lifetime: process.env.NODE_ENV === "production" ? 60 * 5 : 60 * 10,
  connect_timeout: 10,
  prepare: false,
  ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined,
});

if (process.env.NODE_ENV !== "production") globalForDatabase.retailSql = sql;

export const db = drizzle(sql, { schema });
export async function closeDatabase() { await sql.end(); }
