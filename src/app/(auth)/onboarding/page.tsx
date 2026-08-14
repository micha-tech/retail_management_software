import Link from "next/link";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return <div className="auth-card wide"><div><p className="eyebrow">Get started</p><h2>Create your retail workspace</h2><p>Your owner account and first branch are created together.</p></div><OnboardingForm /><p className="auth-link">Already have an account? <Link href="/login">Sign in</Link></p></div>;
}
