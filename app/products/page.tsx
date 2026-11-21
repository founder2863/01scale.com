import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_ORDER,
  APPS,
  appHref,
  appLabel,
  findAppVersion,
  SERVICES_NAME,
  servicesFor,
  servicesHref,
  VERSIONS,
} from "./apps";

export const metadata: Metadata = {
  title: "Products — 01scale",
  description:
    "The apps built on the 01scale platform, by version, and the platform services each one is assembled from.",
};

function anchorOf(href: string) {
  return href.split("#")[1];
}

// The same apps and versions as the Products menu (MVP1-E0-33 AC4), and the Services
// grouped by service, each with an address the app pages and the menu link to.
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
            agents.
          </p>
        </div>
      </section>

      <div className="container content">
        {VERSIONS.map(({ version }) => (
          <section key={version} id={version.toLowerCase()}>
            <h2 className="group-title">
              <span className="group-tag">{version}</span>
              Apps
            </h2>
            <ul className="product-grid">
              {APP_ORDER.map((app) => {
                const entry = findAppVersion(app, version);
                return (
                  <li key={app}>
                    <Link className="product-card" href={appHref(app, version)}>
                      <span className="module-body">
                        <span className="module-title">
                          {appLabel(app, version)}
                          <span className="status">{entry.status}</span>
                        </span>
                        <span className="product-card-text">{APPS[app].tagline}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <h3 className="section-subtitle" id={anchorOf(servicesHref(version))}>
              {SERVICES_NAME} {version}
            </h3>
            <p className="note">
              The platform services as products a developer or an app uses on
              their own. What they are built on is in{" "}
              <Link href="/platform/core">Platform Core</Link>.
            </p>
            {servicesFor(version).map(({ service, modules }) => (
              <div key={service} id={anchorOf(servicesHref(version, service))}>
                <p className="services-heading">{service}</p>
                <ul className="product-grid">
                  {modules.map((product) => (
                    <li key={product.slug}>
                      <Link className="product-card" href={`/products/${product.slug}`}>
                        <span className="module-number">{product.number}</span>
                        <span className="module-body">
                          <span className="module-title">
                            {product.title}
                            <span className="status">{product.status}</span>
                          </span>
                          <span className="product-card-text">{product.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

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
