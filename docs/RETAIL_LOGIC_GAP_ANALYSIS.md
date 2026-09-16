# Retail Logic gap analysis

Status reflects real repository functionality, not product claims.

| Capability | Classification | Reuse / required extension |
| --- | --- | --- |
| Retail command center | Partially exists | `/overview` now has an actionable, live-data attention feed for stockout risk, active counts, pending PO receipts, and till variance. Persisted acknowledgement, more signals, and role-specific routing remain. |
| Inventory intelligence | Partially exists | Current on-hand and reorder values exist; add velocity, days of cover, incoming PO quantity, and explainable risk. |
| Stockout prediction | Missing | Add a read model first; use sales and inventory data, open PO quantities, and configurable conservative thresholds. |
| Slow-moving / dead stock | Missing | Requires policy configuration and historical sale/movement aggregation; do not hard-code one threshold. |
| Loss radar | Partially exists | Inventory count variances, adjustment ledger, and POS cash difference exist. A unified anomaly/review model and evidence views are missing. |
| Cashier anomaly detection | Missing | Transaction, cashier, session and discount data exist, but no comparable-shift baseline, review status, or anomaly computation exists. |
| Payment reconciliation | Partially exists | Internal expected cash versus closing cash exists. External settlement/intents/webhooks are missing, so gateway reconciliation cannot yet be truthfully implemented. |
| Branch intelligence | Partially exists | Branch sales/inventory reports exist. Trend comparison and "possible contributors" correlation require new aggregation/read logic. |
| Procurement intelligence | Partially exists | The approval-first recommendations screen uses recent demand, stock on hand, and open PO quantity. Supplier lead times, safety stock, minimum order quantity, capacity, supplier-product mapping, persisted recommendation/approval workflow, and order prefill are still missing. |
| Product profitability | Partially exists | Revenue, discount allocation, sale-item cost snapshots, and gross profit exist. Returns, damage, payment cost, overhead and net-profit data are incomplete. |
| Sales intelligence | Partially exists | Existing reports cover product/cashier/branch/tender. Time-series trends and anomaly explanations are missing. |
| AI retail copilot | Missing | Needs controlled read-only data tools, answer provenance, policy, and an LLM provider decision; it must follow—not precede—stable intelligence read models. |
| Operational event infrastructure | Partially exists | `audit_logs` cover key actions. Add a consistent event taxonomy/correlation only after confirming audit-log extension is insufficient. |
| Unified alerts | Missing | No alert entity, acknowledgement, dismissal, severity, or action links. Stockout intelligence can begin as a computed attention feed before a persisted alert lifecycle is justified. |
| Offline POS | Missing | Checkout already has idempotency keys, but no local persistence, queue, sync protocol, conflict policy, or offline receipt flow. |
| Hardware abstraction | Missing | No adapters or device contracts. Defer until the POS workflow and target devices are specified. |
| E-commerce store vertical | Missing | Marketing routes exist, but no storefront, tenant URL mapping, product media storage, checkout, order or fulfillment model exists. This is a separate bounded context and should not be mixed into P0 operations work. |

## Architectural risks to address incrementally

1. Current dashboard/report calculations are live raw-table queries. They are appropriate for the present scale but will need measured indexing/aggregation before broad analytical dashboards are deployed.
2. `audit_logs` are useful evidence but are not yet a complete operational-event contract. Avoid creating a second log until a specific intelligence workflow needs fields the audit log cannot provide.
3. Purchasing is currently staged in the repository; its migrations must be released before any procurement analytics read those tables.
4. The project has no job queue or scheduled worker. The first intelligence slice should be a bounded, on-demand, indexed query rather than pretending it has continuously updated predictions.
5. No external settlement data exists, so payment reconciliation is limited to internal till discrepancies until an integration is authorized.
6. Existing tests cover core transactional flows but do not yet cover purchasing or intelligence calculations; new calculations need deterministic unit tests and database integration coverage where SQL semantics matter.
