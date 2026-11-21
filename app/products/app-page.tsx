import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  APPS,
  appHref,
  appLabel,
  findAppVersion,
  phaseOf,
  SERVICES,
  serviceHref,
  serviceLabel,
  serviceModules,
  SERVICE_ORDER,
  serviceVersions,
  usedBy,
  VERSION_LIST,
  type AppKey,
  type ServiceKey,
  type Version,
} from "./apps";
import { products } from "./data";
import { DocflowVision } from "./docflow-vision";
import { Flow, flows } from "./flow";

type VersionParams = { version?: string[] };

// "/x" is V1 and "/x/v2" is V2; "/x/v1" is not an address, so each version has exactly one.
function resolveVersion(params: VersionParams, available: readonly Version[]): Version | null {
  if ((params.version?.length ?? 0) > 1) return null;
  const slug = params.version?.[0];
  if (slug === undefined) return available.includes("V1") ? "V1" : null;
  const version = VERSION_LIST.find((item) => item.toLowerCase() === slug && item !== "V1");
  return version && available.includes(version) ? version : null;
}

function versionParams(available: readonly Version[]): VersionParams[] {
  return available.map((version) => ({ version: version === "V1" ? [] : [version.toLowerCase()] }));
}

function ModuleCards({ modules }: { modules: typeof products }) {
  return (
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
  );
}

function VersionTabs({ label, versions, current, href }: {
  label: string;
  versions: readonly Version[];
  current: Version;
  href: (version: Version) => string;
}) {
  return (
    <div className="container">
      <nav className="page-tabs" aria-label={`${label} versions`}>
        {versions.map((version) => (
          <Link key={version} href={href(version)} aria-current={version === current ? "page" : undefined}>
            {version}
          </Link>
        ))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- apps (MVP1-E0-33)

// Which version of each service an app version is built on, each linking to that service version.
function BuiltOn({ app, version }: { app: AppKey; version: Version }) {
  const builtOn = findAppVersion(app, version).builtOn;
  const services = SERVICE_ORDER.filter((service) => builtOn[service]);
  if (services.length === 0) return null;
  return (
    <section id="built-on">
      <h2 className="group-title">Built on</h2>
      <p className="note">
        The platform services {appLabel(app, version)} uses, and which version of each. App
        versions and service versions are independent: an app can move to a new version while
        keeping a service at an earlier one. TBD means the version is not decided yet.
      </p>
      <table className="cost-table cost-table-text">
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Version</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service}>
              <th scope="row">{SERVICES[service].name}</th>
              <td data-label="Version">
                {builtOn[service] === "TBD" ? (
                  <span className="status">TBD</span>
                ) : (
                  <Link href={serviceHref(service, builtOn[service] as Version)}>
                    {serviceLabel(service, builtOn[service] as Version)}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function AppVersionBody({ app, version, children }: { app: AppKey; version: Version; children?: ReactNode }) {
  const entry = findAppVersion(app, version);
  if (app === "docflow" && version === "V1") return <DocflowVision>{children}</DocflowVision>;
  const steps = flows[app] ?? [];
  const moduleSlugs = new Set(steps.flatMap((step) => step.modules));
  const modules = products.filter((product) => product.group === phaseOf(version) && moduleSlugs.has(product.slug));
  return (
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
              <h2 className="group-title">Modules in the flow</h2>
              <ModuleCards modules={modules} />
            </section>
          )}
        </>
      )}
      {children}
    </div>
  );
}

export function appPage(app: AppKey) {
  const available = VERSION_LIST.filter((version) => findAppVersion(app, version));
  return {
    generateStaticParams: () => versionParams(available),
    generateMetadata: async ({ params }: { params: Promise<VersionParams> }): Promise<Metadata> => {
      const version = resolveVersion(await params, available);
      return {
        title: version ? `${appLabel(app, version)} — 01scale` : "01scale",
        description: APPS[app].tagline,
      };
    },
    Page: async function AppPage({ params }: { params: Promise<VersionParams> }) {
      const version = resolveVersion(await params, available);
      if (!version) notFound();
      const entry = findAppVersion(app, version);
      return (
        <>
          <section className="hero hero-small">
            <div className="container">
              <p className="eyebrow">
                <Link href="/products">Products</Link> · Apps
              </p>
              <h1>{APPS[app].name}</h1>
              <p className="lead">{APPS[app].tagline}</p>
              <p className="hero-meta">
                <span>{appLabel(app, version)}</span>
                <span>{entry.status}</span>
              </p>
            </div>
          </section>
          <VersionTabs label={APPS[app].name} versions={available} current={version} href={(v) => appHref(app, v)} />
          <AppVersionBody app={app} version={version}>
            <BuiltOn app={app} version={version} />
          </AppVersionBody>
        </>
      );
    },
  };
}

// ---------------------------------------------------------------- services (MVP1-E0-34)

export const serviceStaticParams = () =>
  SERVICE_ORDER.flatMap((service) =>
    versionParams(serviceVersions(service)).map((params) => ({ service, ...params })),
  );

type ServiceParams = { service: string } & VersionParams;

function resolveService(params: ServiceParams) {
  const service = SERVICE_ORDER.find((key) => key === params.service);
  if (!service) return null;
  const version = resolveVersion(params, serviceVersions(service));
  return version ? { service, version } : null;
}

export async function serviceMetadata({ params }: { params: Promise<ServiceParams> }): Promise<Metadata> {
  const found = resolveService(await params);
  if (!found) return {};
  return {
    title: `${serviceLabel(found.service, found.version)} — 01scale`,
    description: SERVICES[found.service].tagline,
  };
}

export async function ServicePage({ params }: { params: Promise<ServiceParams> }) {
  const found = resolveService(await params);
  if (!found) notFound();
  const { service, version } = found;
  const info = SERVICES[service];
  const users = usedBy(service, version);
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">
            <Link href="/products">Products</Link> · Services
          </p>
          <h1>{info.name}</h1>
          <p className="lead">{info.tagline}</p>
          <p className="hero-meta">
            <span>{serviceLabel(service, version)}</span>
            <span>{serviceModules(service, version).length} modules</span>
          </p>
        </div>
      </section>
      <VersionTabs label={info.name} versions={serviceVersions(service)} current={version} href={(v) => serviceHref(service, v)} />
      <div className="container content">
        <section id="modules">
          <h2 className="group-title">Modules in {serviceLabel(service, version)}</h2>
          <ModuleCards modules={serviceModules(service, version)} />
        </section>

        <section id="used-by">
          <h2 className="group-title">Used by</h2>
          {users.length > 0 ? (
            <ul className="link-list">
              {users.map((entry) => (
                <li key={`${entry.app}-${entry.version}`}>
                  <Link className="status" href={appHref(entry.app, entry.version)}>
                    {appLabel(entry.app, entry.version)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">No app uses {serviceLabel(service, version)} yet.</p>
          )}
        </section>

        <section id="evolution">
          <h2 className="group-title">How {info.name} evolves</h2>
          <p className="note">
            Every service starts by wrapping a cloud service behind its own contract, then replaces
            the inside one step at a time. A new product version keeps the same API contract: {info.name}{" "}
            {serviceVersions(service).at(-1)} still answers on <code>/api/{service}/v1</code>. The
            exact steps are decided in each version&apos;s stories.
          </p>
          <ul className="plain-list">
            {info.path.map((step, index) => (
              <li key={step}>
                <strong>Step {index + 1}.</strong> {step}
              </li>
            ))}
          </ul>
          <p className="note">
            What every service is built on (gateway, service template, design system, standards) is in{" "}
            <Link href="/platform/core">Platform Core</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
