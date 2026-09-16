# Retail Logic current state

Audit date: 2026-09-16. This document describes the repository as it exists, including the staged purchasing module and migrations `0013` and `0014`. Those migrations must be applied to an environment before purchasing is used there.

## Existing architecture

### Frontend

- **Framework and routing:** Next.js 16 App Router with React 19 and TypeScript. Route groups separate marketing, authentication, dashboard, and platform-administration experiences.
- **Rendering and mutations:** server components read operational data directly; Next Server Actions perform mutations. There is no browser-side API client or global state-management library.
- **Components and styles:** local React components, Lucide icons, CSS in `globals.css`, dashboard `workspace.css`, and marketing styles. The dashboard is responsive and has common empty/error/toast patterns.
- **Authentication:** login, onboarding, forced password change, and opaque `HttpOnly` database-backed sessions.
- **API communication:** Server Actions are the primary mutation interface. Route handlers are limited to health, exports/templates, and POS closing-report downloads.

### Backend

- **Runtime:** a modular Next.js monolith. Domain rules sit under `src/modules`; data access is Drizzle over PostgreSQL.
- **Transactions:** checkout, POS close, receiving, stock adjustment, transfers, sale reversal, inventory counts, and purchase-order receiving use PostgreSQL transactions. Inventory-mutating paths use a per-branch advisory lock and respect active counts.
- **Background processing / queues / caching:** none. Dashboard and reports query transactional tables live. There are no cron jobs, workers, queues, materialized aggregates, or shared cache.
- **External integrations:** none in the application runtime. Payment methods are recorded internally; no payment gateway, settlement feed, webhook receiver, e-commerce connector, hardware adapter, email/SMS service, or object storage integration is present.
- **Errors and observability:** structured application errors, a health endpoint, Next instrumentation, structured console logging, and request correlation support. No configured error-tracking or metrics backend is committed.

### Database

- **Engine / ORM:** PostgreSQL through `postgres` and Drizzle ORM; SQL migrations are versioned in `src/db/migrations`.
- **Money and time:** money uses integer minor units (`bigint`); timestamps use UTC `timestamptz`.
- **Core entities:** businesses, branches, users, memberships, assignments, sessions, audit logs, subscriptions, catalogue, inventory, POS/sales/payments, credit, transfers, stock counts, suppliers, purchase orders, receipts, and purchase payments.
- **Integrity:** composite tenant foreign keys and check constraints protect most tenant/branch relationships. Critical operational services lock records and write stock/financial ledgers atomically. The purchasing migrations add tenant-bound order/payment/receipt links.

### Authentication and authorization

- Global users join tenant businesses through `business_memberships`; non-owner/admin staff need `branch_assignments`.
- Roles: owner, admin, branch manager, cashier, and storekeeper. Permissions are centrally defined in `src/modules/auth/permissions.ts` and checked server-side by `requirePermission` and `requireBranchAccess`.
- Active subscriptions gate access; proxy middleware only redirects unauthenticated navigation and is not relied on as an authorization boundary.

## Existing retail modules

| Module | Status | Relevant implementation | Current capability and limitations |
| --- | --- | --- | --- |
| POS | Exists | `src/modules/pos`, `/pos` | Sessions, checkout, discounts, tender recording, cash movements, receipt and closing report. Network-dependent; no refunds at POS, offline queue, scanner/printer adapter, or external terminal integration. |
| Products / categories | Exists | `src/modules/products`, `/products` | Tenant catalogue, SKU/barcode, cost/price, categories, CSV import. No product variants, supplier catalogue mapping, price rules, or promotion engine. |
| Inventory | Exists | `src/modules/inventory`, `/inventory` | Branch stock, receiving, adjustment, ledger, CSV flows, opening stock, counts/review/post. No reserved/damaged/returned stock buckets, velocity/coverage engine, or configurable stock policy. |
| Branches / warehouses | Partially exists | `src/modules/branches`, `/branches` | Multiple branches and transfers are supported. A separate warehouse entity/workflow is absent; a branch is currently the stock-holding location. |
| Suppliers / purchasing | Partially exists | `src/modules/purchasing`, `/purchasing` | Suppliers, draft/order/partial receipt/complete receipt, payment balance and audit trail. An approval-first recommendations screen uses recent sales, on-hand stock, and open PO quantity to suggest replenishment quantities. Supplier lead-time history, product-supplier assignment, minimum order quantities, approval records, cancellation UI, returns-to-supplier, and receiving discrepancy workflow remain absent. |
| Receiving | Exists and extended | inventory service and purchasing service | Direct stock receiving and PO-linked receiving update inventory and stock movements. Direct receive remains for non-PO deliveries. |
| Transfers | Exists | `src/modules/transfers`, `/transfers` | Draft, dispatch, in-transit, receive, branch stock movements. No transfer variance or route/ETA tracking. |
| Sales / returns | Partially exists | `src/modules/sales`, `sales/reversal.ts`, `/sales` | Completed sales and controlled full sale void/reversal. No independent refund/return lifecycle, partial returns, exchange, or void analytics. |
| Payments / till | Exists internally | `src/modules/pos`, payment-bank modules, `/reports` | Recorded tender, cash movements, POS expected versus actual cash and discrepancies. No gateway settlement reconciliation or webhook idempotency beyond checkout idempotency. |
| Credit customers | Exists | `src/modules/credit`, `/credit` | Credit sale ledger, payments and role permission. No credit scoring/limits/aging automation. |
| Employees | Exists | `src/modules/team`, `/team` | Staff, roles, custom permissions, branch assignments. No shifts, schedules, time clock, or performance baseline model. |
| Reporting / dashboards | Partially exists | `/overview`, `/reports`, CSV routes | Live sales, gross profit, inventory valuation, low/out-of-stock counts, product/cashier/branch/tender/stock movement/POS discrepancy reporting. The overview now includes a real-data Command Center attention feed for high stockout risk, active counts, pending receipts, and closed-till variance. Persisted alerts, trend baselines, broad drill-down intelligence, and cached aggregates are still absent. |
| Audit logs | Exists | `audit_logs`, services | Actor, entity/action metadata across key operational mutations. Event taxonomy, correlation identifiers, and dedicated review/event UI are incomplete. |
| Notifications | Missing | — | No in-app notification center, email/SMS/push delivery, acknowledgement state, or alert routing. |
| Accounting | Partially exists | sales/payments/credit/purchase ledgers | Operational accounting evidence is available, but there is no chart of accounts, journal, tax ledger, payable/receivable aging report, or external accounting integration. |

## Interfaces, deployment, and quality

- **Deployment:** configured for Vercel plus externally hosted PostgreSQL; production database TLS validation supports Aiven CA material. Preview and production separation is documented.
- **Configuration:** `.env.example` documents database, platform admin, logging, seed, E2E, and integration-test variables. No intelligence- or notification-specific configuration exists.
- **CI/CD:** no GitHub Actions or other CI configuration is committed. `docs/OPERATIONS.md` defines a manual release gate and migration procedure.
- **Tests:** Vitest unit tests, optional database integration tests against `TEST_DATABASE_URL`, and Playwright auth/admin/POS E2E suites. Purchasing service tests are not yet present.
- **Seed data:** Phase-1 seed and a catalogue-expansion seed support the 60-product demo catalogue and historical sales.

## Reuse boundaries

Future intelligence should reuse `sales`, `sale_items`, `branch_inventory`, `stock_movements`, `purchase_orders`, `purchase_order_items`, `pos_sessions`, `payments`, `audit_logs`, branch access helpers, existing report date/time utilities, and existing dashboard conventions. It must not introduce a duplicate stock, sales, payment, or audit ledger.
