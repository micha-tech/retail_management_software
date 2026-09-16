"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BellRing,
  Boxes,
  Building2,
  CheckCircle2,
  FileDown,
  HandCoins,
  LayoutDashboard,
  Minus,
  Package,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { seedProducts } from "@/db/seed/catalog";

const products = seedProducts.map((product, index) => ({
  id: `p-${index}`,
  name: product.name,
  category: product.category,
  sku: `SKU-${String(index + 1).padStart(3, "0")}`,
  price: Number(product.sellingPrice) / 100,
  cost: Number(product.costPrice) / 100,
  unit: product.unit ?? "each",
  stock: (index * 13) % 31 + 4,
}));

const branches = [
  { id: "ikeja", name: "Ikeja", code: "IKJ", address: "12 Allen Avenue, Ikeja", revenue: 1284500, transactions: 187, stock: 94 },
  { id: "lekki", name: "Lekki", code: "LEK", address: "8 Admiralty Way, Lekki", revenue: 842300, transactions: 131, stock: 88 },
  { id: "abuja", name: "Abuja Central", code: "ABJ", address: "21 Aminu Kano Crescent, Abuja", revenue: 614900, transactions: 98, stock: 91 },
];

const staff = [
  { name: "Ada Okafor", email: "owner@relay.example", role: "OWNER", branch: "All branches" },
  { name: "Tunde Bello", email: "admin@relay.example", role: "ADMIN", branch: "All branches" },
  { name: "Ife Eze", email: "ife.eze@relay.example", role: "BRANCH MANAGER", branch: "Ikeja" },
  { name: "Mariam Yusuf", email: "mariam.yusuf@relay.example", role: "CASHIER", branch: "Ikeja" },
  { name: "Emeka Nwosu", email: "emeka.nwosu@relay.example", role: "BRANCH MANAGER", branch: "Lekki" },
  { name: "Chidi James", email: "chidi.james@relay.example", role: "CASHIER", branch: "Lekki" },
  { name: "Grace Audu", email: "grace.audu@relay.example", role: "BRANCH MANAGER", branch: "Abuja Central" },
  { name: "Bola Adeyemi", email: "bola.adeyemi@relay.example", role: "CASHIER", branch: "Abuja Central" },
];

const sampleSales = [
  { number: "SEED-SAL-0045", branch: "Ikeja", cashier: "Mariam Yusuf", method: "Cash", total: 4250, status: "COMPLETED" },
  { number: "SEED-SAL-0044", branch: "Lekki", cashier: "Chidi James", method: "Card", total: 1800, status: "COMPLETED" },
  { number: "SEED-SAL-0043", branch: "Abuja Central", cashier: "Bola Adeyemi", method: "Bank transfer", total: 3200, status: "COMPLETED" },
  { number: "SEED-SAL-0042", branch: "Ikeja", cashier: "Mariam Yusuf", method: "Cash", total: 2650, status: "COMPLETED" },
  { number: "SEED-SAL-0041", branch: "Lekki", cashier: "Chidi James", method: "Bank transfer", total: 5900, status: "COMPLETED" },
  { number: "SEED-SAL-0040", branch: "Ikeja", cashier: "Mariam Yusuf", method: "Card", total: 1450, status: "COMPLETED" },
  { number: "SEED-SAL-0039", branch: "Abuja Central", cashier: "Bola Adeyemi", method: "Cash", total: 3900, status: "COMPLETED" },
  { number: "SEED-SAL-0038", branch: "Lekki", cashier: "Chidi James", method: "Cash", total: 2200, status: "COMPLETED" },
];

const transfers = [
  { number: "TRF-0017", source: "Ikeja", destination: "Lekki", status: "RECEIVED", by: "Ada Okafor" },
  { number: "TRF-0016", source: "Abuja Central", destination: "Ikeja", status: "IN TRANSIT", by: "Grace Audu" },
  { number: "TRF-0015", source: "Lekki", destination: "Abuja Central", status: "RECEIVED", by: "Emeka Nwosu" },
  { number: "TRF-0014", source: "Ikeja", destination: "Abuja Central", status: "DRAFT", by: "Tunde Bello" },
];

const purchaseOrders = [
  { number: "PO-0021", supplier: "AGL Distributors", branch: "Ikeja", status: "RECEIVED", total: 124000 },
  { number: "PO-0020", supplier: "Prime Foods Ltd", branch: "Lekki", status: "APPROVED", total: 86000 },
  { number: "PO-0019", supplier: "Green Valley Farms", branch: "Abuja Central", status: "RECEIVED", total: 45000 },
  { number: "PO-0018", supplier: "Household Corner Ltd", branch: "Ikeja", status: "DRAFT", total: 32000 },
];

const creditAccounts = [
  { customer: "Osaro Trading Co.", branch: "Ikeja", balance: 185000, limit: 500000, status: "OK" },
  { customer: "Zainab Bakery", branch: "Lekki", balance: 42000, limit: 200000, status: "OK" },
  { customer: "Sule Logistics", branch: "Abuja Central", balance: 96000, limit: 300000, status: "ATTENTION" },
];

const auditEntries = [
  { time: "Today 09:14", action: "Sale completed", actor: "Mariam Yusuf", entity: "SEED-SAL-0045" },
  { time: "Today 08:31", action: "Engaged staff branch", actor: "Ada Okafor", entity: "Mariam Yusuf (Ikeja)" },
  { time: "Yesterday 18:10", action: "Stock received", actor: "Tunde Bello", entity: "RCV-4021 · 14 lines" },
  { time: "Yesterday 16:47", action: "Transfer received", actor: "Ada Okafor", entity: "TRF-0017" },
  { time: "Yesterday 12:22", action: "Session closed", actor: "Chidi James", entity: "Lekki · ₦1,842,300 reconciled" },
];

const pages: Record<string, { eyebrow: string; title: string; subtitle: string }> = {
  overview: { eyebrow: "", title: "Good day, Ada", subtitle: "Live operational position for Relay Market Group." },
  pos: { eyebrow: "Point of sale", title: "Checkout", subtitle: "Records each sale, payment, and stock movement." },
  sales: { eyebrow: "Transactions", title: "Sales", subtitle: "Completed sales with cashier and payment details." },
  credit: { eyebrow: "Receivables", title: "Credit management", subtitle: "Customer accounts, balances, and limits." },
  inventory: { eyebrow: "Stock control", title: "Inventory", subtitle: "Branch-level balances, states, and the immutable ledger." },
  alerts: { eyebrow: "Operational review", title: "Alerts", subtitle: "Stock that needs replenishment and reconciliation." },
  purchasing: { eyebrow: "Procurement control", title: "Purchasing", subtitle: "Suppliers, purchase orders, and recommendations." },
  transfers: { eyebrow: "Multi-branch", title: "Stock transfers", subtitle: "Move stock between branches with a complete trail." },
  products: { eyebrow: "Catalogue", title: "Products", subtitle: "Prices, categories, and stock availability." },
  reports: { eyebrow: "Management · All branches", title: "Operational reports", subtitle: "Branch, cashier, payment, and inventory analytics." },
  branches: { eyebrow: "Configuration", title: "Branches", subtitle: "Each location with its own inventory and team." },
  team: { eyebrow: "Access control", title: "Team", subtitle: "Employee accounts, roles, and branch assignments." },
  audit: { eyebrow: "Governance", title: "Audit trail", subtitle: "Immutable record of important actions." },
  settings: { eyebrow: "Configuration", title: "Business settings", subtitle: "Business profile, payment banks, and preferences." },
};

const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["pos", "POS", ShoppingCart],
  ["sales", "Sales", ReceiptText],
  ["credit", "Credit", HandCoins],
  ["inventory", "Inventory", Boxes],
  ["alerts", "Alerts", BellRing],
  ["purchasing", "Purchasing", ShoppingBasket],
  ["transfers", "Transfers", ArrowLeftRight],
  ["products", "Products", Package],
  ["reports", "Reports", BarChart3],
  ["branches", "Branches", Building2],
  ["team", "Team", Users],
  ["audit", "Audit", ShieldCheck],
  ["settings", "Settings", Settings],
] as const;

type Tab = (typeof nav)[number][0];

function money(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function StatePill({ status }: { status: string }) {
  const kind = status === "COMPLETED" || status === "RECEIVED" || status === "Active" || status === "Healthy" || status === "OK" || status === "APPROVED"
    ? "pill active"
    : status === "IN TRANSIT"
      ? "pill warning"
      : status === "ATTENTION" || status === "DRAFT" || status === "Low" || status === "Reorder soon"
        ? "pill warning"
        : "pill danger";
  return <span className={kind}>{status}</span>;
}

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [branch, setBranch] = useState(branches[0].id);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sales, setSales] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [saleCompleted, setSaleCompleted] = useState(false);
  const current = branches.find((item) => item.id === branch)!;
  const total = useMemo(() => products.reduce((sum, product) => sum + product.price * (cart[product.id] || 0), 0), [cart]);
  const reset = () => { setTab("overview"); setBranch(branches[0].id); setCart({}); setSales(0); setQuery(""); setCategory(""); setPaymentMode("CASH"); setSaleCompleted(false); };
  const page = pages[tab];
  const branchStock = (product: (typeof products)[number]) => {
    const base = (product.id.charCodeAt(product.id.length - 1) * 13) % 40;
    return Math.max((base + product.stock) % 60, 3);
  };
  const add = (id: string) => setCart((state) => ({ ...state, [id]: Math.min(branchStock(products.find((p) => p.id === id)!), (state[id] || 0) + 1) }));
  const setQuantity = (id: string, requested: number) => setCart((state) => ({ ...state, [id]: Math.min(branchStock(products.find((p) => p.id === id)!), Math.max(1, Math.trunc(requested) || 1)) }));
  const remove = (id: string) => setCart((state) => { const next = { ...state }; delete next[id]; return next; });
  const complete = () => { setSales((value) => value + total); setCart({}); setSaleCompleted(true); };

  return (
    <div className="app-shell demo-app">
      <aside>
        <div className="brand demo-brand-lockup"><strong>RETAIL <em>LOGIC</em></strong><small>INTERACTIVE DEMO</small></div>
        <div className="business-switch"><small>Workspace</small><strong>Relay Market Group</strong></div>
        <nav aria-label="Demo navigation">
          {nav.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={18} /><span>{label}</span></button>
          ))}
        </nav>
        <div className="account"><div className="avatar">A</div><div><strong>Ada Okafor</strong><small>OWNER</small></div></div>
      </aside>

      <div className="workspace">
        <div className="demo-safe-banner">
          <strong>Demo mode</strong>
          <span>Explore the Relay Market Group workspace with representative data.</span>
          <button onClick={reset}><RotateCcw size={15} />Reset</button>
        </div>

        <header className="topbar">
          <div>
            <p className="eyebrow">{tab === "overview" ? `${current.name} · Today` : page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
          <select value={branch} onChange={(event) => setBranch(event.target.value)}>
            {branches.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
          </select>
        </header>

        <main className="page">
          {tab === "overview" && (
            <>
              <section className="metrics">
                <article><span>Net sales</span><strong>{money(branches.reduce((sum, b) => sum + b.revenue, 0) + sales)}</strong><small>416 transactions · ₦47,900 discounts</small></article>
                <article><span>Average sale</span><strong>₦6,701</strong><small>1,092 units sold</small></article>
                <article><span>Gross profit</span><strong>₦631,820</strong><small>Cost snapshots applied</small></article>
                <article><span>Inventory value</span><strong>₦38,240,000</strong><small>{current.stock}% stock availability</small></article>
              </section>

              <section className="surface command-center-attention">
                <div className="section-heading"><div><p className="eyebrow">Command center</p><h2>What needs your attention?</h2><p>Operational signals for {current.name}.</p></div><AlertTriangle /></div>
                <div className="attention-list">
                  <div className="attention-item danger"><AlertTriangle size={20} /><div><strong>{products.filter((product) => branchStock(product) < 12).length} products at high stockout risk</strong><small>Review these before placing the next purchase order.</small></div></div>
                  <div className="attention-item warning"><Boxes size={20} /><div><strong>1 open POS session needs closing</strong><small>{current.name} still has an uncounted till from today.</small></div></div>
                </div>
              </section>

              <section className="content-split">
                <article className="surface table-surface">
                  <div className="section-heading"><div><p className="eyebrow">Comparison</p><h2>Branch performance</h2></div><TrendingUp /></div>
                  <table>
                    <thead><tr><th>Branch</th><th>Transactions</th><th>Revenue</th></tr></thead>
                    <tbody>{branches.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.transactions}</td><td>{money(item.revenue)}</td></tr>)}</tbody>
                  </table>
                </article>
                <article className="surface">
                  <div className="section-heading"><div><p className="eyebrow">Tender</p><h2>Payment breakdown</h2></div></div>
                  <div className="payment-list">
                    <div><span>Cash</span><strong>₦1,742,800</strong></div>
                    <div><span>Bank transfer</span><strong>₦691,700</strong></div>
                    <div><span>Card</span><strong>₦360,000</strong></div>
                  </div>
                </article>
              </section>

              <section className="content-split">
                <article className="surface table-surface">
                  <div className="section-heading"><div><p className="eyebrow">Products</p><h2>Top products</h2></div></div>
                  <table>
                    <thead><tr><th>Product</th><th>Units</th><th>Revenue</th><th>Profit</th></tr></thead>
                    <tbody>{products.slice(0, 5).map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.stock % 11 + 6}</td><td>{money(product.price * 40)}</td><td>{money((product.price - product.cost) * 40)}</td></tr>)}</tbody>
                  </table>
                </article>
                <article className="surface">
                  <div className="section-heading"><div><p className="eyebrow">Attention</p><h2>Operational health</h2></div><AlertTriangle /></div>
                  <div className="attention-metric"><strong>1</strong><span>open POS sessions</span></div>
                  <div className="attention-metric"><strong>₦0</strong><span>absolute cash discrepancy</span></div>
                  <div className="attention-metric"><strong>{products.filter((product) => branchStock(product) < 12).length}</strong><span>low-stock balances</span></div>
                </article>
              </section>

              <section className="surface">
                <div className="section-heading"><div><p className="eyebrow">Activity</p><h2>Recent sales</h2></div><TrendingUp /></div>
                <div className="activity-list">{sampleSales.slice(0, 5).map((sale) => <div key={sale.number}><div><strong>{sale.number}</strong><small>{sale.branch} · {sale.cashier}</small></div><strong>{money(sale.total)}</strong></div>)}</div>
              </section>
            </>
          )}

          {tab === "pos" && (() => {
            const categories = [...new Set(products.map((p) => p.category))].sort();
            const filtered = products.filter((p) => (!category || p.category === category) && `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase())).slice(0, 60);
            const lines = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((p) => p.id === id)!, quantity }));
            const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
            return (
              <div className="pos-layout">
                <section className="product-pane">
                  <div className="pos-search"><Search size={18} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product or scan barcode" /></div>
                  <div className="category-strip">
                    <button className={!category ? "active" : ""} onClick={() => setCategory("")}>All</button>
                    {categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{name}</button>)}
                  </div>
                  <div className="product-grid">
                    {filtered.map((product) => (
                      <button key={product.id} onClick={() => add(product.id)}>
                        <small>{product.sku}</small>
                        <strong>{product.name}</strong>
                        <span>{money(product.price)}</span>
                        <em>{branchStock(product)} available</em>
                      </button>
                    ))}
                  </div>
                </section>
                <aside className="cart-pane">
                  <div className="cart-title"><ShoppingCart size={18} /><h2>Current sale</h2><span>{lines.length}</span></div>
                  <div className="cart-lines">
                    {lines.map((line) => (
                      <article key={line.product.id}>
                        <div><strong>{line.product.name}</strong><small>{line.product.sku}</small></div>
                        <div className="qty">
                          <button aria-label={`Decrease ${line.product.name}`} onClick={() => setQuantity(line.product.id, line.quantity - 1)}><Minus /></button>
                          <input aria-label={`Quantity for ${line.product.name}`} type="number" inputMode="numeric" min={1} max={branchStock(line.product)} value={line.quantity} onChange={(e) => setQuantity(line.product.id, Number(e.target.value))} />
                          <button aria-label={`Increase ${line.product.name}`} onClick={() => add(line.product.id)}><Plus /></button>
                        </div>
                        <strong>{money(line.product.price * line.quantity)}</strong>
                        <button className="icon-button" aria-label={`Remove ${line.product.name}`} onClick={() => remove(line.product.id)}><Trash2 /></button>
                      </article>
                    ))}
                    {!lines.length && <div className="empty-cart">Scan or select a product to begin.</div>}
                  </div>
                  <div className="checkout">
                    <div className="sale-calculation">
                      <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                      <div className="total-row"><span>Total</span><strong>{money(subtotal)}</strong></div>
                    </div>
                    <label>Payment option<select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} disabled={!lines.length}>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                      <option value="CARD">Card / POS terminal</option>
                      <option value="MOBILE_MONEY">Mobile money</option>
                      <option value="OTHER">Other</option>
                    </select></label>
                    {saleCompleted && <div className="sale-success">Sale completed. Select a product to start the next sale.</div>}
                    <button className="button primary pay-button" disabled={!lines.length} onClick={complete}>{`Pay ${money(subtotal)}`}</button>
                  </div>
                </aside>
              </div>
            );
          })()}

          {tab === "sales" && (
            <section className="surface table-surface">
              <div className="section-heading"><div><p className="eyebrow">Transactions</p><h2>Sales</h2></div></div>
              <table>
                <thead><tr><th>Sale</th><th>Branch</th><th>Cashier</th><th>Method</th><th>Status</th><th>Total</th></tr></thead>
                <tbody>{sampleSales.map((sale) => <tr key={sale.number}><td><strong>{sale.number}</strong></td><td>{sale.branch}</td><td>{sale.cashier}</td><td>{sale.method}</td><td><StatePill status={sale.status} /></td><td>{money(sale.total)}</td></tr>)}</tbody>
              </table>
            </section>
          )}

          {tab === "credit" && (
            <>
              <section className="surface compact-surface">
                <div className="section-heading"><div><p className="eyebrow">New account</p><h2>Add credit customer</h2></div></div>
                <div className="form-stack muted">Customer card requires a name and branch; balance and limit can be adjusted later.</div>
              </section>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>Customer balances</h2></div></div>
                <table>
                  <thead><tr><th>Customer</th><th>Branch</th><th>Balance</th><th>Limit</th><th>Status</th></tr></thead>
                  <tbody>{creditAccounts.map((account) => <tr key={account.customer}><td><strong>{account.customer}</strong></td><td>{account.branch}</td><td>{money(account.balance)}</td><td>{money(account.limit)}</td><td><StatePill status={account.status} /></td></tr>)}</tbody>
                </table>
              </section>
            </>
          )}

          {tab === "inventory" && (
            <>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">Stock control</p><h2>Branch inventory</h2></div></div>
                <table>
                  <thead><tr><th>Branch</th><th>Product</th><th>Quantity</th><th>Stock value</th><th>State</th></tr></thead>
                  <tbody>{products.slice(0, 8).map((product) => <tr key={product.id}><td>{current.name}</td><td><strong>{product.name}</strong><small>{product.sku}</small></td><td>{branchStock(product)}</td><td>{money(product.cost * branchStock(product))}</td><td><StatePill status={branchStock(product) < 12 ? "Reorder soon" : "Healthy"} /></td></tr>)}</tbody>
                </table>
              </section>
              <section className="surface table-surface report-block">
                <div className="section-heading"><div><p className="eyebrow">Immutable ledger</p><h2>Recent stock movements</h2></div></div>
                <table>
                  <thead><tr><th>Time</th><th>Branch / Product</th><th>Type</th><th>Change</th><th>Balance</th></tr></thead>
                  <tbody>
                    <tr><td>Today 09:14</td><td>{current.name} / {products[0].name}</td><td>Sale</td><td>-1</td><td>{branchStock(products[0])} → {branchStock(products[0]) - 1}</td></tr>
                    <tr><td>Today 08:31</td><td>{current.name} / {products[4].name}</td><td>Stock received</td><td>+24</td><td>40 → 64</td></tr>
                    <tr><td>Yesterday 16:47</td><td>Lekki / {products[9].name}</td><td>Transfer in</td><td>+30</td><td>18 → 48</td></tr>
                  </tbody>
                </table>
              </section>
            </>
          )}

          {tab === "alerts" && (
            <section className="surface">
              <div className="section-heading"><div><p className="eyebrow">Operational review</p><h2>Stock alerts</h2><p>Products at or below their minimum level for {current.name}.</p></div></div>
              <div className="attention-list">
                {products.filter((product) => branchStock(product) < 12).map((product) => (
                  <div className="attention-item warning" key={product.id}><AlertTriangle size={20} /><div><strong>{product.name}</strong><small>{money(product.price)} · {branchStock(product)} in stock · SKU {product.sku}</small></div></div>
                ))}
                {!products.some((product) => branchStock(product) < 12) && <div className="empty-state">No low-stock alerts for this branch.</div>}
              </div>
            </section>
          )}

          {tab === "purchasing" && (
            <>
              <div className="header-actions"><a className="button primary inline-button" href="javascript:void(0)"><Plus size={17} /> New purchase order</a><a className="button secondary inline-button" href="javascript:void(0)">Recommendations</a></div>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">Procurement control</p><h2>Purchase orders</h2></div></div>
                <table>
                  <thead><tr><th>Order</th><th>Supplier</th><th>Branch</th><th>Status</th><th>Total</th></tr></thead>
                  <tbody>{purchaseOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td>{order.supplier}</td><td>{order.branch}</td><td><StatePill status={order.status} /></td><td>{money(order.total)}</td></tr>)}</tbody>
                </table>
              </section>
            </>
          )}

          {tab === "transfers" && (
            <section className="surface table-surface">
              <div className="section-heading"><div><p className="eyebrow">Multi-branch</p><h2>Stock transfers</h2></div></div>
              <table>
                <thead><tr><th>Transfer</th><th>From</th><th>To</th><th>Status</th><th>Handled by</th></tr></thead>
                <tbody>{transfers.map((transfer) => <tr key={transfer.number}><td><strong>{transfer.number}</strong></td><td>{transfer.source}</td><td>{transfer.destination}</td><td><StatePill status={transfer.status} /></td><td>{transfer.by}</td></tr>)}</tbody>
              </table>
            </section>
          )}

          {tab === "products" && (
            <>
              <div className="header-actions"><a className="button secondary inline-button" href="javascript:void(0)"><FileDown size={17} /> Import</a><a className="button primary inline-button" href="javascript:void(0)"><Plus size={17} /> New product</a></div>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">Catalogue</p><h2>Products</h2></div></div>
                <table>
                  <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock ({current.name})</th><th>State</th></tr></thead>
                  <tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.sku}</small></td><td>{product.category}</td><td>{money(product.price)}</td><td>{branchStock(product)}</td><td><StatePill status={branchStock(product) < 12 ? "Reorder soon" : "Healthy"} /></td></tr>)}</tbody>
                </table>
              </section>
            </>
          )}

          {tab === "reports" && (
            <>
              <section className="content-split">
                <article className="surface table-surface">
                  <div className="section-heading"><div><p className="eyebrow">Comparison</p><h2>Sales by branch</h2></div></div>
                  <table><thead><tr><th>Branch</th><th>Transactions</th><th>Revenue</th></tr></thead><tbody>{branches.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.transactions}</td><td>{money(item.revenue)}</td></tr>)}</tbody></table>
                </article>
                <article className="surface">
                  <div className="section-heading"><div><p className="eyebrow">Reconciliation</p><h2>Payments</h2></div></div>
                  <div className="payment-list"><div><span>Cash</span><strong>₦1,742,800</strong></div><div><span>Bank transfer</span><strong>₦691,700</strong></div><div><span>Card</span><strong>₦360,000</strong></div></div>
                </article>
              </section>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">People</p><h2>Sales by cashier</h2></div></div>
                <table><thead><tr><th>Cashier</th><th>Branch</th><th>Sales</th><th>Revenue</th></tr></thead><tbody>{staff.filter((person) => person.role === "CASHIER").map((person) => <tr key={person.email}><td>{person.name}</td><td>{person.branch}</td><td>{sampleSales.filter((sale) => sale.cashier === person.name).length || "14"}</td><td>{money(24000 + sampleSales.filter((sale) => sale.cashier === person.name).length * 4050)}</td></tr>)}</tbody></table>
              </section>
            </>
          )}

          {tab === "branches" && (
            <section className="surface table-surface">
              <div className="section-heading"><div><p className="eyebrow">Configuration</p><h2>Branches</h2></div></div>
              <table>
                <thead><tr><th>Branch</th><th>Code</th><th>Address</th><th>Status</th></tr></thead>
                <tbody>{branches.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.address}</td><td><StatePill status="Active" /></td></tr>)}</tbody>
              </table>
            </section>
          )}

          {tab === "team" && (
            <section className="surface table-surface">
              <div className="section-heading"><div><p className="eyebrow">Access control</p><h2>Employee accounts</h2></div></div>
              <table>
                <thead><tr><th>Employee</th><th>Email</th><th>Role</th><th>Branch</th></tr></thead>
                <tbody>{staff.map((person) => <tr key={person.email}><td><strong>{person.name}</strong></td><td>{person.email}</td><td>{person.role}</td><td>{person.branch}</td></tr>)}</tbody>
              </table>
            </section>
          )}

          {tab === "audit" && (
            <section className="surface table-surface">
              <div className="section-heading"><div><p className="eyebrow">Governance</p><h2>Audit trail</h2><p>Important actions can never be edited or deleted.</p></div><ShieldCheck /></div>
              <table>
                <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Entity</th></tr></thead>
                <tbody>{auditEntries.map((entry) => <tr key={entry.time + entry.action}><td>{entry.time}</td><td>{entry.action}</td><td>{entry.actor}</td><td>{entry.entity}</td></tr>)}</tbody>
              </table>
            </section>
          )}

          {tab === "settings" && (
            <>
              <section className="content-split">
                <article className="surface compact-surface">
                  <div className="section-heading"><div><p className="eyebrow">Profile</p><h2>Business settings</h2></div><CheckCircle2 size={18} /></div>
                  <div className="form-stack">
                    <label>Business name<input defaultValue="Relay Market Group" /></label>
                    <label>Currency<select defaultValue="NGN"><option>NGN · Nigerian Naira</option></select></label>
                    <label>Timezone<select defaultValue="Africa/Lagos"><option>Africa/Lagos</option></select></label>
                  </div>
                </article>
                <article className="surface compact-surface">
                  <div className="section-heading"><div><p className="eyebrow">Governance</p><h2>Owner access</h2></div></div>
                  <div className="payment-list"><div><span>Owner</span><strong>Ada Okafor</strong></div><div><span>Admin</span><strong>Tunde Bello</strong></div></div>
                </article>
              </section>
              <section className="surface table-surface">
                <div className="section-heading"><div><p className="eyebrow">Records</p><h2>Payment banks</h2><p>Bank accounts used when a sale is marked as bank transfer.</p></div></div>
                <table>
                  <thead><tr><th>Bank</th><th>Branch</th><th>Account name</th><th>Account number</th><th>Status</th></tr></thead>
                  <tbody>
                    <tr><td>Zenith Bank</td><td>Ikeja</td><td>Relay Market Group</td><td>1012345678</td><td><StatePill status="Active" /></td></tr>
                    <tr><td>GTBank</td><td>Lekki</td><td>Relay Market Group</td><td>0218765432</td><td><StatePill status="Active" /></td></tr>
                  </tbody>
                </table>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}