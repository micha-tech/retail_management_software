import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  return <div className="auth-card"><div><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p>Use your staff account to continue.</p></div>{created && <p className="form-success login-notice">Your business was created. Sign in with the owner account to continue.</p>}<LoginForm /><p className="auth-link">Setting up a new company? <Link href="/onboarding">Create a business</Link></p></div>;
}
