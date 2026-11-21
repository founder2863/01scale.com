import type { Metadata } from "next";
import Link from "next/link";
import { coreComponents } from "../core";

export const metadata: Metadata = {
  title: "Platform Core — 01scale",
  description:
    "The shared components every 01scale service is built on, so no service rebuilds what the platform already gives it.",
};

// The Platform Core catalogue (MVP1-E0-22): one card per shared component.
export default function PlatformCore() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Platform</p>
          <h1>Platform Core</h1>
          <p className="lead">
            What every service gets without building it. A developer starting
            a new service, or an app calling one, begins here.
          </p>
        </div>
      </section>

      <div className="container content">
        <section>
          <p className="note">
            These components are shared by every service and app. They are
            internal to the platform, so they have no market, pricing or
            support pages. API and data standards hold only the shared rules;
            each service&apos;s own endpoints and tables are on{" "}
            <Link href="/products">its product page</Link>.
          </p>
          <ul className="core-grid">
            {coreComponents.map((component) => (
              <li key={component.slug}>
                <Link className="core-card" href={`/platform/core/${component.slug}`}>
                  <span className="core-card-head">
                    <strong>{component.name}</strong>
                    <span className="status">{component.status}</span>
                  </span>
                  <span className="core-card-purpose">{component.purpose}</span>
                  <span className="core-card-meta">
                    {component.version} · {component.stories.join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
