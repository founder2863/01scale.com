import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "../../data";
import { APPS, appHref, appLabel, serviceHref, serviceKeysOf, serviceLabel, versionOf } from "../../apps";
import { appsUsing, Flow } from "../../flow";
import { details } from "../../details";
import { SectionMenu, SectionPager } from "../../section-menu";
import { TabContent } from "../../sections";
import { DEFAULT_TAB, tabGroups, tabHref, tabs, type TabSlug } from "../../tabs";

type Params = { module: string; tab?: string[] };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return products.flatMap((product) => [
    { module: product.slug, tab: [] },
    ...tabs
      .filter((tab) => tab.slug !== DEFAULT_TAB)
      .map((tab) => ({ module: product.slug, tab: [tab.slug] })),
  ]);
}

function resolve(params: Params) {
  const product = products.find((item) => item.slug === params.module);
  const slug = params.tab?.[0] ?? DEFAULT_TAB;
  const tab = tabs.find((item) => item.slug === slug);
  // "/products/x/market-outlook" is not a real address: Market Outlook lives at "/products/x".
  if (!product || !tab || params.tab?.[0] === DEFAULT_TAB || (params.tab?.length ?? 0) > 1) {
    return null;
  }
  return { product, tab };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const found = resolve(await params);
  if (!found) return {};
  return {
    title: `${found.product.title} · ${found.tab.label} — 01scale`,
    description: found.product.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const found = resolve(await params);
  if (!found) notFound();
  const { product, tab } = found;
  const detail = details[product.slug];

  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">
            <Link href="/products">Products</Link> ·{" "}
            {serviceKeysOf(product).length > 0
              ? serviceKeysOf(product).map((service, index) => (
                  <span key={service}>
                    {index > 0 && " · "}
                    <Link href={serviceHref(service, versionOf(product.group))}>
                      {serviceLabel(service, versionOf(product.group))}
                    </Link>
                  </span>
                ))
              : product.service}
          </p>
          <h1>{product.title}</h1>
          <p className="lead">{product.description}</p>
          <p className="hero-meta">
            {detail && <span>{detail.overview.version}</span>}
            <span>{detail ? detail.overview.status : "Planned, not built"}</span>
            <span>
              Module {product.number} of {products.length}
            </span>
          </p>
        </div>
      </section>

      {/* No app is built on this module's service version yet: say TBD (Nikhil's decision on PR #118). */}
      {appsUsing(product.slug).length === 0 && (
        <section className="flow-band" aria-label="Apps that use this component">
          <div className="container">
            <p className="flow-band-title flow-band-tbd">
              Used by <span className="status">TBD</span>
              <span>No app is built on this version of the service yet.</span>
            </p>
          </div>
        </section>
      )}

      {/* One band per app that uses this module, its step highlighted in each (MVP1-E0-35). */}
      {appsUsing(product.slug).map(({ app, version }) => (
        <section
          className="flow-band"
          key={`${app}-${version}`}
          aria-label={`Where this component sits in ${APPS[app].name}`}
        >
          <div className="container">
            <p className="flow-band-title">
              <Link href={appHref(app, version)}>{appLabel(app, version)}</Link>
              <span>Where this component sits in the flow</span>
            </p>
            <Flow app={app} version={version} current={product.slug} />
          </div>
        </section>
      ))}

      <div className="container product-layout">
        <SectionMenu
          label={product.title}
          groups={tabGroups}
          current={tab.slug}
          href={(slug) => tabHref(product.slug, slug as TabSlug)}
        />

        <div className="product-content guide">
          <TabContent product={product} tab={tab.slug as TabSlug} />
          <SectionPager groups={tabGroups} current={tab.slug} href={(slug) => tabHref(product.slug, slug as TabSlug)} />
        </div>
      </div>
    </>
  );
}
