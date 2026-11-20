import Link from "next/link";
import "../../pocketshop.css";

export const metadata = { title: "PocketShop store owners" };

export default function PocketShopAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ps-app">
      <div className="ps-auth">
        <div className="ps-auth-card">
          <div className="ps-logo" style={{ padding: "0 0 10px" }}><span className="ps-logo-mark">P</span><span>Zyphr PocketShop</span></div>
          {children}
          <p className="ps-auth-link"><Link href="/">← Back to Zyphr</Link></p>
        </div>
      </div>
    </div>
  );
}
