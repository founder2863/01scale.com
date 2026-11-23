import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { coreComponents, EPICS_URL } from "../../core";
import { DesignSystemSections } from "../../design-system/section";
import { UI_CORE } from "../../design-system/packages";

type Params = { component: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return coreComponents.map((component) => ({ component: component.slug }));
}

function find(slug: string) {
  return coreComponents.find((component) => component.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const component = find((await params).component);
  return {
    title: component ? `${component.name} · Platform Core — 01scale` : "Platform Core — 01scale",
    description: component?.purpose,
  };
}

// One Platform Core component (MVP1-E0-22 AC3): purpose, what a service gets, how to use it,
// version, status and the stories that build it. The Design system also shows its components
// live (MVP1-E0-52).
export default async function CoreComponentPage({ params }: { params: Promise<Params> }) {
  const component = find((await params).component);
  if (!component) notFound();
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">
            <Link href="/platform/core">Platform Core</Link>
          </p>
          <h1>{component.name}</h1>
          <p className="lead">{component.purpose}</p>
          <p className="hero-meta">
            <span>{component.status}</span>
            {/* The design system shows its package's version, read from package.json (MVP1-E0-52 AC3). */}
            <span>{component.slug === "design-system" ? `${UI_CORE.name} ${UI_CORE.version}` : component.version}</span>
          </p>
        </div>
      </section>

      <div className="container content">
        <section>
          <h2 className="group-title">What a service gets without building it</h2>
          <ul className="plain-list">
            {component.gives.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {component.slug === "design-system" && <DesignSystemSections />}

        <section>
          <h2 className="group-title">How to use it</h2>
          {component.usage ? (
            <div className="card">
              <p className="card-title">{component.usage.label}</p>
              <pre className="code">
                <code>{component.usage.code}</code>
              </pre>
              {component.status !== "Live" && (
                <p className="note">This works once the component is built.</p>
              )}
            </div>
          ) : (
            <div className="coming-soon">
              <p className="coming-soon-title">Coming Soon...</p>
              <p>How to use it will appear here once its interface is designed.</p>
            </div>
          )}
        </section>

        <section>
          <h2 className="group-title">Stories</h2>
          <ul className="plain-list">
            {component.stories.map((story) => (
              <li key={story}>
                <a href={EPICS_URL}>
                  <code>{story}</code>
                </a>
              </li>
            ))}
          </ul>
          {component.docs && (
            <a className="button button-solid" href={component.docs}>
              Read the design documents
            </a>
          )}
        </section>

        <p className="note" style={{ marginTop: 24 }}>
          <Link href="/platform/core">← All Platform Core components</Link>
        </p>
      </div>
    </>
  );
}
