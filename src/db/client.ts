import "server-only";

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL ?? "postgresql://invalid:invalid@localhost:5432/invalid";
const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
  : undefined;

const globalForDatabase = globalThis as unknown as { retailSql?: ReturnType<typeof postgres> };
const sql = globalForDatabase.retailSql ?? postgres(connectionString, {
  max: process.env.NODE_ENV === "production" ? 1 : 3,
  idle_timeout: 20,
  max_lifetime: 60 * 10,
  connect_timeout: 10,
  prepare: false,
  ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined,
});

if (process.env.NODE_ENV !== "production") globalForDatabase.retailSql = sql;

export const db = drizzle(sql, { schema });
export async function closeDatabase() { await sql.end(); }
