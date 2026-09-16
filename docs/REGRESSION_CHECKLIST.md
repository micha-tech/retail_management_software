# Regression checklist

Run this checklist against a dedicated preview/test database after each major retail capability. Never use production credentials or data for automated checks.

## Access and tenancy

- [ ] Onboard an owner, log in, change a forced password, and log out.
- [ ] Confirm inactive/unauthorized users cannot open dashboard routes or invoke a server action.
- [ ] Confirm branch-restricted staff only see and mutate assigned branches.
- [ ] Confirm role permissions hide irrelevant navigation and reject direct server-side access.

## Catalogue and inventory

- [ ] Create/edit product/category and import a valid product CSV.
- [ ] Receive stock, adjust stock with a reason, and inspect matching immutable stock movements.
- [ ] Start an inventory count; confirm stock-changing operations are paused; enter/import quantities, submit, review, post, and verify correction movements.
- [ ] Export inventory and opening-stock templates.
- [ ] Create, dispatch, and receive an inter-branch transfer; verify both branches' balances and movements.

## POS, sales, and cash

- [ ] Open a POS session, search/add catalogue products, apply an allowed discount, complete a sale, and view its receipt.
- [ ] Verify a completed sale deducts tracked branch inventory and writes sale/payment/movement records once under a repeated idempotency key.
- [ ] Record cash in/out and close the session; verify expected cash and variance.
- [ ] Void a completed sale with a reason and verify payment status, restored stock, credit reversal where applicable, and audit history.
- [ ] Complete a credit sale and record a repayment.

## Purchasing (staged module)

- [ ] Apply migrations `0013` and `0014` in a preview database before testing this section.
- [ ] Create a supplier and a draft PO with a unique active-product line set.
- [ ] Mark the draft as ordered; receive a partial delivery, then the balance; verify receipt, inventory, movement, PO status, and cost update.
- [ ] Attempt over-receipt and overpayment; confirm both are rejected.
- [ ] Record a supplier payment and verify order balance and audit entry.
- [ ] Confirm purchasing read/manage permissions and branch restrictions are enforced.

## Reporting and platform health

- [ ] Confirm overview/report totals reconcile to completed sales and sale-item cost snapshots for the selected date and branch scope.
- [ ] Confirm sales and inventory CSV exports are tenant/branch scoped.
- [ ] Check `/api/health` reports the expected database state.
- [ ] Confirm marketing, login, onboarding, dashboard error handling, and responsive navigation still render.

## Required automated gates

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:integration` against a dedicated migrated database
- [ ] `npm run test:e2e` with isolated credentials
- [ ] `npm run build`
