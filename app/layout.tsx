import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import DemosMenu from "./demos-menu";
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
              <Link href="/">Home</Link>
              <DemosMenu />
              <Link href="/apis">APIs</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
