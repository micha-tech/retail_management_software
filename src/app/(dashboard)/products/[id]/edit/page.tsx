import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db/client";
import { categories, products } from "@/db/schema";
import { requirePermission } from "@/modules/auth/authorization";
import { updateProductAction } from "@/modules/products/actions";

function moneyInput(value: bigint) { return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`; }

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const access = await requirePermission("product:manage");
  const { id } = await params;
  const [[product], categoryRecords] = await Promise.all([db.select().from(products).where(and(eq(products.id, id), eq(products.businessId, access.business.id))).limit(1), db.select().from(categories).where(eq(categories.businessId, access.business.id)).orderBy(asc(categories.name))]);
  if (!product) notFound();
  const { error } = await searchParams;
  return <><header className="topbar"><div><Link className="back-link" href="/products"><ArrowLeft size={15}/> Products</Link><h1>Edit product</h1><p>Price and status changes are written to the audit trail.</p></div></header><main className="page narrow"><section className="surface"><form action={updateProductAction} className="form-stack"><input type="hidden" name="productId" value={product.id}/><div className="form-grid"><label>Name<input name="name" defaultValue={product.name} required/></label><label>SKU<input name="sku" defaultValue={product.sku} required/></label><label>Barcode<input name="barcode" defaultValue={product.barcode||""}/></label><label>Category<select name="categoryId" defaultValue={product.categoryId||""}><option value="">Uncategorised</option>{categoryRecords.map((category)=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Selling price<input name="sellingPrice" inputMode="decimal" defaultValue={moneyInput(product.sellingPrice)} required/></label><label>Cost price<input name="costPrice" inputMode="decimal" defaultValue={moneyInput(product.costPrice)} required/></label><label>Unit<input name="unit" defaultValue={product.unit} required/></label><label>Minimum stock<input name="minimumStockLevel" type="number" min="0" defaultValue={product.minimumStockLevel} required/></label></div><label>Description<textarea name="description" rows={3} defaultValue={product.description||""}/></label><label className="check-row"><input name="trackInventory" type="checkbox" defaultChecked={product.trackInventory}/> Track branch inventory</label><label className="check-row"><input name="active" type="checkbox" defaultChecked={product.active}/> Active product</label>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><Link className="button secondary inline-button" href="/products">Cancel</Link><button className="button primary">Save product</button></div></form></section></main></>;
}
