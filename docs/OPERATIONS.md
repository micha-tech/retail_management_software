# Environment and operations

## Environment variables

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | server only | PostgreSQL connection string; require TLS outside local development |
| `DATABASE_CA_CERT_BASE64` | recommended | server only | base64-encoded provider CA used for certificate and hostname verification |
| `DATABASE_CA_CERT_PATH` | local alternative | server only | local CA PEM path; use the base64 variable on Vercel |
| `APP_URL` | yes | server only | canonical application origin for absolute URLs/security policy |
| `LOG_LEVEL` | no | server only | structured logging threshold |
| `VERCEL_ENV` | supplied by Vercel | server | development/preview/production metadata |
| `SEED_PASSWORD` | development only | seed process | initial password for realistic Phase 1 staff; seed refuses production |
| `TEST_DATABASE_URL` | integration only | test runner | dedicated migrated database used by transaction/concurrency integration tests |
| `E2E_BASE_URL` and `E2E_*` | E2E only | Playwright | isolated Preview URL and owner/cashier/product fixtures; never Production |

No database URL, privileged database key, password, or session token may use a `NEXT_PUBLIC_` prefix.

## Database environments

- Development uses disposable local or managed development data.
- Preview uses a dedicated non-production database and test identities.
- Production uses a separately credentialed database with least-privilege application and migration users where supported.

## Backups and recovery

Enable the provider's managed daily backups plus point-in-time recovery. Start with 30-day production retention and 7-day preview retention, then adjust to contractual requirements. Quarterly, restore the latest production backup into an isolated recovery project, run migration/status checks, compare critical row counts and a sample of sale-to-payment-to-stock chains, record RPO/RTO, then destroy the recovery copy.

For an emergency restore: freeze writes, identify the incident time, restore to a new database, verify integrity, rotate credentials, update the production environment to the restored endpoint, deploy, smoke-test authentication and core transactions, then reopen writes. Never overwrite the damaged database before validation.

Use provider-native logical export (`pg_dump` in custom format) for controlled exports. Encrypt exports, restrict access, verify with `pg_restore --list`, and apply a documented retention/deletion policy.

## Vercel release

1. Merge through GitHub after quality gates pass.
2. Apply pending migrations to the target environment with an explicit release job.
3. Deploy the same reviewed commit to Vercel.
4. Smoke-test login, authorization, and a read-only tenant-scoped page.
5. Monitor structured errors and transaction failures; rollback application code when safe, but never reverse an applied schema migration destructively.

## Production release gate

- Rotate any credential that has appeared in chat, logs, or local command history.
- Use a migration owner only in the release job and a separate least-privilege runtime role in `DATABASE_URL`.
- Use an Aiven PgBouncer transaction pool or enforce a conservative serverless connection budget; the runtime client opens at most one connection per function instance.
- Configure unique Development, Preview, E2E, and Production databases and environment variables.
- Store the Aiven CA as `DATABASE_CA_CERT_BASE64` in Vercel; never configure a workstation certificate path.
- Configure an error-tracking destination for the structured `onRequestError` events and alert on checkout failures and health degradation.
- Verify managed backup retention and complete a documented restore exercise.
- Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, and `npm audit --omit=dev`.
- Run `npm run test:integration` only against a migrated disposable database and confirm all six transaction tests execute rather than skip.
- Confirm the inventory-count acceptance workflow: start a branch count with closed tills, verify stock mutations are paused, import or enter all quantities, review, post, and reconcile correction movements to variances.
- Deploy Preview, execute owner/cashier/inventory/transfer acceptance workflows, inspect Vercel logs, then promote the exact commit.
