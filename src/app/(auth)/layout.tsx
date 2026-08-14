import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="auth-layout"><section className="auth-brand"><Link href="/" className="brand" aria-label="Retail Logic home"><BrandLogo/></Link><div className="auth-brand-copy"><p className="eyebrow">Retail operations, in one place</p><h1>Control every branch with confidence.</h1><p>Manage products, stock, sales, staff, and every branch from one secure workspace.</p><div className="auth-quick-actions" aria-label="Account actions"><Link href="/login" className="button auth-sign-in">Sign in</Link><Link href="/onboarding" className="button auth-create-account">Create account</Link></div></div><footer>PostgreSQL source of truth · Branch-aware access · Auditable operations</footer></section><section className="auth-panel">{children}</section></main>;
}
