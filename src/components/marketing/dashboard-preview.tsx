import { ArrowUpRight, Box, CircleCheck, ShoppingCart } from "lucide-react";

export function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return <div className={`marketing-dashboard ${compact ? "compact" : ""}`} aria-label="Fictional Retail Logic dashboard demonstration">
    <div className="marketing-demo-label">Interface preview · sample data</div>
    <div className="dashboard-top"><div><span className="dashboard-wordmark">RL</span><strong>Overview</strong></div><span>All branches⌄</span></div>
    <div className="dashboard-metrics">
      <article><span>Monthly revenue</span><strong>₦4,820,500</strong><small className="positive"><ArrowUpRight/>18.4%</small></article>
      <article><span>Transactions</span><strong>1,284</strong><small>Across 4 branches</small></article>
      <article><span>Gross profit</span><strong>₦1,247,800</strong><small>25.9% margin</small></article>
    </div>
    <div className="dashboard-grid"><article className="dashboard-chart"><div className="dashboard-card-head"><div><span>Sales trend</span><strong>Revenue performance</strong></div><span>30 days</span></div><svg viewBox="0 0 520 170" role="img" aria-label="Upward sales trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#168b5b" stopOpacity=".24"/><stop offset="1" stopColor="#168b5b" stopOpacity="0"/></linearGradient></defs><path d="M5 145 C60 128,85 142,125 108 S185 112,225 79 S298 96,338 52 S412 70,515 20 L515 170 L5 170Z" fill="url(#area)"/><path d="M5 145 C60 128,85 142,125 108 S185 112,225 79 S298 96,338 52 S412 70,515 20" fill="none" stroke="#168b5b" strokeWidth="4" strokeLinecap="round"/></svg><div className="chart-axis"><span>Aug 1</span><span>Aug 8</span><span>Aug 15</span><span>Aug 22</span><span>Aug 30</span></div></article>
      <article className="dashboard-activity"><div className="dashboard-card-head"><div><span>Live operations</span><strong>Recent activity</strong></div><span className="online"><i/> Live</span></div><ul><li><ShoppingCart/><span><strong>Sale RL-1284</strong><small>Lekki · ₦42,650</small></span><time>Now</time></li><li><Box/><span><strong>Low-stock alert</strong><small>Golden Penny Flour</small></span><time>4m</time></li><li><CircleCheck/><span><strong>Stock received</strong><small>Ikeja · 64 units</small></span><time>12m</time></li></ul></article></div>
    <div className="dashboard-footer-row"><span><i/> All branches online</span><span><b>12</b> low-stock products</span><span>Top branch <b>Lekki</b></span></div>
  </div>;
}
