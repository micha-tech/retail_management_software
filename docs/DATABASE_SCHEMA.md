# Proposed database schema

All identifiers are UUIDs, timestamps are `timestamptz` in UTC, money is integer minor units (`bigint`), and quantity uses an exact numeric representation where fractional units are supported. Foreign keys default to `RESTRICT` for financial and inventory history.

## Phase 1 — implemented

- `businesses`: tenant identity, currency, timezone, contact, active state
- `branches`: tenant-scoped location with unique `(business_id, code)`
- `users`: global credentials and activation state
- `business_memberships`: one role per user/business
- `branch_assignments`: explicit access for branch-restricted staff
- `sessions`: hashed opaque sessions with expiry and client metadata
- `login_attempts`: database-backed sign-in throttling evidence
- `audit_logs`: append-only operational audit events

## Phase 2 — product and inventory (implemented)

- `categories`: unique tenant-scoped category names/slugs
- `products`: tenant catalogue, unique SKU and optional barcode, integer prices, inventory flags
- `branch_inventory`: unique `(business_id, branch_id, product_id)`, nonnegative quantity invariant
- `inventory_counts`, `inventory_count_items`: branch stocktake snapshot, physical quantities, review/post lifecycle, variances, and immutable posted results
- `stock_movements`: immutable before/after ledger with actor and reference
- `stock_receipts`, `stock_receipt_items`: transactional receiving documents

## Phase 3 — POS and sales (implemented)

- `pos_sessions`, `cash_movements`: session lifecycle and exact cash reconciliation
- `sales`: tenant/branch/session/cashier identity, unique sale number, unique idempotency key, integer totals, immutable completion state
- `sale_items`: product/name/SKU/price/cost snapshots and exact quantities
- `payments`: separate payment records supporting future split tender
- `sale_reversals`, `refunds`: controlled, reasoned financial and inventory reversal

## Phase 4–5 — reporting and transfers (implemented)

- `stock_transfers`, `stock_transfer_items`: source/destination, lifecycle, dispatch/receipt actors and timestamps; source and destination differ by check constraint
- report views/queries aggregate sales, payment, COGS, inventory valuation, and discrepancies from source ledgers; no parallel summary system is introduced until query evidence requires it

## Critical indexes and constraints

- every operational table indexed by `business_id`; common branch/time queries by `(business_id, branch_id, created_at)`
- unique `(branch_id, product_id)` inventory row
- one open inventory count per branch; counted and posted quantities retain snapshot/variance checks
- unique `(business_id, sku)` and partial unique `(business_id, barcode)`
- unique `(business_id, idempotency_key)` sale retry protection
- positive quantities, nonnegative money values, and valid state transitions enforced by checks/service transactions
- no completed financial or stock record is cascade-deleted
- composite tenant foreign keys bind categories, products, branches, sessions, sales, payments, movements, receipts, inventory counts, transfers, reversals, and actors to the same business
