import { and, asc, eq, sql } from "drizzle-orm";
import { ArrowLeft, FileDown, Upload } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { branches, inventoryCountItems, inventoryCounts, users } from "@/db/schema";
import { requireBranchAccess, requirePermission } from "@/modules/auth/authorization";
import { hasPermission } from "@/modules/auth/permissions";
import {
  cancelInventoryCountAction,
  importInventoryCountAction,
  postInventoryCountAction,
  reopenInventoryCountAction,
  saveInventoryCountEntriesAction,
  startInventoryCountAction,
  submitInventoryCountForReviewAction,
} from "@/modules/inventory/count-actions";

const PAGE_SIZE = 100;
const postingRoles = new Set(["OWNER", "ADMIN", "BRANCH_MANAGER"]);

export default async function InventoryCountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; error?: string; saved?: string; imported?: string; posted?: string }>;
}) {
  const access = await requirePermission("inventory:read");
  const { id } = await params;
  const query = await searchParams;
  const [count] = await db
    .select({
      id: inventoryCounts.id,
      branchId: inventoryCounts.branchId,
      countNumber: inventoryCounts.countNumber,
      status: inventoryCounts.status,
      notes: inventoryCounts.notes,
      createdAt: inventoryCounts.createdAt,
      branch: branches.name,
      creator: users.name,
    })
    .from(inventoryCounts)
    .innerJoin(branches, eq(branches.id, inventoryCounts.branchId))
    .innerJoin(users, eq(users.id, inventoryCounts.createdBy))
    .where(and(eq(inventoryCounts.id, id), eq(inventoryCounts.businessId, access.business.id)))
    .limit(1);
  if (!count) notFound();
  await requireBranchAccess(count.branchId);

  const rawPage = Number.parseInt(query.page || "1", 10);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [summary] = await db.execute<{
    total: number;
    counted: number;
    expected_units: number;
    counted_units: number;
    variance_items: number;
    net_variance: number;
  }>(sql`select count(*)::int total,
      count(counted_quantity)::int counted,
      coalesce(sum(expected_quantity),0)::int expected_units,
      coalesce(sum(counted_quantity),0)::int counted_units,
      count(*) filter (where variance_quantity <> 0)::int variance_items,
      coalesce(sum(variance_quantity),0)::int net_variance
    from inventory_count_items where count_id=${count.id}`);
  const totalItems = Number(summary?.total ?? 0);
  const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const items = await db
    .select()
    .from(inventoryCountItems)
    .where(eq(inventoryCountItems.countId, count.id))
    .orderBy(asc(inventoryCountItems.skuSnapshot))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);
  const mayPost = postingRoles.has(access.role) && hasPermission(access.role, "inventory:manage", access.permissions);
  const statusClass = count.status === "POSTED" ? "pill active" : count.status === "REVIEW" ? "pill warning" : count.status === "CANCELLED" ? "pill danger" : "pill";
  const hiddenIdentity = <><input type="hidden" name="countId" value={count.id}/><input type="hidden" name="branchId" value={count.branchId}/></>;
  const feedback = query.error ? <p className="form-error">{query.error}</p> : query.saved ? <p className="form-success">Counted quantities saved.</p> : query.imported ? <p className="form-success">CSV quantities imported.</p> : query.posted ? <p className="form-success">Count posted and inventory balances updated.</p> : null;

  return <>
    <header className="topbar">
      <div><Link className="back-link" href="/inventory/counts"><ArrowLeft size={15}/> Inventory counts</Link><h1>{count.countNumber}</h1><p>{count.branch} · Created by {count.creator} on {count.createdAt.toLocaleString()}</p></div>
      <div className="header-actions">{count.status !== "DRAFT" && <a className="button secondary inline-button" href={`/api/inventory/counts/${count.id}/export`}><FileDown size={17}/> Export count</a>}<span className={statusClass}>{count.status}</span></div>
    </header>
    <main className="page">
      {feedback}
      <section className="metrics count-metrics">
        <article><span>Products</span><strong>{totalItems}</strong><small>{Number(summary?.counted ?? 0)} counted</small></article>
        <article><span>Expected units</span><strong>{Number(summary?.expected_units ?? 0)}</strong><small>Snapshot at start</small></article>
        <article><span>Counted units</span><strong>{Number(summary?.counted_units ?? 0)}</strong><small>{Math.max(0, totalItems - Number(summary?.counted ?? 0))} remaining</small></article>
        <article><span>Net variance</span><strong>{Number(summary?.net_variance ?? 0)}</strong><small>{Number(summary?.variance_items ?? 0)} products differ</small></article>
      </section>

      {count.notes && <section className="surface compact-surface"><h2>Count notes</h2><p className="muted">{count.notes}</p></section>}

      {count.status === "DRAFT" && <section className="surface compact-surface"><h2>Start physical count</h2><p className="muted">Starting snapshots every active tracked product. All POS sessions at {count.branch} must be closed. POS, receipts, adjustments, transfers, and reversals remain paused until this count is posted or cancelled.</p><form action={startInventoryCountAction} className="form-actions">{hiddenIdentity}<button className="button primary">Start and snapshot inventory</button></form></section>}

      {count.status === "COUNTING" && <>
        <section className="surface compact-surface"><h2>Import counted quantities</h2><p className="muted">Use the exported count CSV, fill <code>counted_quantity</code>, and import it here. Matching uses SKU and updates only populated rows.</p><form action={importInventoryCountAction} className="inline-form count-import-form">{hiddenIdentity}<label>CSV file<input type="file" name="file" accept=".csv,text/csv" required/></label><button className="button secondary inline-button"><Upload size={17}/> Import CSV</button></form></section>
        <form action={saveInventoryCountEntriesAction} className="count-entry-form">{hiddenIdentity}<section className="surface table-surface report-block"><div className="section-heading report-heading"><div><p className="eyebrow">Physical count</p><h2>Enter quantities</h2></div><button className="button primary">Save this page</button></div><table className="count-table"><thead><tr><th>Product</th><th>Expected</th><th>Physical quantity</th><th>Variance</th><th>Notes</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.productNameSnapshot}</strong><small>{item.skuSnapshot}</small><input type="hidden" name="itemId" value={item.id}/></td><td>{item.expectedQuantity}</td><td><input aria-label={`Physical quantity for ${item.productNameSnapshot}`} name={`quantity_${item.id}`} type="number" min="0" max="2000000000" step="1" defaultValue={item.countedQuantity ?? ""}/></td><td>{item.varianceQuantity === null ? "—" : item.varianceQuantity > 0 ? `+${item.varianceQuantity}` : item.varianceQuantity}</td><td><input aria-label={`Notes for ${item.productNameSnapshot}`} name={`notes_${item.id}`} maxLength={500} defaultValue={item.notes ?? ""}/></td></tr>)}</tbody></table></section></form>
      </>}

      {(count.status === "REVIEW" || count.status === "POSTED" || count.status === "CANCELLED") && totalItems > 0 && <section className="surface table-surface report-block"><div className="section-heading report-heading"><div><p className="eyebrow">Count result</p><h2>{count.status === "POSTED" ? "Posted variances" : "Physical quantities"}</h2></div></div><table><thead><tr><th>Product</th><th>Expected</th><th>Counted</th><th>Variance</th>{count.status === "POSTED" && <th>Posted adjustment</th>}<th>Notes</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.productNameSnapshot}</strong><small>{item.skuSnapshot}</small></td><td>{item.expectedQuantity}</td><td>{item.countedQuantity ?? "—"}</td><td>{item.varianceQuantity === null ? "—" : item.varianceQuantity > 0 ? `+${item.varianceQuantity}` : item.varianceQuantity}</td>{count.status === "POSTED" && <td>{item.postedAdjustment === null ? "—" : item.postedAdjustment > 0 ? `+${item.postedAdjustment}` : item.postedAdjustment}</td>}<td>{item.notes || "—"}</td></tr>)}</tbody></table></section>}

      {totalItems > PAGE_SIZE && <nav className="pagination" aria-label="Count pages"><Link className={`button secondary ${currentPage <= 1 ? "disabled-link" : ""}`} href={`/inventory/counts/${count.id}?page=${Math.max(1, currentPage - 1)}`}>Previous</Link><span>Page {currentPage} of {pages}</span><Link className={`button secondary ${currentPage >= pages ? "disabled-link" : ""}`} href={`/inventory/counts/${count.id}?page=${Math.min(pages, currentPage + 1)}`}>Next</Link></nav>}

      {count.status === "COUNTING" && <section className="surface compact-surface"><h2>Finish counting</h2><p className="muted">Every product must have a physical quantity before this can move to review.</p><form action={submitInventoryCountForReviewAction} className="form-actions">{hiddenIdentity}<button className="button primary">Submit for review</button></form></section>}

      {count.status === "REVIEW" && mayPost && <section className="surface compact-surface"><h2>Review and post</h2><p className="muted">Posting is permanent. It updates branch balances and writes a correction movement for every non-zero variance.</p><div className="split-actions"><form action={reopenInventoryCountAction}>{hiddenIdentity}<button className="button secondary">Reopen count</button></form><form action={postInventoryCountAction} className="post-confirm">{hiddenIdentity}<label className="check-row"><input type="checkbox" required/> I have reviewed all variances</label><button className="button primary">Post inventory corrections</button></form></div></section>}

      {["DRAFT", "COUNTING", "REVIEW"].includes(count.status) && mayPost && <section className="surface compact-surface danger-zone"><h2>Cancel count</h2><p className="muted">Cancellation releases the branch without changing inventory. The count remains in the audit trail.</p><form action={cancelInventoryCountAction} className="form-actions">{hiddenIdentity}<button className="button danger-button">Cancel inventory count</button></form></section>}
    </main>
  </>;
}
