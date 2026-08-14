# Architecture assessment

## Starting point

The repository was empty apart from an uninitialized Git directory. There was no legacy application, schema, test suite, or deployment configuration to preserve. Phase 1 therefore establishes a modular-monolith boundary without introducing distributed infrastructure.

## Runtime shape

```text
Browser
  -> Next.js Server Components / Server Actions
    -> authentication + authorization data-access layer
      -> domain application services
        -> Drizzle repositories / transactions
          -> PostgreSQL
```

The `src/app` tree handles routing and presentation. Business rules live under `src/modules`; database definitions and migrations live under `src/db`. Sensitive modules import `server-only`. Components never accept an authoritative tenant ID, role, price, stock level, or financial total from the browser.

## Tenant and branch security

- A user is globally identified by normalized email and joins businesses through `business_memberships`.
- Every operational table will carry `business_id`; branch-scoped tables also carry `branch_id`.
- `requireBusinessAccess`, `requireBranchAccess`, `requireRole`, and `requirePermission` re-load the active database session, user, membership, business, branch, and assignment as appropriate.
- Owner/admin access is business-wide. Restricted roles require an explicit branch assignment.
- Proxy only improves navigation behavior. It is not an authorization boundary.

## Transaction boundaries

Onboarding, receiving, transfers, checkout, POS close, sale reversal, and inventory-count state changes each use a dedicated application service with one PostgreSQL transaction. Checkout acquires inventory row locks in deterministic product order, calculates prices and totals server-side in integer minor units, persists sale/payment/movement records, and uses a unique `(business_id, idempotency_key)` constraint. Stocktake and inventory-changing services share a per-branch PostgreSQL advisory lock, so starting a count and mutating branch stock cannot race. Posting validates the original snapshot and records correction movements atomically.

## Provider and deployment

The driver uses standard PostgreSQL and works with Supabase or Aiven connection strings. `prepare: false` supports transaction poolers commonly used by serverless deployments. Vercel hosts the Next.js runtime; PostgreSQL, never Vercel disk, owns persistent state.

## Initial folder structure

```text
src/
├── app/
│   ├── (auth)/
│   └── (dashboard)/
├── components/
│   ├── auth/
│   └── layout/
├── db/
│   ├── migrations/
│   └── schema/
├── lib/
└── modules/
    ├── auth/
    └── branches/
docs/
```

Domain folders for products, inventory, sales, POS, payments, reporting, and audit will be added when their phase begins rather than created empty.
