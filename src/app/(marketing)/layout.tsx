import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import "./marketing.css";
import "./refinements.css";
import "./friendly.css";
import "../visual-refinements.css";

export default function MarketingLayout({ children }: LayoutProps<"/">) { return <div className="marketing-site"><a className="marketing-skip-link" href="#main-content">Skip to content</a><MarketingHeader/><main id="main-content">{children}</main><MarketingFooter/></div>; }
