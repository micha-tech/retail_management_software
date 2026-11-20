import type { Metadata } from "next";
import { Suspense } from "react";

import { ActionToast } from "@/components/feedback/action-toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Zyphr Logic", template: "%s · Zyphr Logic" },
  description: "Retail management and operations software for sales, inventory, customers, employees, suppliers, expenses, and multiple branches.",
  applicationName: "Zyphr Logic",
  openGraph: { type: "website", siteName: "Zyphr Logic", locale: "en_NG" },
  twitter: { card: "summary_large_image" },
  robots: process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" ? { index: false, follow: false } : undefined,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/zyphr-logic-app-icon.png", apple: "/brand/zyphr-logic-app-icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<Suspense fallback={null}><ActionToast/></Suspense></body>
    </html>
  );
}
