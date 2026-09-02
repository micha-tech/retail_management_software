import { ArrowLeft, FileDown, Upload } from "lucide-react";
import Link from "next/link";

import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { importOpeningStockFileAction } from "@/modules/inventory/opening-stock-actions";
import { OPENING_STOCK_COLUMNS } from "@/modules/inventory/opening-stock-import";

export default async function OpeningStockPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("inventory:manage");
  const branches = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const { error } = await searchParams;
  return <>
    <header className="topbar">
      <div><Link className="back-link" href="/inventory"><ArrowLeft size={15}/> Inventory</Link><h1>Opening stock</h1><p>One import to set each product&apos;s starting balance per branch.</p></div>
    </header>
    <main className="page narrow">
      <section className="surface">
        <h2>1. Download a branch file</h2>
        <p className="muted">Each CSV is pre-filled with your current products and balances. Change the <code>stock</code> column, then re-upload. Every row must name a branch (<code>branch_code</code> or <code>branch_name</code>).</p>
        <div className="download-list">
          <a className="button secondary inline-button" href="/api/inventory/opening-stock-template" download><FileDown size={17}/> All branches CSV</a>
          {branches.map((branch) => <a key={branch.id} className="button secondary inline-button" href={`/api/inventory/opening-stock-template?branch=${branch.id}`} download><FileDown size={17}/> {branch.name} ({branch.code})</a>)}
        </div>
      </section>
      <section className="surface">
        <h2>2. Upload</h2>
        <form action={importOpeningStockFileAction} className="form-stack">
          <label>Opening stock file<input name="file" type="file" accept=".csv,.xlsx,.xls,text/csv" required/><small>Accepts .csv, .xlsx, or .xls. Maximum 5,000 rows / 5 MB.</small></label>
          {error && <p className="form-error">{error}</p>}
          <div className="phase-note">A product is matched by <code>sku</code>, then by <code>name</code>; if neither matches, a new tracked product is created. The <code>stock</code> column is the <strong>resulting balance</strong> (it replaces the current quantity). Leave <code>selling_price</code>/<code>cost_price</code> blank to keep existing prices.</div>
          <div className="form-actions"><Link className="button secondary inline-button" href="/inventory">Cancel</Link><button className="button primary"><Upload size={17}/> Import opening stock</button></div>
        </form>
      </section>
      <section className="surface compact-surface">
        <h2>Columns</h2>
        <ul className="import-columns">
          {OPENING_STOCK_COLUMNS.map((column) => <li key={column}><code>{column}</code></li>)}
        </ul>
        <div className="phase-note">All columns are optional. Required per row: a product identity (<code>sku</code> or <code>name</code>) and a branch (<code>branch_code</code> or <code>branch_name</code>).</div>
      </section>
    </main>
  </>;
}