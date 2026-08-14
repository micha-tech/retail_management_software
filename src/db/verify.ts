import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import postgres from "postgres";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const caCertificate = process.env.DATABASE_CA_CERT_BASE64
  ? Buffer.from(process.env.DATABASE_CA_CERT_BASE64, "base64").toString("utf8")
  : process.env.DATABASE_CA_CERT_PATH
    ? readFileSync(process.env.DATABASE_CA_CERT_PATH, "utf8")
    : undefined;
const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: caCertificate ? { ca: caCertificate, rejectUnauthorized: true } : undefined });

async function main() {
  try {
  await sql.begin(async (transaction) => {
    await transaction`set transaction read only`;
    const [connection] = await transaction<{ database: string; user_name: string; ssl: boolean }[]>`
      select current_database() as database, current_user as user_name,
        coalesce((select ssl from pg_stat_ssl where pid = pg_backend_pid()), false) as ssl
    `;
    const tables = await transaction<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `;
    const constraints = await transaction<{ count: number }[]>`
      select count(*)::int as count from information_schema.table_constraints
      where table_schema = 'public'
    `;
    const tenantConstraints = await transaction<{ count: number }[]>`
      select count(*)::int as count from information_schema.table_constraints
      where table_schema = 'public' and constraint_type = 'FOREIGN KEY'
        and (constraint_name like '%tenant_%' or constraint_name like '%membership_%')
    `;
    const immutableAuditTrigger = await transaction<{ exists: boolean }[]>`
      select exists (
        select 1 from information_schema.triggers
        where event_object_schema = 'public' and event_object_table = 'audit_logs' and trigger_name = 'audit_logs_immutable'
      ) as exists
    `;
    const immutableCountTriggers = await transaction<{ count: number }[]>`
      select count(distinct trigger_name)::int as count from information_schema.triggers
      where event_object_schema = 'public'
        and trigger_name in ('inventory_counts_terminal_immutable', 'inventory_count_items_terminal_immutable')
    `;
    const expectedTablesExist = ["businesses", "branches", "users"].every((name) => tables.some((table) => table.table_name === name));
    const counts = expectedTablesExist
      ? await transaction<{ businesses: number; branches: number; users: number }[]>`
          select
            (select count(*)::int from businesses) as businesses,
            (select count(*)::int from branches) as branches,
            (select count(*)::int from users) as users
        `
      : [];
    const [migrationJournal] = await transaction<{ journal_exists: boolean }[]>`
      select to_regclass('drizzle.__drizzle_migrations') is not null as journal_exists
    `;
    const migrationRows = migrationJournal.journal_exists
      ? await transaction<{ id: number; created_at: string }[]>`select id, created_at::text from drizzle.__drizzle_migrations order by id`
      : [];
    console.info(JSON.stringify({
      database: connection.database,
      user: connection.user_name,
      tls: connection.ssl,
      publicTables: tables.map((table) => table.table_name),
      constraintCount: constraints[0]?.count ?? 0,
      tenantIsolationForeignKeys: tenantConstraints[0]?.count ?? 0,
      immutableAuditTrigger: immutableAuditTrigger[0]?.exists ?? false,
      immutableInventoryCountTriggers: immutableCountTriggers[0]?.count ?? 0,
      migrationJournalExists: migrationJournal.journal_exists,
      migrationRows,
      rowCounts: counts[0] ?? null,
    }, null, 2));
  });
  } finally {
    await sql.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Database verification failed.");
  process.exitCode = 1;
});
