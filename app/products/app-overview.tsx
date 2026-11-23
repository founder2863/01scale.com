import Link from "next/link";
import type { ReactNode } from "react";
import { appHref, appLabel, type AppKey, type Version } from "./apps";
import { flows } from "./flow";

// One Overview for every app (MVP1-E0-50). An app supplies only its content, in one file under
// app/products/overview/; this component decides the sections, their order and their look, so the
// Overviews of DocFlow, AutoRep and every later app cannot drift apart.

export type Persona = {
  // "Primary" or "Secondary" persona.
  kind: "Primary" | "Secondary";
  // A name and role, e.g. "Priya, a bookkeeper".
  name: string;
  text: string;
};

export type VersionCard = {
  title: string;
  text: string;
  // V1 only: what this version deliberately leaves out (the PRD's non-goals, about this app only).
  notIn?: string;
};

export type AppOverviewData = {
  // A clickable prototype; without one, the Try it call-out says "Coming Soon...".
  tryIt?: { text: string; href: string; fullScreen?: string };
  tryItComingSoon?: string;
  problem: readonly string[];
  personas: readonly Persona[];
  product: readonly string[];
  design: {
    title: string;
    // One line shown while the card is closed.
    summary: string;
    // Without a diagram, the open card says "Coming Soon...".
    diagram?: ReactNode;
  };
  // About this app only: nothing about the platform, other apps or later versions.
  versions: { V1: VersionCard; V2: VersionCard };
};

function ComingSoon({ text }: { text: string }) {
  return (
    <div className="coming-soon">
      <p className="coming-soon-title">Coming Soon...</p>
      <p>{text}</p>
    </div>
  );
}

function TryIt({ app, version, data }: { app: AppKey; version: Version; data: AppOverviewData }) {
  const label = appLabel(app, version);
  return (
    <section id="try-it" className="try-callout">
      <div>
        <h2 className="group-title">Try it</h2>
        {data.tryIt ? (
          <p className="note">{data.tryIt.text}</p>
        ) : (
          <>
            <p className="coming-soon-title">Coming Soon...</p>
            <p className="note">{data.tryItComingSoon ?? `A clickable ${label} will appear here when it is built.`}</p>
          </>
        )}
      </div>
      {data.tryIt && (
        <div className="try-callout-actions">
          <Link href={data.tryIt.href} className="button button-solid">
            Try the clickable prototype →
          </Link>
          {data.tryIt.fullScreen && <Link href={data.tryIt.fullScreen}>Open it full screen</Link>}
        </div>
      )}
    </section>
  );
}

function Paragraphs({ items }: { items: readonly string[] }) {
  return (
    <>
      {items.map((text) => (
        <p key={text}>{text}</p>
      ))}
    </>
  );
}

export function AppOverview({ app, version, data }: { app: AppKey; version: Version; data: AppOverviewData }) {
  const steps = flows[app] ?? [];
  return (
    <>
      <TryIt app={app} version={version} data={data} />

      <section id="problem">
        <h2 className="group-title">The problem</h2>
        <Paragraphs items={data.problem} />
      </section>

      <section id="personas">
        <h2 className="group-title">Who it is for</h2>
        <div className="cards">
          {data.personas.map((persona) => (
            <div className="card" key={persona.name}>
              <p className="eyebrow">{persona.kind} persona</p>
              <p className="card-title">{persona.name}</p>
              <p>{persona.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="what">
        <h2 className="group-title">What the product is</h2>
        <Paragraphs items={data.product} />
      </section>

      <section id="design">
        <h2 className="group-title">High-level design</h2>
        {/* Closed by default (MVP1-E0-50 AC1): a details element works without JavaScript and by keyboard. */}
        <details className="design-card">
          <summary>
            <span className="design-card-title">{data.design.title}</span>
            <span className="design-card-summary">{data.design.summary}</span>
          </summary>
          <div className="design-card-body">
            {data.design.diagram ?? (
              <ComingSoon text={`${appLabel(app, version)}'s design diagram will appear here when it is drawn.`} />
            )}
          </div>
        </details>
      </section>

      <section id="steps">
        <h2 className="group-title">What each step adds over time</h2>
        {steps.length > 0 ? (
          <dl className="decisions">
            {steps.map((step, index) => (
              <div key={step.key}>
                <dt>
                  {index + 1}. {step.label} · {step.service}
                </dt>
                <dd>
                  <strong>V1:</strong> {step.does}
                </dd>
                <dd>
                  <strong>V2:</strong> {step.later ?? "Not decided yet."}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <ComingSoon text={`${appLabel(app, version)}'s steps will appear here when its flow is designed.`} />
        )}
      </section>

      <section id="end-product">
        <h2 className="group-title">What the end product will be</h2>
        <div className="cards">
          {(["V1", "V2"] as const).map((v) => {
            const card = data.versions[v];
            return (
              <div className="card" key={v}>
                <p className="eyebrow">{v}</p>
                <p className="card-title">{card.title}</p>
                <p>{card.text}</p>
                {card.notIn && (
                  <p className="note">
                    <strong>Not in {v}:</strong> {card.notIn}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <p className="doc-link">
          <Link href={appHref(app, "V2")}>{appLabel(app, "V2")} →</Link>
        </p>
      </section>
    </>
  );
}
