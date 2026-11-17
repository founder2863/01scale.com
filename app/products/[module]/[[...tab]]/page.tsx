import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "../../data";
import { Flow, PRODUCT_NAME, VISION_HREF } from "../../flow";
import { details } from "../../details";
import { TabContent } from "../../sections";
import { tabHref, tabs, type TabSlug } from "../../tabs";

type Params = { module: string; tab?: string[] };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return products.flatMap((product) => [
    { module: product.slug, tab: [] },
    ...tabs.slice(1).map((tab) => ({ module: product.slug, tab: [tab.slug] })),
  ]);
}

function resolve(params: Params) {
  const product = products.find((item) => item.slug === params.module);
  const slug = params.tab?.[0] ?? "readme";
  const tab = tabs.find((item) => item.slug === slug);
  // "/products/x/readme" is not a real address: the Read Me lives at "/products/x".
  if (!product || !tab || (params.tab?.[0] === "readme") || (params.tab?.length ?? 0) > 1) {
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
            <Link href="/products">Products</Link> · {product.group} · {product.service}
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

      <section className="flow-band" aria-label={`Where this component sits in ${PRODUCT_NAME}`}>
        <div className="container">
          <p className="flow-band-title">
            <Link href={VISION_HREF}>
              {PRODUCT_NAME} Platform {product.group}
            </Link>
            <span>Where this component sits in the flow</span>
          </p>
          <Flow current={product.slug} />
        </div>
      </section>

      <div className="container product-layout">
        <nav className="side-tabs" aria-label={`${product.title} sections`}>
          {tabs.map((item) => (
            <Link
              key={item.slug}
              href={tabHref(product.slug, item.slug as TabSlug)}
              aria-current={item.slug === tab.slug ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="product-content guide">
          <TabContent product={product} tab={tab.slug as TabSlug} />
        </div>
      </div>
    </>
  );
}
