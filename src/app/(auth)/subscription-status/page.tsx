import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { businessMemberships, businessSubscriptions, businesses } from "@/db/schema";
import { logoutAction } from "@/modules/auth/actions";
import { requireAuthenticatedUser } from "@/modules/auth/authorization";

export default async function SubscriptionStatusPage({searchParams}:{searchParams:Promise<{business?:string}>}){
  const user=await requireAuthenticatedUser();const{business}=await searchParams;
  const conditions=[eq(businessMemberships.userId,user.id),eq(businessMemberships.active,true)];if(business)conditions.push(eq(businessMemberships.businessId,business));
  const[record]=await db.select({business:businesses,subscription:businessSubscriptions}).from(businessMemberships).innerJoin(businesses,eq(businesses.id,businessMemberships.businessId)).leftJoin(businessSubscriptions,eq(businessSubscriptions.businessId,businesses.id)).where(and(...conditions)).limit(1);
  if(!record)redirect("/login");if(!record.subscription||!["SUSPENDED","CANCELED"].includes(record.subscription.status))redirect("/");
  return <div className="auth-card"><div><p className="eyebrow">Subscription {record.subscription.status.toLowerCase()}</p><h2>{record.business.name} is temporarily unavailable</h2><p>{record.subscription.status==="SUSPENDED"?"This workspace has been suspended by the platform operator.":"This workspace subscription has been canceled."} Contact Retail Logic support or your company owner to restore access.</p></div><form action={logoutAction}><button className="button secondary">Sign out</button></form></div>;
}
