import type { Metadata } from "next";
import Link from "next/link";
import DocFlowPrototype from "./prototype";

// /products/docflow/try: the whole DocFlow V1 journey, clickable (MVP1-E0-18 for the DocFlow app),
// built on the design system in packages/ui-core (MVP1-E0-19).
export const metadata: Metadata = {
  title: "Try DocFlow V1 — 01scale",
  description:
    "A clickable prototype of DocFlow V1: sign in, upload an invoice, watch Claude extract it, review flagged fields, pay in test mode and download JSON and CSV.",
};

export default function TryDocFlowPage() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">
            <Link href="/products">Products</Link> · <Link href="/products/docflow">DocFlow</Link> · Try it
          </p>
          <h1>Try DocFlow V1</h1>
          <p className="lead">
            The whole journey, clickable: sign in, upload an invoice, watch it being read, check the flagged fields, pay in test mode and download the
            results. Every screen is built from the platform services&apos; components and the shared design system.
          </p>
        </div>
      </section>
      <div className="container content">
        <DocFlowPrototype />
      </div>
    </>
  );
}
