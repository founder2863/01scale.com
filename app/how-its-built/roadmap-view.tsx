import { Fragment, type ReactNode } from "react";
import { roadmap } from "./roadmap";

// The Roadmap tab of How It's Built (MVP1-E0-54). A monthly roadmap for a team of three
// engineers and a product manager, with what each month achieves (Nikhil, PR #189).
// Everything here comes from roadmap.ts, generated from docs/process/ROADMAP.md and the
// epics files by `npm run roadmap`, which also plans the team.

const REPO = "https://github.com/founder2863/01scale.com/blob/main";
const HORIZON = 5; // months shown one by one; the rest share a last column

type Group = (typeof roadmap.groups)[number];
type Row = Group["rows"][number];
type Planned = (typeof roadmap.plan.stories)[number];

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

function shortId(id: string) {
  return id.replace(/^MVP1-/, "");
}

// "0 Product documentation" -> { number: "0", name: "Product documentation" }
function split(name: string) {
  const m = name.match(/^(\d+[a-z]?)\s+(.*)$/);
  return m ? { number: m[1], name: m[2] } : { number: "", name };
}

// A colour family per kind of wave, so a wave reads the same on the board and in the team chart.
function tone(wave: string) {
  const { number } = split(wave);
  if (number === "0") return "rm-tone-docs";
  if (number === "1" || number === "2") return "rm-tone-platform";
  if (number) return "rm-tone-business";
  return "rm-tone-extra";
}

const plan = roadmap.plan;
const waveOrder: string[] = roadmap.groups.flatMap((g) => g.rows.map((r) => r.name));

// The months shown as columns: 1 to HORIZON, then one column for the rest.
const columns = (() => {
  const cols: { from: number; to: number; label: string }[] = [];
  for (let m = 1; m <= Math.min(HORIZON, plan.months); m += 1) cols.push({ from: m, to: m, label: `Month ${m}` });
  if (plan.months > HORIZON) cols.push({ from: HORIZON + 1, to: plan.months, label: `Month ${HORIZON + 1} and later` });
  return cols;
})();

function waveMonths(row: Row) {
  const mine = plan.stories.filter((s) => s.wave === row.name);
  if (!mine.length) return null;
  const a = Math.min(...mine.map((s) => s.startMonth));
  const b = Math.max(...mine.map((s) => s.endMonth));
  return a === b ? `Month ${a}` : `Month ${a} to ${b}`;
}

function MonthColumn({ from, to, label }: { from: number; to: number; label: string }) {
  const achieved = plan.milestones.filter((m) => m.month >= from && m.month <= to);
  const active = plan.stories.filter((s) => s.startMonth <= to && s.endMonth >= from);
  const waves = waveOrder.filter((w) => active.some((s) => s.wave === w));
  return (
    <section className="rm-month" aria-label={label}>
      <h4 className="rm-month-title">{label}</h4>
      <div className="rm-achieved">
        <p className="rm-achieved-label">Achieved</p>
        {achieved.length ? (
          <ul>
            {achieved.map((m) => (
              <li key={m.name}>{m.name}</li>
            ))}
          </ul>
        ) : (
          <p className="rm-achieved-none">Work in progress, no milestone yet</p>
        )}
      </div>
      {waves.map((wave) => (
        <div key={wave} className={`rm-month-wave ${tone(wave)}`}>
          <p className="rm-month-wave-name">{split(wave).name}</p>
          <ul className="rm-chips">
            {active
              .filter((s) => s.wave === wave)
              .map((s) => {
                const finishes = s.endMonth <= to;
                return (
                  <li
                    key={s.id}
                    className={finishes ? "rm-chip" : "rm-chip is-ongoing"}
                    title={`${s.title} · ${s.person} · day ${s.start} to ${s.end}`}
                  >
                    <a href={s.href}>{shortId(s.id)}</a>
                    <span className="rm-chip-title">{s.title}</span>
                    <span className="rm-chip-state" aria-label={finishes ? "finishes" : "carries on"}>
                      {finishes ? "✓" : "→"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </section>
  );
}

// Who does what, day by day: a row per person, the stories placed by their working days.
function TeamChart() {
  const total = plan.months * plan.daysPerMonth;
  return (
    <div className="rm-scroll" tabIndex={0} aria-label="Team chart, scrolls sideways on small screens">
      <div className="rm-team">
        <div className="rm-team-row rm-team-head" aria-hidden="true">
          <span className="rm-team-name" />
          <div className="rm-team-track">
            {Array.from({ length: plan.months }, (_, i) => (
              <span key={i} className="rm-team-month" style={{ left: `${(i / plan.months) * 100}%`, width: `${100 / plan.months}%` }}>
                Month {i + 1}
              </span>
            ))}
          </div>
        </div>
        {plan.people.map((person) => (
          <div key={person.name} className="rm-team-row">
            <span className="rm-team-name">
              {person.name}
              <span className="rm-team-busy">{person.busyDays} days of work</span>
            </span>
            <div className="rm-team-track">
              {plan.stories
                .filter((s) => s.person === person.name)
                .map((s: Planned) => (
                  <a
                    key={s.id}
                    href={s.href}
                    className={`rm-team-bar ${tone(s.wave)}`}
                    style={{ left: `${((s.start - 1) / total) * 100}%`, width: `${((s.end - s.start + 1) / total) * 100}%` }}
                    title={`${s.id} ${s.title}: day ${s.start} to ${s.end}`}
                  >
                    {shortId(s.id)}
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Wave({ row, group }: { row: Row; group: Group }) {
  const { number, name } = split(row.name);
  const when = waveMonths(row);
  return (
    <li className={`rm-entry rm-entry-${group.kind}`}>
      <div className="rm-when">{when ?? "Not planned"}</div>
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
          <span className="rm-when-inline">{when ?? "Not planned"} · </span>
          {days(row.days)}
          {row.remainingDays !== row.days ? ` · ${row.remainingDays} left` : ""}
        </p>
        <p className="rm-reason">
          <span className="rm-reason-label">{group.reasonLabel}: </span>
          {inline(row.reason)}
        </p>
        <details className="rm-details">
          <summary>
            {row.stories.length} {row.stories.length === 1 ? "story" : "stories"}
          </summary>
          <ol className="rm-stories">
            {row.stories.map((story) => (
              <li key={story.id} className={story.done ? "rm-story is-done" : "rm-story"}>
                <a href={story.href} className="rm-story-id">
                  {shortId(story.id)}
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
      </article>
    </li>
  );
}

export default function RoadmapView() {
  const { totals, groups, method, risks } = roadmap;
  const engineers = plan.people.filter((p) => !p.pm).length;
  const pms = plan.people.length - engineers;
  const endToEnd = plan.milestones.reduce((a, b) => (b.day > a.day ? b : a), plan.milestones[0]);
  const notPlannedIds: readonly string[] = plan.notPlanned;
  type StoryLink = { id: string; title: string; href: string };
  const allStories = (groups as unknown as { rows: { stories: StoryLink[] }[] }[]).flatMap((g) => g.rows.flatMap((r) => r.stories));
  const notPlanned = allStories.filter((s) => notPlannedIds.includes(s.id));

  return (
    <section id="roadmap">
      <h2 className="group-title">
        Roadmap <span className="status">Planned</span>
      </h2>
      <p className="note">
        What is left to build, month by month, for a team of {engineers} engineers and {pms} product
        manager. Each person takes the most urgent story that is ready, so whatever can run in parallel
        does. Product documentation, from requirements to architecture, is done before the business
        steps are built; the platform foundation is built alongside it. A month is {plan.daysPerMonth}{" "}
        working days.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">
            {engineers} + {pms}
          </span>
          <span className="stat-label">Engineers + product manager</span>
        </div>
        <div className="stat">
          <span className="stat-value">Month {endToEnd?.month}</span>
          <span className="stat-label">DocFlow works end to end</span>
        </div>
        <div className="stat">
          <span className="stat-value">{plan.months} months</span>
          <span className="stat-label">Everything planned</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totals.days}</span>
          <span className="stat-label">Person-days in {totals.stories} stories</span>
        </div>
      </div>

      <h3 className="section-subtitle">Month by month</h3>
      <p className="note">
        Each month: what is achieved by its end, then the stories worked on, by wave. ✓ finishes that
        month; → carries on into the next.
      </p>
      <div className="rm-scroll" tabIndex={0} aria-label="Monthly roadmap, scrolls sideways on small screens">
        <div className="rm-months" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
          {columns.map((c) => (
            <MonthColumn key={c.label} {...c} />
          ))}
        </div>
      </div>

      <h3 className="section-subtitle">Who does what</h3>
      <TeamChart />
      <p className="rm-legend">
        <span className="rm-tone-docs">Documentation</span>
        <span className="rm-tone-platform">Platform foundation and identity</span>
        <span className="rm-tone-business">Business steps</span>
        <span className="rm-tone-extra">Extras and hardening</span>
      </p>

      {groups.map((group) => (
        <Fragment key={group.kind}>
          <h3 className="section-subtitle" id={`rm-${group.kind}`}>
            {group.title}{" "}
            <span className="rm-group-total">
              {group.storyCount} stories · {days(group.days)}
            </span>
          </h3>
          <ol className="rm-timeline" aria-labelledby={`rm-${group.kind}`}>
            {group.rows.map((row) => (
              <Wave key={row.name} row={row} group={group} />
            ))}
          </ol>
        </Fragment>
      ))}

      {notPlanned.length > 0 && (
        <>
          <h3 className="section-subtitle">Not planned</h3>
          <p className="note">
            {notPlanned.map((s, i) => (
              <Fragment key={s.id}>
                {i ? ", " : ""}
                <a href={s.href}>{shortId(s.id)}</a> {s.title}
              </Fragment>
            ))}
            . Built already or waiting for Nikhil&apos;s go.
          </p>
        </>
      )}

      <h3 className="section-subtitle">How the plan was worked out</h3>
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
