import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="auth-layout"><section className="auth-brand"><Link href="/" className="brand"><span>R</span> Relay Retail</Link><div><p className="eyebrow">Retail operations, in one place</p><h1>Control every branch with confidence.</h1><p>Secure foundations for products, stock, sales, and management visibility.</p></div><footer>PostgreSQL source of truth · Branch-aware access · Auditable operations</footer></section><section className="auth-panel">{children}</section></main>;
}
