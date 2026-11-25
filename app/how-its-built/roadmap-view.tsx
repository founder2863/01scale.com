import { Fragment, type ReactNode } from "react";
import { roadmap } from "./roadmap";

// The Roadmap tab of How It's Built (MVP1-E0-54): a vertical timeline (Nikhil, PR #189).
// Everything here comes from roadmap.ts, generated from docs/process/ROADMAP.md and the epics
// files by `npm run roadmap`.

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

type Group = (typeof roadmap.groups)[number];
type Row = Group["rows"][number];

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

// "0 Product documentation" -> { number: "0", name: "Product documentation" }
function split(name: string) {
  const m = name.match(/^(\d+)\s+(.*)$/);
  return m ? { number: m[1], name: m[2] } : { number: "", name };
}

function range(row: Row) {
  return "start" in row ? `Day ${row.start} to ${row.end}` : null;
}

function Stories({ row }: { row: Row }) {
  const done = row.stories.filter((s) => s.done).length;
  return (
    <details className="rm-details">
      <summary>
        {row.stories.length} {row.stories.length === 1 ? "story" : "stories"}
        {done ? `, ${done} done` : ""}
      </summary>
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
    </details>
  );
}

function Entry({ row, group }: { row: Row; group: Group }) {
  const { number, name } = split(row.name);
  const when = range(row);
  return (
    <li className={`rm-entry rm-entry-${group.kind}`}>
      <div className="rm-when">{when ?? (group.kind === "side" ? "Alongside" : "Later")}</div>
      <div className="rm-marker" aria-hidden="true">
        {number || "•"}
      </div>
      <article className="rm-body">
        <header className="rm-head">
          <h4 className="rm-title">
            {number ? <span className="visually-hidden">Wave {number}: </span> : null}
            {name}
          </h4>
          <span className={valueTone(row.value)}>{row.value} value</span>
        </header>
        <p className="rm-meta">
          {when ? <span className="rm-when-inline">{when} · </span> : null}
          {days(row.days)}
          {row.remainingDays !== row.days ? ` · ${row.remainingDays} left` : ""}
        </p>
        <p className="rm-reason">
          <span className="rm-reason-label">{group.reasonLabel}: </span>
          {inline(row.reason)}
        </p>
        <Stories row={row} />
      </article>
    </li>
  );
}

function Milestone({ label, day }: { label: string; day?: number }) {
  return (
    <li className="rm-entry rm-milestone">
      <div className="rm-when">{day ? `Day ${day}` : ""}</div>
      <div className="rm-marker" aria-hidden="true">
        ◆
      </div>
      <p className="rm-milestone-label">
        {label}
        {day ? <span className="rm-when-inline"> · day {day}</span> : null}
      </p>
    </li>
  );
}

export default function RoadmapView() {
  const { totals, groups, method, risks } = roadmap;
  const main = groups.find((g) => g.kind === "main");
  const others = groups.filter((g) => g.kind !== "main");
  const mainRows = main?.rows ?? [];
  const first = mainRows[0];
  const last = mainRows[mainRows.length - 1];

  return (
    <section id="roadmap">
      <h2 className="group-title">
        Roadmap <span className="status">Planned</span>
      </h2>
      <p className="note">
        What is left to build and in what order: by dependency first, then by value, with each
        story&apos;s size. Product documentation comes first, from requirements to architecture; then the
        main path builds the shortest way to a DocFlow a visitor can use from sign-in to delivery. Days
        are person-days counted from the start, one wave after another.
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
          <span className="stat-value">{main?.days ?? 0}</span>
          <span className="stat-label">Person-days to a working DocFlow</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.doneStories}</span>
          <span className="stat-label">Done</span>
        </div>
      </div>

      {main && (
        <>
          <h3 className="section-subtitle">The main path at a glance</h3>
          <ol className="rm-bar" aria-label="Main path waves, sized by person-days">
            {mainRows.map((row) => {
              const { number, name } = split(row.name);
              return (
                <li key={row.name} style={{ flexGrow: row.days }} title={`${row.name}: ${days(row.days)}`}>
                  <span className="rm-bar-number">{number}</span>
                  <span className="rm-bar-name">{name}</span>
                </li>
              );
            })}
          </ol>

          <h3 className="section-subtitle" id="rm-main">
            {main.title}{" "}
            <span className="rm-group-total">
              {main.storyCount} stories · {days(main.days)}
            </span>
          </h3>
          <ol className="rm-timeline" aria-labelledby="rm-main">
            {mainRows.map((row, i) => (
              <Fragment key={row.name}>
                <Entry row={row} group={main} />
                {i === 0 && first && "end" in first ? (
                  <Milestone label="Documentation complete: development starts" day={first.end} />
                ) : null}
              </Fragment>
            ))}
            {last && "end" in last ? (
              <Milestone label="DocFlow works end to end (MVP1)" day={last.end} />
            ) : null}
          </ol>
        </>
      )}

      {others.map((group) => (
        <Fragment key={group.kind}>
          <h3 className="section-subtitle" id={`rm-${group.kind}`}>
            {group.title}{" "}
            <span className="rm-group-total">
              {group.storyCount} stories · {days(group.days)}
            </span>
          </h3>
          <ol className="rm-timeline" aria-labelledby={`rm-${group.kind}`}>
            {group.rows.map((row) => (
              <Entry key={row.name} row={row} group={group} />
            ))}
          </ol>
        </Fragment>
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
