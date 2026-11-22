import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import HowItsBuiltMenu from "./how-its-built/menu";
import PlatformMenu from "./platform/menu";
import ProductsMenu from "./products/menu";
import "@01scale/ui-core/tokens.css";
import "@01scale/ui-core/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "01scale",
  description:
    "Working prototypes of platform and AI products, built hands-on by Nikhil Shrivastava.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              01<span>scale</span>
            </Link>
            <nav>
              <Link href="/" className="nav-home">
                Home
              </Link>
              <ProductsMenu />
              <PlatformMenu />
              <HowItsBuiltMenu />
            </nav>
          </div>
        </header>
        <main>{children}</main>
        {/* Vercel Web Analytics: anonymous, cookie-free page views and referrers. */}
        <Analytics />
      </body>
    </html>
  );
}
