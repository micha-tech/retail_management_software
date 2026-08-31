import { ArrowLeft, FileDown, Upload } from "lucide-react";
import Link from "next/link";

import { requirePermission } from "@/modules/auth/authorization";
import { listAccessibleBranches } from "@/modules/branches/queries";
import { importProductsFileAction } from "@/modules/products/import-actions";
import { PRODUCT_IMPORT_COLUMNS } from "@/modules/products/product-import";

export default async function ProductsImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("product:manage");
  const branches = await listAccessibleBranches({ businessId: access.business.id, userId: access.user.id, role: access.role });
  const { error } = await searchParams;
  return <>
    <header className="topbar">
      <div><Link className="back-link" href="/products"><ArrowLeft size={15}/> Products</Link><h1>Import products</h1><p>Upload a CSV or spreadsheet to populate your catalogue, inventory, and POS instantly.</p></div>
    </header>
    <main className="page narrow">
      <section className="surface">
        <form action={importProductsFileAction} className="form-stack">
          <label>Opening stock goes to<select name="branchId" defaultValue="all"><option value="all">All branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>)}</select></label>
          <label>Products file<input name="file" type="file" accept=".csv,.xlsx,.xls,text/csv" required/><small>Accepts .csv, .xlsx, or .xls. Maximum 5,000 rows / 5 MB.</small></label>
          {error && <p className="form-error">{error}</p>}
          <div className="phase-note">Products are matched by <code>sku</code> (and <code>barcode</code>); rows with an existing match are skipped. New categories are created automatically. Leave <code>opening_stock</code> blank to add a product without stock, or <code>branch_code</code> blank to apply opening stock to every selected branch.</div>
          <div className="download-list"><a className="button secondary inline-button" href="/api/products/template" download><FileDown size={17}/> Download CSV template</a></div>
          <div className="form-actions"><Link className="button secondary inline-button" href="/products">Cancel</Link><button className="button primary"><Upload size={17}/> Import products</button></div>
        </form>
      </section>
      <section className="surface compact-surface">
        <h2>Columns</h2>
        <ul className="import-columns">
          {PRODUCT_IMPORT_COLUMNS.map((column) => <li key={column}><code>{column}</code></li>)}
        </ul>
        <div className="phase-note">Required: <code>name</code>, <code>sku</code>, <code>selling_price</code>. Prices are entered as whole currency with up to two decimals (e.g. <code>1500.50</code>).</div>
      </section>
    </main>
  </>;
}
