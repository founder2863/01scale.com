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
import { AutorepDiagram } from "./autorep-diagram";
import { DocflowJourney, DocflowOverview, DocflowWhyComponents } from "./docflow-vision";
import { APP_DEFAULT_TAB, appTabGroups, appTabs, type AppTab } from "./app-tabs";

const GITHUB = "https://github.com/founder2863/01scale.com/blob/main";
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

// Steps the app runs, the modules behind them, and the service versions they come from.
function ModulesInFlow({ app, version }: { app: AppKey; version: Version }) {
  const moduleSlugs = new Set((flows[app] ?? []).flatMap((step) => step.modules));
  const modules = products.filter((product) => product.group === phaseOf(version) && moduleSlugs.has(product.slug));
  if (modules.length === 0) return null;
  return (
    <section id="modules">
      <h2 className="group-title">Modules in the flow</h2>
      <ModuleCards modules={modules} />
    </section>
  );
}

function FlowSection({ app, version }: { app: AppKey; version: Version }) {
  if ((flows[app] ?? []).length === 0) return null;
  return (
    <section id="flow">
      <h2 className="group-title">The flow</h2>
      <p className="note">
        Choose a step to open the platform module behind it. Steps {APPS[app].name} does itself open
        this page.
      </p>
      <Flow app={app} version={version} detailed />
    </section>
  );
}

function ComingSoon({ text }: { text: string }) {
  return (
    <div className="coming-soon">
      <p className="coming-soon-title">Coming Soon...</p>
      <p>{text}</p>
    </div>
  );
}

// A version without its own side menu: V2s and apps not designed yet ("coming later").
function SimpleVersionBody({ app, version }: { app: AppKey; version: Version }) {
  const entry = findAppVersion(app, version);
  return (
    <div className="container content">
      {entry.comingSoon ? (
        <section>
          <ComingSoon text={entry.comingSoon} />
        </section>
      ) : (
        <>
          {entry.summary && (
            <section id="what">
              <h2 className="group-title">What {appLabel(app, version)} is</h2>
              <p className="note">{entry.summary}</p>
            </section>
          )}
          <FlowSection app={app} version={version} />
          <ModulesInFlow app={app} version={version} />
        </>
      )}
      <BuiltOn app={app} version={version} />
    </div>
  );
}

// ---------------------------------------------------------------- the app side menu (MVP1-E0-48)

// The app versions with a side menu: the designed V1s (Nikhil's decision, 22 Nov 2026).
const SIDE_MENU: readonly `${AppKey}-${Version}`[] = ["docflow-V1", "autorep-V1"];
const hasSideMenu = (app: AppKey, version: Version) => SIDE_MENU.includes(`${app}-${version}`);

// Where each app's requirements live, until each app has its own folder (MVP1-E0-44).
const REQUIREMENTS: Partial<Record<AppKey, { prd: string; stories: readonly { id: string; title: string }[]; storiesHref: string }>> = {
  docflow: {
    prd: `${GITHUB}/docs/prd/MVP1-PRD.md`,
    storiesHref: `${GITHUB}/docs/epics/MVP1-EPICS.md`,
    stories: [
      { id: "MVP1-E0-09", title: "DocFlow app shell" },
      { id: "MVP1-E2-05", title: "Documents list" },
      { id: "MVP1-E5-01", title: "Final JSON with metadata" },
      { id: "MVP1-E5-02", title: "CSV export" },
      { id: "MVP1-E5-03", title: "Locked preview" },
    ],
  },
  autorep: {
    prd: `${GITHUB}/docs/prd/AUTOREP-PRD.md`,
    storiesHref: `${GITHUB}/docs/epics/AUTOREP-EPICS.md`,
    stories: [],
  },
};

export function appTabHref(app: AppKey, tab: string) {
  return tab === APP_DEFAULT_TAB ? `/products/${app}` : `/products/${app}/${tab}`;
}

function AppSection({ app, version, tab }: { app: AppKey; version: Version; tab: AppTab }) {
  const entry = findAppVersion(app, version);
  const req = REQUIREMENTS[app];
  switch (tab.slug) {
    case "overview":
      if (app === "docflow") return <DocflowOverview />;
      return (
        <>
          {app === "autorep" && <AutorepDiagram />}
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
        </>
      );
    case "user-journey":
      return app === "docflow" ? <DocflowJourney /> : <FlowSection app={app} version={version} />;
    case "built-on":
      return (
        <>
          {app === "docflow" && <DocflowWhyComponents />}
          <ModulesInFlow app={app} version={version} />
          <BuiltOn app={app} version={version} />
        </>
      );
    case "prd-reference":
      if (!req) break;
      return (
        <section id="prd-reference">
          <h2 className="group-title">PRD Reference</h2>
          <p className="note">The product requirements {appLabel(app, version)} is built from.</p>
          <ul className="link-list">
            <li>
              <a href={req.prd}>{app === "docflow" ? "MVP1 PRD" : `${APPS[app].name} PRD`} →</a>
            </li>
          </ul>
        </section>
      );
    case "requirements":
      if (!req) break;
      return (
        <section id="requirements">
          <h2 className="group-title">Requirement EPIC</h2>
          {req.stories.length > 0 ? (
            <>
              <p className="note">
                The stories {APPS[app].name} owns itself. Every other step is a platform module, with its
                stories on that module&apos;s page.
              </p>
              <ul className="plain-list">
                {req.stories.map((story) => (
                  <li key={story.id}>
                    <code>{story.id}</code> {story.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="note">Every {appLabel(app, version)} story, with its acceptance criteria.</p>
          )}
          <ul className="link-list">
            <li>
              <a href={req.storiesHref}>All stories and acceptance criteria →</a>
            </li>
          </ul>
        </section>
      );
  }
  return (
    <section>
      <h2 className="group-title">{tab.label}</h2>
      <ComingSoon text={`${tab.label} for ${appLabel(app, version)} will appear here when it is designed.`} />
    </section>
  );
}

function SideMenuBody({ app, version, tab }: { app: AppKey; version: Version; tab: AppTab }) {
  return (
    <div className="container product-layout">
      <nav className="side-tabs" aria-label={`${appLabel(app, version)} sections`}>
        {appTabGroups.map((group) => (
          <div className="side-tabs-group" key={group.heading}>
            <span className="side-tabs-heading">{group.heading}</span>
            {group.tabs.map((item) => (
              <Link
                key={item.slug}
                href={appTabHref(app, item.slug)}
                aria-current={item.slug === tab.slug ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="product-content content">
        <AppSection app={app} version={version} tab={tab} />
      </div>
    </div>
  );
}

// Addresses (MVP1-E0-48): "/x" is V1's Overview, "/x/<section>" a V1 section and "/x/v2" is V2.
// V1 keeps no "/v1" address, so every page has exactly one.
function resolveApp(app: AppKey, params: VersionParams, available: readonly Version[]) {
  const parts = params.version ?? [];
  if (parts.length > 1) return null;
  if (parts.length === 1 && available.includes("V1") && hasSideMenu(app, "V1")) {
    const tab = appTabs.find((item) => item.slug === parts[0] && item.slug !== APP_DEFAULT_TAB);
    if (tab) return { version: "V1" as Version, tab };
  }
  const version = resolveVersion(params, available);
  if (!version) return null;
  const tab = hasSideMenu(app, version) ? appTabs.find((item) => item.slug === APP_DEFAULT_TAB) : undefined;
  return { version, tab };
}

export function appPage(app: AppKey) {
  const available = VERSION_LIST.filter((version) => findAppVersion(app, version));
  return {
    generateStaticParams: () => [
      ...versionParams(available),
      ...(available.includes("V1") && hasSideMenu(app, "V1")
        ? appTabs.filter((tab) => tab.slug !== APP_DEFAULT_TAB).map((tab) => ({ version: [tab.slug] }))
        : []),
    ],
    generateMetadata: async ({ params }: { params: Promise<VersionParams> }): Promise<Metadata> => {
      const found = resolveApp(app, await params, available);
      if (!found) return { title: "01scale" };
      const section = found.tab && found.tab.slug !== APP_DEFAULT_TAB ? ` · ${found.tab.label}` : "";
      return {
        title: `${appLabel(app, found.version)}${section} — 01scale`,
        description: APPS[app].tagline,
      };
    },
    Page: async function AppPage({ params }: { params: Promise<VersionParams> }) {
      const found = resolveApp(app, await params, available);
      if (!found) notFound();
      const { version, tab } = found;
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
          {tab ? <SideMenuBody app={app} version={version} tab={tab} /> : <SimpleVersionBody app={app} version={version} />}
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
            <span>
              {serviceModules(service, version).length}{" "}
              {serviceModules(service, version).length === 1 ? "module" : "modules"}
            </span>
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
            <p className="note">
              <span className="status">TBD</span> No app is built on {serviceLabel(service, version)} yet.
            </p>
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
