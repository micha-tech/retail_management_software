import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
    : undefined;
const client = postgres(databaseUrl, { max: 1, prepare: false, ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined });
const database = drizzle(client);

async function main() {
  try {
    await migrate(database, { migrationsFolder: "./src/db/migrations" });
    console.info("Database migrations applied successfully.");
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database migration failed.");
  process.exitCode = 1;
});
