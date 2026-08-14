# Incremental implementation plan

1. **Foundation — implemented:** application shell, PostgreSQL/Drizzle, migrations, secure authentication, onboarding, businesses, branches, staff assignment, RBAC, and immutable audit trail.
2. **Product and inventory — implemented:** categories, catalogue, branch balances, stock movement ledger, receiving, adjustments, exact prices, inventory-count lifecycle, variance posting, CSV import/export, and management UI.
3. **POS — implemented:** sessions, category/barcode search, exact discounts, cash movements, atomic checkout, payments, row locking, idempotency, stock reduction, and cashier-safe receipts.
4. **Management — implemented:** branch-scoped dashboards, sales/payment/product/inventory/movement/session queries, COGS/profit/margin, reconciliation, timezone-aware date filters, and sales/inventory CSV exports.
5. **Multi-branch operations — implemented:** draft/dispatch/receive transfer lifecycle and atomic source/destination ledger updates.
6. **Production hardening — implemented in code:** composite tenant foreign keys, sale reversal/refund state, immutable ledgers and posted stocktakes, branch advisory locks, expanded audit coverage, structured checkout/request error hooks, request IDs, health check, security headers, offline blocking indicator, gated transaction integration tests, full Playwright scenarios, backup and release runbooks.

Release still requires environment-specific credentials, credential rotation, a least-privilege runtime database role, production observability destination, a separate seeded E2E database, backup restoration drill, and Preview acceptance testing.
