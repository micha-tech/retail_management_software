import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="ps-topbar">
      <div><span className="ps-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {actions && <div className="ps-actions">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, message, href, cta }: { title: string; message: string; href?: string; cta?: string }) {
  return (
    <div className="ps-empty"><strong>{title}</strong><span>{message}</span>{href && cta && <div style={{ marginTop: 16 }}><Link className="ps-button small" href={href}>{cta}</Link></div>}</div>
  );
}

export function StatusPill({ value, kind }: { value: string; kind?: "active" | "warning" | "danger" | "paid" | "pending" }) {
  const label = value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
  return <span className={`ps-pill ${kind ?? ""}`}>{label}</span>;
}

export function Money({ amount, currency = "NGN" }: { amount: bigint; currency?: string }) {
  return <>{formatMoney(amount, currency)}</>;
}

export function DateText({ value }: { value: Date | null | undefined }) {
  if (!value) return <span className="ps-hint">—</span>;
  return <>{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(value)}</>;
}
