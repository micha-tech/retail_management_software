# Retail Logic

Retail Logic is a production-oriented, multi-tenant and multi-branch retail operating system covering catalogue, stock, POS, sales, payments, transfers, reconciliation, reporting, and auditability.

## Implementation status

Implemented:

- Next.js App Router, strict TypeScript, Tailwind CSS, and a responsive application shell
- PostgreSQL access through Drizzle ORM and version-controlled migrations
- owner onboarding that atomically creates a business, first branch, membership, assignment, and audit entry
- Argon2id password hashing and opaque database-backed sessions in secure cookies
- login throttling, logout, protected routes, and server-side authorization
- business roles, reusable permission checks, tenant isolation, and branch access checks
- audited branch create/edit/deactivate, staff role/assignment management, and forced first-login password replacement
- searchable/filterable product catalogue with audited pricing, branch inventory, receiving, adjustments, and an immutable stock ledger
- branch inventory counts with draft/count/review/post lifecycle, operation pausing, CSV inventory/count import and export, variance correction movements, and immutable posted results
- POS sessions, category/barcode search, discounts, cash movements, atomic idempotent checkout, payments, locking, reconciliation, and protected receipts
- branch-scoped dashboards and date filters; sales, cashier, product, inventory, movement, payment, margin, and POS discrepancy reports; sales/inventory CSV exports
- controlled inter-branch transfers and completed-sale reversal
- structured request errors, health endpoint, correlation IDs, offline indicator, security headers, and Playwright workflows

Before public launch, complete the environment-specific operational checklist in `docs/OPERATIONS.md`. Preview and Production must never share databases.

## Technical choices

**Drizzle ORM** was selected over Prisma because its schema and query API remain close to PostgreSQL, generated SQL migrations are easy to inspect, and transaction/locking primitives needed by checkout remain directly accessible. PostgreSQL is the source of truth; no domain logic depends on a Supabase-specific API.

**Database-backed sessions** use random opaque tokens. Only a SHA-256 token digest is persisted; the raw token is sent in an `HttpOnly`, `SameSite=Lax`, secure-in-production cookie. Proxy performs only an optimistic cookie-presence redirect, while protected pages and every mutation load the live database session and re-authorize near the data layer.

See [architecture](./docs/ARCHITECTURE.md), [proposed schema](./docs/DATABASE_SCHEMA.md), [implementation plan](./docs/IMPLEMENTATION_PLAN.md), and [operations](./docs/OPERATIONS.md).

## Local setup

1. Use Node.js 20.9 or newer and provision a PostgreSQL database.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Optionally set `SEED_PASSWORD` and run `npm run db:seed` for three branches, five staff, 30 products, branch inventory, and historical sales.
6. Run `npm run dev` and open `http://localhost:3000/onboarding`.

Quality gates:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration # dedicated TEST_DATABASE_URL only
npm run test:e2e        # isolated E2E credentials only
npm run build
```

## Environment separation

Create independent development, Vercel Preview, and Vercel Production PostgreSQL databases. Never reuse the production URL in Preview. Configure environment-scoped variables in Vercel and run migrations against each database as an explicit release step.
