import { requirePermission } from "@/modules/auth/authorization";
import { updateBusinessAction } from "@/modules/businesses/actions";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const access = await requirePermission("business:manage");
  const params = await searchParams;
  return <><header className="topbar"><div><p className="eyebrow">Configuration</p><h1>Business settings</h1><p>Regional settings drive reports and local date boundaries.</p></div></header><main className="page narrow"><section className="surface"><form action={updateBusinessAction} className="form-stack"><div className="form-grid"><label>Business name<input name="name" defaultValue={access.business.name} required/></label><label>Currency<input value={access.business.currency} disabled/><small>Currency is locked after onboarding to protect historical amounts.</small></label><label>Timezone<input name="timezone" defaultValue={access.business.timezone} required/></label><label>Phone<input name="phone" type="tel" defaultValue={access.business.phone||""}/></label><label>Email<input name="email" type="email" defaultValue={access.business.email||""}/></label></div>{params.error&&<p className="form-error">{params.error}</p>}{params.saved&&<p className="sale-success">Settings saved.</p>}<div className="form-actions"><button className="button primary">Save settings</button></div></form></section></main></>;
}
