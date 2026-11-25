import { Fragment, type ReactNode } from "react";
import { roadmap } from "./roadmap";

// The Roadmap tab of How It's Built (MVP1-E0-54). Everything here comes from roadmap.ts,
// generated from docs/process/ROADMAP.md and the epics files by `npm run roadmap`.

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

// ROADMAP.md uses **bold** and `code` inline; render just those two.
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function valueTone(value: string) {
  const v = value.toLowerCase();
  if (v.startsWith("high")) return "rm-value rm-value-high";
  if (v.startsWith("medium")) return "rm-value rm-value-medium";
  return "rm-value rm-value-low";
}

function days(n: number) {
  return `${n} person-day${n === 1 ? "" : "s"}`;
}

export default function RoadmapView() {
  const { totals, groups, method, risks, criticalPath } = roadmap;
  return (
    <section id="roadmap">
      <h2 className="group-title">
        Roadmap <span className="status">Planned</span>
      </h2>
      <p className="note">
        What is left to build and in what order: by dependency first, then by value, with each
        story&apos;s size. The main path is the shortest way to a DocFlow a visitor can use from
        sign-in to delivery; side tracks can run beside it; later work waits.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">{totals.stories}</span>
          <span className="stat-label">Stories on the roadmap</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.days}</span>
          <span className="stat-label">Person-days in all</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.doneStories}</span>
          <span className="stat-label">Done</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.remainingDays}</span>
          <span className="stat-label">Person-days left</span>
        </div>
      </div>

      <h3 className="section-subtitle">Critical path</h3>
      <ol className="rm-path" aria-label="Critical path, in order">
        {criticalPath.map((name) => (
          <li key={name}>{name.replace(/^\d+\s+/, "")}</li>
        ))}
      </ol>
      <p className="note">
        Each wave waits for the one before it. It starts with the service template
        (<code>MVP1-E0-07</code>), which every service is built from.
      </p>

      {groups.map((group) => (
        <section key={group.kind} className="rm-group" aria-labelledby={`rm-${group.kind}`}>
          <h3 className="section-subtitle" id={`rm-${group.kind}`}>
            {group.title}{" "}
            <span className="rm-group-total">
              {group.storyCount} stories · {days(group.days)}
              {group.remainingDays !== group.days ? ` · ${group.remainingDays} left` : ""}
            </span>
          </h3>
          <div className="rm-waves">
            {group.rows.map((row) => (
              <article key={row.name} className="card rm-wave">
                <header className="rm-wave-head">
                  <h4 className="card-title">{row.name}</h4>
                  <span className={valueTone(row.value)}>{row.value} value</span>
                </header>
                <p className="rm-wave-days">
                  {row.stories.length} {row.stories.length === 1 ? "story" : "stories"} · {days(row.days)}
                </p>
                <p className="rm-reason">
                  <span className="rm-reason-label">{group.reasonLabel}: </span>
                  {inline(row.reason)}
                </p>
                <ol className="rm-stories">
                  {row.stories.map((story) => (
                    <li key={story.id} className={story.done ? "rm-story is-done" : "rm-story"}>
                      <a href={story.href} className="rm-story-id">
                        {story.id.replace(/^MVP1-/, "")}
                        {story.issue ? <span className="rm-issue"> #{story.issue}</span> : null}
                      </a>
                      <span className="rm-story-title">{story.title}</span>
                      <span className="rm-story-meta">
                        {story.done ? <span className="rm-done">Done</span> : null}
                        <span className="rm-size" title={story.days ? days(story.days) : "No size yet"}>
                          {story.size ?? "TBD"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>
      ))}

      <h3 className="section-subtitle">How the order was worked out</h3>
      <ul className="rm-list">
        {method.map((item) => (
          <li key={item.label}>
            {item.label ? <strong>{item.label}: </strong> : null}
            {inline(item.text)}
          </li>
        ))}
      </ul>

      <h3 className="section-subtitle">Risks and notes</h3>
      <ul className="rm-list">
        {risks.map((item) => (
          <li key={item}>{inline(item)}</li>
        ))}
      </ul>

      <p className="note section-footnote">
        Generated from <a href={`${REPO}/docs/process/ROADMAP.md`}>docs/process/ROADMAP.md</a> and the
        sizes in the epics files (S = {roadmap.personDaysPerSize.S}, M = {roadmap.personDaysPerSize.M},
        L = {roadmap.personDaysPerSize.L} person-days). A story shows as done once its issue is closed.
        Updated {roadmap.updated}.
      </p>
    </section>
  );
}
