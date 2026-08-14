"use client";

import { useActionState, useRef, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";

import { checkoutAction, type CheckoutState } from "@/modules/pos/actions";

type Product = { id: string; name: string; sku: string; barcode: string | null; category: string; price: string; quantity: number | null };

function parseClientMoney(value: string) {
  const match = value.trim().replaceAll(",", "").match(/^(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return 0n;
  return BigInt(match[1]) * 100n + BigInt((match[2] || "").padEnd(2, "0"));
}

function displayMinor(value: bigint) { return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`; }

export function PosTerminal({ products, branchId, sessionId, currency }: { products: Product[]; branchId: string; sessionId: string; currency: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [discountInput, setDiscountInput] = useState("0.00");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [key, setKey] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(checkoutAction, {} as CheckoutState);
  const saleCompleted = state.sale?.idempotencyKey === key;
  const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].sort();
  const filtered = products.filter((product) => (!category || product.category === category) && `${product.name} ${product.sku} ${product.barcode || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 60);

  const add = (id: string) => {
    if (saleCompleted) { setKey(crypto.randomUUID()); setCart({ [id]: 1 }); setDiscountInput("0.00"); return; }
    setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));
  };
  const lines = saleCompleted ? [] : Object.entries(cart).map(([id, quantity]) => ({ product: products.find((product) => product.id === id)!, quantity }));
  const subtotal = lines.reduce((sum, line) => sum + BigInt(line.product.price) * BigInt(line.quantity), 0n);
  const requestedDiscount = parseClientMoney(discountInput);
  const discount = requestedDiscount > subtotal ? subtotal : requestedDiscount;
  const total = subtotal - discount;

  function scan(value: string) {
    const exact = products.find((product) => product.barcode === value.trim() || product.sku.toLowerCase() === value.trim().toLowerCase());
    if (exact) { add(exact.id); setQuery(""); }
  }

  return <div className="pos-layout"><section className="product-pane"><div className="pos-search"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); scan(query); } }} placeholder="Search product or scan barcode"/></div><div className="category-strip"><button className={!category ? "active" : ""} onClick={() => setCategory("")}>All</button>{categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{name}</button>)}</div><div className="product-grid">{filtered.map((product) => <button key={product.id} onClick={() => add(product.id)} disabled={product.quantity === 0}><small>{product.sku}</small><strong>{product.name}</strong><span>{currency} {displayMinor(BigInt(product.price))}</span><em>{product.quantity === null ? "Not tracked" : `${product.quantity} available`}</em></button>)}</div></section><aside className="cart-pane"><div className="cart-title"><ShoppingCart size={18}/><h2>Current sale</h2><span>{lines.length}</span></div><div className="cart-lines">{lines.map((line) => <article key={line.product.id}><div><strong>{line.product.name}</strong><small>{line.product.sku}</small></div><div className="qty"><button onClick={() => setCart((current) => ({ ...current, [line.product.id]: Math.max(1, line.quantity - 1) }))}><Minus/></button><span>{line.quantity}</span><button onClick={() => add(line.product.id)}><Plus/></button></div><strong>{currency} {displayMinor(BigInt(line.product.price) * BigInt(line.quantity))}</strong><button className="icon-button" onClick={() => setCart((current) => { const next = { ...current }; delete next[line.product.id]; return next; })}><Trash2/></button></article>)}{!lines.length && <div className="empty-cart">{saleCompleted ? "Select or scan a product to start the next sale." : "Scan or select a product to begin."}</div>}</div><form ref={formRef} action={async (data) => { await action(data); }} className="checkout"><input type="hidden" name="branchId" value={branchId}/><input type="hidden" name="sessionId" value={sessionId}/><input type="hidden" name="idempotencyKey" value={key}/><input type="hidden" name="items" value={JSON.stringify(lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })))}/><input type="hidden" name="discountAmount" value={displayMinor(discount)}/><input type="hidden" name="paymentAmount" value={displayMinor(total)}/><div className="sale-calculation"><div><span>Subtotal</span><strong>{currency} {displayMinor(subtotal)}</strong></div><label>Discount ({currency})<input value={discountInput} onChange={(event) => setDiscountInput(event.target.value)} inputMode="decimal" disabled={!lines.length}/></label><div className="total-row"><span>Total</span><strong>{currency} {displayMinor(total)}</strong></div></div><label>Payment method<select name="paymentMethod"><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card / POS terminal</option><option value="MOBILE_MONEY">Mobile money</option><option value="OTHER">Other</option></select></label><label>Reference<input name="reference"/></label>{state.error && <p className="form-error">{state.error}</p>}{saleCompleted && state.sale && <div className="sale-success">Sale {state.sale.saleNumber} completed. <Link href={`/pos/receipt/${state.sale.id}`}>View receipt</Link></div>}<button className="button primary pay-button" disabled={pending || !lines.length || requestedDiscount > subtotal}>{pending ? "Processing…" : `Pay ${currency} ${displayMinor(total)}`}</button></form></aside></div>;
}
