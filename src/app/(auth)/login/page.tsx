import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <div className="auth-card"><div><p className="eyebrow">Welcome back</p><h2>Sign in to your workspace</h2><p>Use your staff account to continue.</p></div><LoginForm /><p className="auth-link">Setting up a new company? <Link href="/onboarding">Create a business</Link></p></div>;
}
