import { changePasswordAction } from "@/modules/auth/change-password";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireAuthenticatedUser();
  const { error } = await searchParams;
  return <div className="auth-card"><div><p className="eyebrow">Account security</p><h2>Choose your password</h2><p>{user.mustChangePassword ? "Replace the initial password before entering the workspace." : "Update your account password."}</p></div><form action={changePasswordAction} className="form-stack"><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required /><small>12+ characters with uppercase, lowercase, and a number.</small></label>{error && <p className="form-error">{error}</p>}<button className="button primary">Save password</button></form></div>;
}
