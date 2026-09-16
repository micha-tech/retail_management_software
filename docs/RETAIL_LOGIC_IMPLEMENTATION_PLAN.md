# Retail Logic implementation plan

## 1. Existing capability discovered

Retail Logic already has a secure multi-tenant, multi-branch operational core: catalogue, branch inventory, immutable stock movements, stock counts, POS, payments, cash reconciliation, credit, transfers, operational reports, audit logs, and a staged supplier/purchase-order lifecycle. The current overview is a useful live management dashboard, but it is KPI/report-oriented rather than an explainable attention system.

## 2. Missing capability selected first

**Slice 1: inventory intelligence and stockout attention.** It is the first implementation because it directly addresses the highest-value operational problem—avoiding stockouts—using data already present. It also produces a defensible read model for the command center and procurement recommendations, without adding AI, queues, or fake forecasts.

The initial formula is deliberately simple and explainable:

```text
average_daily_sales = completed tracked units sold in the trailing 28 calendar days / 28
days_of_cover = current_on_hand / average_daily_sales
incoming_quantity = ordered minus received quantity on open POs for the same branch/product
```

Risk will be advisory, only emitted when historical demand exists. The explanation will show the inputs. Initial thresholds are code-level defaults documented as provisional; business-configurable policy is a follow-on data-model extension after the calculation is validated with operators.

## 3. Files likely to change

- `src/modules/inventory/stockout-intelligence.ts` — pure calculation and typed read-model contract.
- `src/app/(dashboard)/inventory/page.tsx` — reuse the existing inventory screen to show actionable stockout risk, not a duplicate dashboard.
- `src/app/(dashboard)/overview/page.tsx` — add a compact real-data attention count/link after the inventory view is stable.
- `src/modules/inventory/*.test.ts` — deterministic risk calculation tests.
- `docs/` — current state, this plan, regression checklist, and slice notes.

## 4. Database changes

No new table is required for Slice 1. It reads existing `branch_inventory`, `products`, `sale_items`, `sales`, `purchase_orders`, and `purchase_order_items`. It depends on staged purchasing migrations being applied before incoming-PO quantity can be read in a deployed environment.

Later: add policy/configuration tables only when business/category/product threshold requirements are confirmed; add aggregates/snapshots when query profiling demonstrates need.

## 5. API changes

None initially. The inventory route is a protected server component. Existing export API remains unchanged. A future controlled read-only endpoint/tool may expose this model to an AI copilot, but no generic SQL interface will be introduced.

## 6. Frontend changes

Extend the inventory page with an explainable risk state, stock coverage, and incoming quantity. Add empty states for products without sufficient sales history. Add a command-center attention link only after the inventory screen can be the source of truth.

## 7. Dependencies

No new runtime dependency. Reuse Drizzle SQL, date/time utilities, server-side permission/branch access, money formatting, dashboard CSS, and existing purchase-order data.

## 8. Risks and controls

- **Sparse history:** never label a product as safe based on no sales; show insufficient-history/low-stock facts separately.
- **False precision:** label the result as a risk signal and show its arithmetic; do not claim a supplier lead-time forecast.
- **Performance:** constrain to accessible branches and active, tracked products; measure queries before adding cache/aggregates.
- **Tenancy:** all reads retain business and accessible-branch filters.
- **Release sequencing:** apply purchasing migrations before production uses incoming PO data.

## 9. Tests

Add unit cases for zero demand, no inventory, incoming inventory, critical/high/medium/low classification, and nonnegative arithmetic. Run existing lint, types, unit tests, build, and the regression checklist. Run integration/E2E when their isolated environment is configured.

## 10. Rollback considerations

Slice 1 is read-only and requires no schema migration, so rollback is an application-code deploy rollback. It does not alter sales, stock, purchase orders, or customer data.

## Slice 2 delivered: Command Center attention feed

The existing overview now reuses the stockout read model plus current inventory-count, purchase-order, and POS-session data. It shows only live evidence-backed signals and links each signal to the operational screen where it can be reviewed. It does not persist alerts or make automatic decisions.

## Slice 3 delivered: approval-first procurement recommendations

`/purchasing/recommendations` uses the stockout read model to target 14 days of recent average demand, then subtracts stock on hand and open purchase-order quantity. It is a review queue, not an ordering engine: it neither selects a supplier nor creates or places an order. The page states the missing supplier lead-time, supplier-product, minimum-order, and capacity inputs clearly.

## Next slices, only after procurement recommendations are reviewed with operators

1. Persisted alert lifecycle and inventory-variance review queue.
2. Supplier lead-time and product-supplier configuration, followed by an approval/purchase-order prefill workflow.
3. Payment reconciliation only once a settlement data source is integrated.
4. Controlled AI copilot over validated read models with source links.
