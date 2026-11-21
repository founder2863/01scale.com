import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_ORDER,
  APPS,
  appHref,
  appStatus,
  SERVICE_ORDER,
  SERVICES,
  serviceHref,
  serviceVersions,
} from "./apps";

export const metadata: Metadata = {
  title: "Products — 01scale",
  description: "The apps built on the 01scale platform, and the platform services they are assembled from.",
};

// The same apps and services as the Products menu (MVP1-E0-32, E0-33 AC4). Versions are on each page.
export default function Products() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">01scale</p>
          <h1>Products</h1>
          <p className="lead">
            Apps assembled from independent platform services. Each service is
            a product of its own, with an API, UI components and tools for AI
            agents, and its own versions.
          </p>
        </div>
      </section>

      <div className="container content">
        <section id="apps">
          <h2 className="group-title">Apps</h2>
          <ul className="product-grid">
            {APP_ORDER.map((app) => (
              <li key={app}>
                <Link className="product-card" href={appHref(app)}>
                  <span className="module-body">
                    <span className="module-title">
                      {APPS[app].name}
                      <span className="status">{appStatus(app)}</span>
                    </span>
                    <span className="product-card-text">{APPS[app].tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section id="services">
          <h2 className="group-title">Services</h2>
          <p className="note">
            The platform services, as products a developer or an app uses on
            their own. What they are built on is in{" "}
            <Link href="/platform/core">Platform Core</Link>.
          </p>
          <ul className="product-grid">
            {SERVICE_ORDER.map((service) => (
              <li key={service}>
                <Link className="product-card" href={serviceHref(service)}>
                  <span className="module-body">
                    <span className="module-title">
                      {SERVICES[service].name}
                      <span className="status">{serviceVersions(service).join(" · ")}</span>
                    </span>
                    <span className="product-card-text">{SERVICES[service].tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="note">
            Looking for every endpoint in one place? See the{" "}
            <Link href="/apis">API index across all services</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
