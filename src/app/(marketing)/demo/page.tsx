"use client";

import { Building2, Package, RotateCcw, ShoppingCart, Users } from "lucide-react";
import { useMemo, useState } from "react";

const branches = [
  { id: "lekki", name: "Lekki Main Store", sales: "₦1,284,500", stock: 94 },
  { id: "ikeja", name: "Ikeja Mall", sales: "₦842,300", stock: 88 },
  { id: "yaba", name: "Yaba Express", sales: "₦614,900", stock: 91 },
];
const products = [
  { id: "rice", name: "Premium Rice 5kg", sku: "RIC-5KG", price: 18500, stock: 42 },
  { id: "milo", name: "Milo 500g", sku: "MIL-500", price: 6200, stock: 17 },
  { id: "coke", name: "Coca-Cola 50cl", sku: "COK-50", price: 850, stock: 9 },
  { id: "soap", name: "Sunlight Detergent 1kg", sku: "SUN-1K", price: 4900, stock: 26 },
  { id: "bread", name: "Family Bread", sku: "BRD-FAM", price: 1600, stock: 34 },
  { id: "oil", name: "Vegetable Oil 3L", sku: "OIL-3L", price: 9800, stock: 12 },
];
const cashiers = ["Amaka Okafor", "David Mensah", "Zainab Bello", "Tunde Adebayo"];

function money(value: number) { return `₦${value.toLocaleString("en-NG")}`; }

export default function DemoWorkspacePage() {
  const [tab, setTab] = useState<"overview" | "inventory" | "pos" | "team">("overview");
  const [branch, setBranch] = useState(branches[0].id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sales, setSales] = useState(0);
  const selectedBranch = branches.find((item) => item.id === branch)!;
  const total = useMemo(() => products.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0), [cart]);
  const cartUnits = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const reset = () => { setCart({}); setSales(0); setBranch(branches[0].id); setTab("overview"); };
  const add = (id: string) => setCart((current) => ({ ...current, [id]: (current[id] || 0) + 1 }));

  return <main className="demo-workspace">
    <div className="demo-safe-banner"><strong>Interactive demo</strong><span>This workspace runs entirely in your browser. No shared account, customer data, or database records are changed.</span><button onClick={reset}><RotateCcw size={15} />Reset demo</button></div>
    <div className="demo-shell">
      <aside className="demo-sidebar"><div className="demo-brand">RETAIL <b>LOGIC</b><small>DEMO WORKSPACE</small></div><nav>{([ ["overview", "Overview", Building2], ["inventory", "Inventory", Package], ["pos", "Point of sale", ShoppingCart], ["team", "Team", Users] ] as const).map(([id, label, Icon]) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon size={18} />{label}</button>)}</nav><div className="demo-user"><strong>Demo Manager</strong><small>Owner · all branches</small></div></aside>
      <section className="demo-content">
        <header><div><p>DEMO BUSINESS · {selectedBranch.name}</p><h1>{tab === "overview" ? "Good morning, Demo Manager" : tab === "pos" ? "Point of sale" : tab[0].toUpperCase() + tab.slice(1)}</h1></div><select value={branch} onChange={(event) => setBranch(event.target.value)}>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></header>
        {tab === "overview" && <><section className="demo-metrics"><article><span>Today’s sales</span><strong>{money(1284500 + sales)}</strong><small>186 transactions</small></article><article><span>Gross profit</span><strong>₦284,210</strong><small>22.1% gross margin</small></article><article><span>Inventory value</span><strong>₦8,740,000</strong><small>{selectedBranch.stock}% availability</small></article><article><span>Open purchase orders</span><strong>3</strong><small>184 units incoming</small></article></section><section className="demo-panel"><h2>What needs your attention?</h2><div className="demo-attention"><span className="critical">3 products at high stockout risk</span><span>1 inventory variance requires review</span><span>2 supplier deliveries expected today</span></div></section><section className="demo-panel"><h2>Branch performance</h2><div className="demo-branches">{branches.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{item.sales} today</span><small>{item.stock}% stock availability</small></div>)}</div></section></>}
        {tab === "inventory" && <section className="demo-panel demo-table"><h2>Live inventory example</h2><p>Stock balances, reorder signals, and product details for {selectedBranch.name}.</p><table><thead><tr><th>Product</th><th>SKU</th><th>On hand</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.sku}</td><td>{product.stock}</td><td><span className={product.stock < 15 ? "low" : "healthy"}>{product.stock < 15 ? "Reorder soon" : "Healthy"}</span></td></tr>)}</tbody></table></section>}
        {tab === "team" && <section className="demo-panel demo-table"><h2>Demo team</h2><p>Staff permissions and branch assignment are shown here in the full product.</p><table><thead><tr><th>Name</th><th>Role</th><th>Assigned branch</th><th>Status</th></tr></thead><tbody>{cashiers.map((name, index) => <tr key={name}><td>{name}</td><td>{index === 0 ? "Branch manager" : "Cashier"}</td><td>{branches[index % branches.length].name}</td><td><span className="healthy">Active</span></td></tr>)}</tbody></table></section>}
        {tab === "pos" && <section className="demo-pos"><div className="demo-products"><h2>Products</h2><p>Select products to build a sample sale. This changes only this browser tab.</p><div>{products.map((product) => <button key={product.id} onClick={() => add(product.id)}><strong>{product.name}</strong><small>{product.sku} · {product.stock} in stock</small><b>{money(product.price)}</b></button>)}</div></div><aside className="demo-cart"><h2>Current sale</h2>{!cartUnits ? <p>Choose a product to begin.</p> : products.filter((product) => cart[product.id]).map((product) => <div key={product.id}><span>{product.name} × {cart[product.id]}</span><b>{money(product.price * cart[product.id])}</b></div>)}<footer><strong>Total <b>{money(total)}</b></strong><button disabled={!cartUnits} onClick={() => { setSales((value) => value + total); setCart({}); }}>Complete sample sale</button></footer></aside></section>}
      </section>
    </div>
  </main>;
}
