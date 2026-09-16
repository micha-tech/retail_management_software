import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, Building2, CircleDollarSign, MonitorSmartphone, PackageSearch, ScanLine, ShieldCheck, UsersRound } from "lucide-react";

export const siteConfig = {
  name: "Retail Logic",
  description: "Manage sales, inventory, customers, employees, suppliers, expenses, multiple branches, and e-commerce operations with Retail Logic.",
  loginUrl: "/login",
  demoUrl: "/demo",
  contact: { email: "", phone: "", whatsapp: "" },
  socialLinks: [] as { label: string; href: string }[],
  legalName: "Retail Logic",
};

export const navItems = [
  { label: "Product", href: "/features", children: [
    { label: "Explore the platform", href: "/features" },
    { label: "Point of sale", href: "/features#point-of-sale" },
    { label: "Inventory", href: "/features#inventory" },
    { label: "Purchasing & suppliers", href: "/features#purchasing" },
    { label: "Reports & insights", href: "/features#reports" },
  ] },
  { label: "Solutions", href: "/solutions", children: [
    { label: "Supermarkets", href: "/solutions/supermarkets" },
    { label: "Multi-branch retail", href: "/solutions/multi-branch-retail" },
    { label: "E-commerce", href: "/solutions/ecommerce" },
  ] },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/about", children: [
    { label: "About", href: "/about" }, { label: "Contact", href: "/contact" },
  ] },
];

export type Capability = { title: string; description: string; detail: string; icon: LucideIcon };
export const capabilities: Capability[] = [
  { title: "Point of Sale", description: "Keep checkout moving and the records clear. Record payments, issue receipts, and trace each sale back to the cashier.", detail: "A focused checkout built for busy tills.", icon: ScanLine },
  { title: "Inventory Management", description: "Check what is available before you buy more. Follow stock movements, count differences, and transfers so discrepancies are easier to investigate.", detail: "Know what moved, when, and why.", icon: Boxes },
  { title: "Multi-branch Management", description: "Keep a clear view of each branch without collecting separate spreadsheets. Compare sales, review stock, and manage access from one workspace.", detail: "One operating view across every location.", icon: Building2 },
  { title: "Purchasing & Suppliers", description: "Organize suppliers, deliveries, procurement costs, and outstanding payments.", detail: "A clearer path from order to shelf.", icon: PackageSearch },
  { title: "Customers & Loyalty", description: "Customer profiles, purchase history, loyalty points, segmentation, and repeat purchases.", detail: "Turn transaction history into better service.", icon: UsersRound },
  { title: "Employee Management", description: "Give employees the access their work requires. Connect sales and important actions to the people responsible, so managers can follow up with context.", detail: "Give each person the right level of access.", icon: ShieldCheck },
  { title: "Finance & Expenses", description: "Track income, expenses, payment methods, cash movement, and branch performance.", detail: "Understand where money enters and leaves.", icon: CircleDollarSign },
  { title: "Reports & Analytics", description: "Understand what sold, what earned margin, and what needs attention. Review product, cashier, and branch performance with the records behind the numbers.", detail: "Reports designed for operational decisions.", icon: BarChart3 },
  { title: "E-commerce Operations", description: "Manage online products, orders, customers, fulfillment, and synchronized stock.", detail: "Sell online without creating a second inventory truth.", icon: MonitorSmartphone },
];

export const pricingTiers = [
  { name: "Starter", summary: "For an independent store building a reliable operating foundation.", features: ["Point of sale", "Products and inventory", "Customer records", "Core reports"], cta: "Request Pricing" },
  { name: "Business", summary: "For growing retailers that need deeper control and team accountability.", features: ["Everything in Starter", "Multiple employees and roles", "Purchasing and expenses", "Advanced operational reports"], cta: "Explore the Demo", featured: true },
  { name: "Enterprise", summary: "For multi-location and complex retail organizations.", features: ["Everything in Business", "Multi-branch operations", "Central oversight", "Implementation planning"], cta: "Contact Sales" },
];

export const solutionPages = {
  supermarkets: { eyebrow: "FOR SUPERMARKETS", title: "Keep every aisle, till, and stockroom in sync.", intro: "Retail Logic gives supermarket teams a connected view of fast-moving stock, checkout activity, employee access, purchasing, and daily margin.", challenges: ["Fast-moving inventory is difficult to reconcile", "Stockouts and excess stock reduce margin", "Cashier and shift accountability is fragmented"], benefits: ["Replenish using current branch-level stock", "Trace sales and stock movements", "Compare category and cashier performance"], workflow: ["Import products and opening stock", "Sell and receive stock throughout the day", "Review exceptions and performance from one dashboard"] },
  "multi-branch-retail": { eyebrow: "FOR MULTI-BRANCH RETAIL", title: "Run every location from one source of truth.", intro: "Standardize how branches sell, count, transfer, and report while preserving clear access boundaries for each team.", challenges: ["Branches operate with inconsistent processes", "Consolidated reports arrive too late", "Transfers and stock ownership are hard to trace"], benefits: ["Compare branch performance in real time", "Move stock with a complete audit trail", "Apply clear branch-level access"], workflow: ["Configure branches, roles, and products", "Connect sales and inventory workflows", "Monitor every location from a consolidated view"] },
  ecommerce: { eyebrow: "FOR E-COMMERCE", title: "Connect your online catalogue to retail operations.", intro: "Prepare a branded online storefront while keeping products, prices, customers, orders, and fulfillment close to the operational system.", challenges: ["Online and in-store stock drift apart", "Order fulfillment lacks a single workflow", "Customer and product data live in separate tools"], benefits: ["Maintain a unified product catalogue", "Track online order status and fulfillment", "Keep customer history connected"], workflow: ["Publish products with images and descriptions", "Receive and prepare online orders", "Track fulfillment alongside inventory"] },
} as const;

export const commonFaqs = [
  { question: "Can Retail Logic support more than one location?", answer: "Yes. Retail Logic is designed to provide centralized visibility while keeping branch inventory, employees, sales, and access clearly separated." },
  { question: "Can employee access be limited?", answer: "Yes. Role-based permissions and branch assignments help ensure each employee sees and performs only the work assigned to them." },
  { question: "Does Retail Logic include inventory and reporting?", answer: "Yes. The platform connects sales with inventory movements and operational reports, including branch, product, cashier, and stock views." },
  { question: "How do we know which plan fits?", answer: "Explore the demo to get familiar with the platform, then talk to our team about your locations, staff, workflows, and reporting needs. We will help you choose a suitable setup." },
];

export const industries = ["Supermarkets", "Shopping malls", "Retail stores", "Multi-branch businesses", "Wholesalers", "E-commerce stores"];
