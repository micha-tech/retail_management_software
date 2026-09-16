import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { createSupplierAction } from "@/modules/purchasing/actions";
import { requirePermission } from "@/modules/auth/authorization";

export default async function NewSupplierPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requirePermission("purchasing:manage");
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/purchasing/suppliers"><ArrowLeft size={15} />Suppliers</Link><h1>Add supplier</h1><p>Create a reusable supplier record for orders, delivery tracking, and replenishment planning.</p></div></header><main className="page narrow"><section className="surface"><form action={createSupplierAction} className="form-stack"><div className="form-grid"><label>Supplier name<input name="name" required minLength={2} /></label><label>Contact person<input name="contactName" /></label><label>Phone<input name="phone" type="tel" /></label><label>Email<input name="email" type="email" /></label><label>Tax or registration ID<input name="taxId" /></label><label>Payment terms (days)<input name="paymentTermsDays" type="number" min="0" max="365" defaultValue="0" required /></label><label>Typical delivery lead time (days)<input name="leadTimeDays" type="number" min="0" max="365" defaultValue="0" required /></label></div><label>Address<textarea name="address" rows={2} /></label><label>Notes<textarea name="notes" rows={3} /></label>{error && <p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/purchasing/suppliers">Cancel</Link><button className="button primary">Create supplier</button></div></form></section></main></>;
}
