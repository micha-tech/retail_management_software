import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run database tooling.");
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
  : undefined;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 5432),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: databaseUrl.pathname.slice(1),
    ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true, servername: databaseUrl.hostname } : "require",
  },
  strict: true,
  verbose: true,
});
