import Link from "next/link";
import {
  APPS,
  appLabel,
  findAppVersion,
  phaseOf,
  SERVICES_NAME,
  servicesHref,
  type AppKey,
  type Version,
} from "./apps";
import { products } from "./data";
import { Flow, flows } from "./flow";

// The services an app uses in a version, each linking to its Services entry (MVP1-E0-33 AC3).
export function AppServices({ app, version }: { app: AppKey; version: Version }) {
  const steps = flows[app] ?? [];
  const phase = phaseOf(version);
  const used = Array.from(
    new Set(
      steps
        .filter((step) => step.modules.some((slug) => products.find((p) => p.slug === slug)?.group === phase))
        .map((step) => step.service)
        .filter((service) => !service.startsWith(APPS[app].name)),
    ),
  );
  if (used.length === 0) return null;
  return (
    <section id="services">
      <h2 className="group-title">The {SERVICES_NAME.toLowerCase()} it uses</h2>
      <p className="note">
        {APPS[app].name} is assembled from these platform services. Each is a product of its own.
      </p>
      <ul className="link-list">
        {used.map((service) => (
          <li key={service}>
            <Link className="status" href={servicesHref(version, service)}>
              {service}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// One app version's page (MVP1-E0-33): an introduction, the flow, its modules and the services it uses,
// or "Coming Soon..." when nothing is designed. DocFlow V1 has its own page with the full vision.
export function AppPage({ app, version }: { app: AppKey; version: Version }) {
  const entry = findAppVersion(app, version);
  const phase = phaseOf(version);
  const steps = flows[app] ?? [];
  const moduleSlugs = new Set(steps.flatMap((step) => step.modules));
  const modules = products.filter((product) => product.group === phase && moduleSlugs.has(product.slug));
  const other: Version = version === "V1" ? "V2" : "V1";

  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">
            <Link href="/products">Products</Link> · {APPS[app].name}
          </p>
          <h1>{appLabel(app, version)}</h1>
          <p className="lead">{APPS[app].tagline}</p>
          <p className="hero-meta">
            <span>{entry.status}</span>
            {modules.length > 0 && <span>{modules.length} platform modules</span>}
          </p>
        </div>
      </section>

      <div className="container content">
        {entry.comingSoon ? (
          <section>
            <div className="coming-soon">
              <p className="coming-soon-title">Coming Soon...</p>
              <p>{entry.comingSoon}</p>
            </div>
          </section>
        ) : (
          <>
            {entry.summary && (
              <section id="what">
                <h2 className="group-title">What {appLabel(app, version)} is</h2>
                <p className="note">{entry.summary}</p>
                {entry.docs && (
                  <ul className="link-list">
                    {entry.docs.map((doc) => (
                      <li key={doc.href}>
                        <a href={doc.href}>{doc.label} →</a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {steps.length > 0 && (
              <section id="flow">
                <h2 className="group-title">The flow</h2>
                <p className="note">
                  Choose a step to open the platform module behind it. Steps {APPS[app].name} does
                  itself open this page.
                </p>
                <Flow app={app} version={version} detailed />
              </section>
            )}

            {modules.length > 0 && (
              <section id="modules">
                <h2 className="group-title">
                  <span className="group-tag">{version}</span>
                  Modules in the flow
                </h2>
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
                          <span className="product-card-service">{product.service}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <AppServices app={app} version={version} />
          </>
        )}

        <p className="doc-link">
          <Link href={`/products/${app}-${other.toLowerCase()}`}>{appLabel(app, other)} →</Link>
        </p>
      </div>
    </>
  );
}
