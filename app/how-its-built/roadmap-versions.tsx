import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { roadmap as v1 } from "./roadmap-v1";
import RoadmapV1View from "./roadmap-v1-view";
import { roadmap as v2 } from "./roadmap-v2";
import RoadmapV2View from "./roadmap-v2-view";
import { roadmap as v3 } from "./roadmap-v3";
import RoadmapV3View from "./roadmap-v3-view";
import { roadmap as v4 } from "./roadmap-v4";
import RoadmapV4View from "./roadmap-v4-view";

// The roadmap's versions (Nikhil, 26 Nov 2026): each version is frozen once the next one starts,
// with its own document, script, data and view, so the evolution from one to the next can be
// compared. Each version's page opens with the requirements and constraints it added, and the
// gaps that reviewing it found. The latest version is also the Roadmap tab's own address.

type Version = {
  slug: string;
  label: string;
  title: string;
  status: string;
  adds: readonly string[];
  gaps: readonly string[];
  View: () => ReactNode;
};

export const roadmapVersions: Version[] = [
  {
    slug: "v1",
    label: "v1",
    title: "Dependency, size and value, for a team",
    status: "Frozen 26 Nov 2026",
    adds: v1.version.adds,
    gaps: v1.version.gaps,
    View: RoadmapV1View,
  },
  {
    slug: "v2",
    label: "v2",
    title: "Ready stories in one-week sprints, with a forecast range",
    status: "Frozen 26 Nov 2026",
    adds: v2.version.adds,
    gaps: v2.version.gaps,
    View: RoadmapV2View,
  },
  {
    slug: "v3",
    label: "v3",
    title: "To live in production and beyond, with realistic rollovers",
    status: "Frozen 26 Nov 2026",
    adds: v3.version.adds,
    gaps: v3.version.gaps,
    View: RoadmapV3View,
  },
  {
    slug: "v4",
    label: "v4",
    title: "The business ready for launch, with the product manager's time filled",
    status: "Current",
    adds: v4.version.adds,
    gaps: v4.version.gaps,
    View: RoadmapV4View,
  },
];

export const latestRoadmap = roadmapVersions[roadmapVersions.length - 1];

export function findRoadmapVersion(slug: string | undefined) {
  return slug ? roadmapVersions.find((v) => v.slug === slug) : latestRoadmap;
}

// The version documents use **bold** and `code` inline; render just those two.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function RoadmapVersion({ version }: { version: Version }) {
  const View = version.View;
  return (
    <>
      <nav className="rm-versions" aria-label="Roadmap versions">
        {roadmapVersions.map((v) => (
          <Link
            key={v.slug}
            href={`/how-its-built/roadmap/${v.slug}`}
            aria-current={v.slug === version.slug ? "page" : undefined}
          >
            <span className="rm-version-label">{v.label}</span>
            <span className="rm-version-title">{v.title}</span>
          </Link>
        ))}
      </nav>

      <section className="rm-version" aria-labelledby="rm-version-title">
        <h2 className="group-title" id="rm-version-title">
          Roadmap {version.label}: {version.title} <span className="status">{version.status}</span>
        </h2>
        <div className="rm-version-grid">
          <div className="card rm-version-card">
            <h3 className="card-title">What this version adds</h3>
            <ul className="rm-list">
              {version.adds.map((item) => (
                <li key={item}>{inline(item)}</li>
              ))}
            </ul>
          </div>
          <div className="card rm-version-card rm-version-gaps">
            <h3 className="card-title">Gaps found by reviewing it</h3>
            <ul className="rm-list">
              {version.gaps.map((item) => (
                <li key={item}>{inline(item)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <View />
    </>
  );
}
