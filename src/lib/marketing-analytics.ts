export type MarketingEvent = "book_demo_clicked" | "talk_to_sales_clicked" | "sign_in_clicked" | "demo_form_started" | "demo_form_submitted" | "demo_form_failed" | "pricing_cta_clicked" | "whatsapp_clicked" | "phone_clicked" | "email_clicked";

export function trackMarketingEvent(name: MarketingEvent, context: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("retail-logic:analytics", { detail: { name, context } }));
}
