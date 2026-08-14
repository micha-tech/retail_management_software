import type { Metadata } from "next";
import { Suspense } from "react";

import { ActionToast } from "@/components/feedback/action-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Retail Logic", template: "%s · Retail Logic" },
  description: "Secure multi-branch retail operations.",
  icons: { icon: "/brand/retail-logic-app-icon.png", apple: "/brand/retail-logic-app-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<Suspense fallback={null}><ActionToast/></Suspense></body>
    </html>
  );
}
