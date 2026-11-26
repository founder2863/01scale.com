import { Fragment, type ReactNode } from "react";
import { roadmap } from "./roadmap-v4";

// Roadmap v4 on How It's Built (MVP1-E0-54, MVP1-E8-12). A monthly roadmap for a team of three
// engineers and a product manager, with what each month achieves, planned twice: without and
// with Claude Code (Nikhil, PR #189). Everything here comes from roadmap.ts, generated from
// docs/process/roadmap/v4/ROADMAP.md, the epics files and docs/process/roadmap/v4/model.json by
// `npm run roadmap:v4`. v4 adds business readiness (epics MVP1-E10 to E15) before go-live, and each
// plan's chart ends when its work does.

const REPO = "https://github.com/founder2863/01scale.com/blob/main";
const HORIZON = 5; // months shown one by one; the rest share a last column

type Estimates = { productWithout: number; productWith: number; devWithout: number; devWith: number };
type PlanStory = {
  id: string;
  title: string;
  href: string;
  wave: string;
  person: string;
  start: number;
  end: number;
  startMonth: number;
  endMonth: number;
};
type PlanTask = { story: string; kind: "product" | "dev" | "joint"; wave: string; person: string; start: number; end: number };
type Plan = {
  daysPerMonth: number;
  tasks: PlanTask[];
  pmBlocked: { id: string; days: number }[];
  people: { name: string; pm: boolean; busyDays: number }[];
  endDay: number;
  months: number;
  stories: PlanStory[];
  milestones: { name: string; day: number; month: number }[];
  notPlanned: string[];
};
type Story = { id: string; title: string; href: string; issue: number | null; size: string | null; days: number | null; done: boolean; estimates: Estimates };
type Row = { name: string; value: string; reason: string; days: number; remainingDays: number; stories: Story[] };
type Group = { kind: string; title: string; reasonLabel: string; days: number; storyCount: number; rows: Row[] };

type Forecast = {
  milestones: { name: string; day: number; month: number; p50: number; p50Month: number; p90: number; p90Month: number }[];
  end: { day: number; month: number; p50: number; p50Month: number; p90: number; p90Month: number };
  runs: number;
};
const forecast = roadmap.forecast as unknown as { Without: Forecast; With: Forecast };
const sprint = roadmap.sprint;
const notReady = roadmap.readiness as unknown as { id: string; module: string | null; designDocs: boolean | null; openQuestions: string[] }[];
type Crew = { id: string; crew: number; days: number; sprints: number };
type Long = { id: string; who: string; days: number; sprints: number };

function Range({ m }: { m: { month: number; p50Month: number; p90Month: number } }) {
  return (
    <>
      Month {m.month}
      <span className="rm-range">
        {" "}
        · likely {m.p50Month} · worst {m.p90Month}
      </span>
    </>
  );
}

const groups = roadmap.groups as unknown as Group[];
const plans: { key: string; label: string; plan: Plan }[] = [
  { key: "without", label: "Without Claude Code", plan: roadmap.plan as unknown as Plan },
  { key: "with", label: "With Claude Code", plan: roadmap.planWithClaudeCode as unknown as Plan },
];
const model = roadmap.estimatesModel;
const estimateTotals = roadmap.estimateTotals as Estimates;
const waveOrder = groups.flatMap((g) => g.rows.map((r) => r.name));
const storyById = new Map(groups.flatMap((g) => g.rows.flatMap((r) => r.stories)).map((s) => [s.id, s]));

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

function num(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function days(n: number) {
  return `${num(n)} person-day${n === 1 ? "" : "s"}`;
}

function shortId(id: string) {
  return id.replace(/^MVP1-/, "");
}

// "0 Product documentation" -> { number: "0", name: "Product documentation" }
function split(name: string) {
  const m = name.match(/^(\d+[a-z]?)\s+(.*)$/);
  return m ? { number: m[1], name: m[2] } : { number: "", name };
}

// A colour family per kind of wave, so a wave reads the same on the board and in the charts.
function tone(wave: string) {
  const { number } = split(wave);
  if (number === "0") return "rm-tone-docs";
  if (number === "1" || number === "2") return "rm-tone-platform";
  if (number === "8") return "rm-tone-readiness";
  if (number) return "rm-tone-business";
  return "rm-tone-extra";
}

function endToEnd(plan: Plan) {
  return plan.milestones.find((m) => m.name.includes("end to end")) ?? plan.milestones[plan.milestones.length - 1];
}

function live(f: Forecast) {
  return f.milestones.find((m) => m.name.includes("live in production"));
}

// How much of the plan the product manager is busy, and where they held a story up.
function pmLoad(plan: Plan) {
  const pm = plan.people.find((p) => p.pm);
  const work = pm ? pm.busyDays : 0;
  const blockedDays = plan.pmBlocked.reduce((sum, b) => sum + b.days, 0);
  return { work, length: plan.endDay, percent: Math.round((work / Math.max(1, plan.endDay)) * 100), blocked: plan.pmBlocked.length, blockedDays };
}

function columnsFor(plan: Plan) {
  const cols: { from: number; to: number; label: string }[] = [];
  for (let m = 1; m <= Math.min(HORIZON, plan.months); m += 1) cols.push({ from: m, to: m, label: `Month ${m}` });
  if (plan.months > HORIZON) cols.push({ from: HORIZON + 1, to: plan.months, label: `Month ${HORIZON + 1} and later` });
  return cols;
}

function MonthColumn({ plan, from, to, label }: { plan: Plan; from: number; to: number; label: string }) {
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

function MonthBoard({ plan }: { plan: Plan }) {
  const cols = columnsFor(plan);
  return (
    <div className="rm-scroll" tabIndex={0} aria-label="Monthly roadmap, scrolls sideways on small screens">
      <div className="rm-months" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(200px, 1fr))` }}>
        {cols.map((c) => (
          <MonthColumn key={c.label} plan={plan} {...c} />
        ))}
      </div>
    </div>
  );
}

// Who does what, day by day: a row per person, the stories placed by their working days.
// Each plan's chart ends when its work does (v4, Nikhil): no empty months after it.
function TeamChart({ plan, months, label }: { plan: Plan; months: number; label: string }) {
  // The chart ends on the plan's last working day (v4).
  const total = Math.max(1, plan.endDay);
  return (
    <div className="rm-scroll" tabIndex={0} aria-label={`${label}: team chart, scrolls sideways on small screens`}>
      <div className="rm-team">
        <div className="rm-team-row rm-team-head" aria-hidden="true">
          <span className="rm-team-name" />
          <div className="rm-team-track">
            {Array.from({ length: months }, (_, i) => (
              <span
                key={i}
                className="rm-team-month"
                style={{ left: `${((i * plan.daysPerMonth) / total) * 100}%`, width: `${(plan.daysPerMonth / total) * 100}%` }}
              >
                Month {i + 1}
              </span>
            ))}
          </div>
        </div>
        {plan.people.map((person) => (
          <div key={person.name} className="rm-team-row">
            <span className="rm-team-name">
              {person.name}
              <span className="rm-team-busy">
                {num(person.busyDays)} days busy ({Math.round((person.busyDays / Math.max(1, plan.endDay)) * 100)}%)
              </span>
            </span>
            <div className="rm-team-track">
              {plan.tasks
                .filter((t) => t.person === person.name)
                .map((t) => {
                  const story = storyById.get(t.story);
                  const what = t.kind === "joint" ? "design session, product manager and engineer together" : t.kind === "product" ? "product work" : "development";
                  return (
                    <a
                      key={`${t.story}-${t.kind}`}
                      href={story?.href}
                      className={`rm-team-bar ${tone(t.wave)}${t.kind === "joint" ? " is-joint" : ""}`}
                      style={{ left: `${(t.start / total) * 100}%`, width: `${((t.end - t.start) / total) * 100}%` }}
                      title={`${t.story} ${story?.title ?? ""}: ${what}, day ${num(Math.round(t.start * 4) / 4)} to ${num(Math.round(t.end * 4) / 4)}`}
                    >
                      {shortId(t.story)}
                    </a>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Wave({ row, group }: { row: Row; group: Group }) {
  const { number, name } = split(row.name);
  const mine = plans[0].plan.stories.filter((s) => s.wave === row.name);
  const when = mine.length
    ? (() => {
        const a = Math.min(...mine.map((s) => s.startMonth));
        const b = Math.max(...mine.map((s) => s.endMonth));
        return a === b ? `Month ${a}` : `Month ${a} to ${b}`;
      })()
    : null;
  const t = row.stories.reduce(
    (acc, s) => ({
      p0: acc.p0 + s.estimates.productWithout,
      p1: acc.p1 + s.estimates.productWith,
      d0: acc.d0 + s.estimates.devWithout,
      d1: acc.d1 + s.estimates.devWith,
    }),
    { p0: 0, p1: 0, d0: 0, d1: 0 },
  );
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
          <span className="rm-when-inline">{when ?? "Not planned"} (without Claude Code) · </span>
          {days(row.days)} · product {num(t.p0)} → {num(t.p1)}, development {num(t.d0)} → {num(t.d1)} with Claude Code
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
                <span className="rm-story-est">
                  Product {num(story.estimates.productWithout)} → {num(story.estimates.productWith)} · Development{" "}
                  {num(story.estimates.devWithout)} → {num(story.estimates.devWith)} days
                </span>
              </li>
            ))}
          </ol>
        </details>
      </article>
    </li>
  );
}

export default function RoadmapV4View() {
  const { totals, method, risks } = roadmap;
  const [without, withCc] = plans;
  const engineers = without.plan.people.filter((p) => !p.pm).length;
  const pms = without.plan.people.length - engineers;
  const loads = { without: pmLoad(without.plan), with: pmLoad(withCc.plan) };
  const notPlanned = without.plan.notPlanned.map((id) => storyById.get(id)).filter((s): s is Story => Boolean(s));
  const f = model.with_claude_code_factor;

  return (
    <section id="roadmap">
      <h2 className="group-title">The plan</h2>
      <p className="note">
        What is left to build, month by month, for a team of {engineers} engineers and {pms} product
        manager, in one-week sprints, planned twice: without Claude Code and with it, all the way to live in
        production and the weeks after. Engineers pull only ready stories, several engineers share a story
        longer than a sprint, and the dates come with a likely and a worst case. Each person takes the most urgent story
        that is ready, so whatever can run in parallel does, and spare engineer time goes to spikes.
        Product documentation, from requirements to architecture, is done before the business steps are
        built; the platform foundation is built alongside it. A month is {without.plan.daysPerMonth} working
        days.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-value">
            {engineers} + {pms}
          </span>
          <span className="stat-label">Engineers + product manager</span>
        </div>
        <div className="stat">
          <span className="stat-value">Month {live(forecast.Without)?.month}</span>
          <span className="stat-label">
            Live in production without Claude Code (likely {live(forecast.Without)?.p50Month}, worst{" "}
            {live(forecast.Without)?.p90Month})
          </span>
        </div>
        <div className="stat">
          <span className="stat-value">Month {live(forecast.With)?.month}</span>
          <span className="stat-label">
            Live in production with Claude Code (likely {live(forecast.With)?.p50Month}, worst {live(forecast.With)?.p90Month})
          </span>
        </div>
        <div className="stat">
          <span className="stat-value">
            {num(estimateTotals.productWithout + estimateTotals.devWithout)} → {num(estimateTotals.productWith + estimateTotals.devWith)}
          </span>
          <span className="stat-label">Person-days in {totals.stories} stories, with Claude Code</span>
        </div>
      </div>

      <h3 className="section-subtitle">Forecast: without and with Claude Code</h3>
      <p className="note">
        Each milestone&apos;s month if no story rolls over, the <strong>likely</strong> month (half of{" "}
        {forecast.Without.runs} simulated plans finish by it) and the <strong>worst</strong> case (nine in ten
        finish by it). In the simulation {Math.round(sprint.rollover_rates.once * 100)}% of stories roll over
        once and {Math.round(sprint.rollover_rates.twice * 100)}% twice, keeping their crew{" "}
        {sprint.rollover_sprint_fraction === 0.5 ? "half a sprint" : `${sprint.rollover_sprint_fraction} of a sprint`} more each
        time. Rollovers reorder the work, so a likely month can come before the no-rollover month.
      </p>
      <div className="rm-compare-wrap">
        <table className="cost-table cost-table-text rm-compare">
          <thead>
            <tr>
              <th scope="col">Milestone</th>
              <th scope="col">Without Claude Code</th>
              <th scope="col">With Claude Code</th>
            </tr>
          </thead>
          <tbody>
            {forecast.Without.milestones.map((m, i) => (
              <tr key={m.name}>
                <th scope="row">{m.name}</th>
                <td data-label="Without Claude Code">
                  <Range m={m} />
                </td>
                <td data-label="With Claude Code">
                  <Range m={forecast.With.milestones[i]} />
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">Everything planned</th>
              <td data-label="Without Claude Code">
                <Range m={forecast.Without.end} />
              </td>
              <td data-label="With Claude Code">
                <Range m={forecast.With.end} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="section-subtitle">Sprint rules</h3>
      <ul className="rm-list">
        <li>{sprint.why}</li>
        <li>{sprint.swarm_why}</li>
        <li>{sprint.rollover_why}</li>
        <li>{sprint.decision_why}</li>
      </ul>

      <div className="rm-version-grid">
        <div className="card rm-version-card">
          <h4 className="card-title">Not ready yet</h4>
          {notReady.length ? (
            <ul className="rm-list">
              {notReady.map((r) => (
                <li key={r.id}>
                  <a href={storyById.get(r.id)?.href}>{shortId(r.id)}</a> {storyById.get(r.id)?.title}:{" "}
                  {r.designDocs === false ? `the ${r.module} design documents are missing. ` : ""}
                  {r.openQuestions.length ? <>open question: {inline(r.openQuestions[0])} It gets a decision session first.</> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">Every planned story is ready.</p>
          )}
        </div>
        <div className="card rm-version-card">
          <h4 className="card-title">Stories bigger than a sprint (without Claude Code)</h4>
          <ul className="rm-list">
            {(without.plan as unknown as { crews: Crew[] }).crews.map((c) => (
              <li key={c.id}>
                <a href={storyById.get(c.id)?.href}>{shortId(c.id)}</a> {storyById.get(c.id)?.title}: {c.crew} engineers,{" "}
                {num(Math.round(c.days * 10) / 10)} days{c.sprints > 1 ? ", still two sprints (a planned rollover)" : ""}
              </li>
            ))}
            {(without.plan as unknown as { longStories: Long[] }).longStories
              .filter((l) => l.who === "product manager")
              .map((l) => (
                <li key={l.id}>
                  <a href={storyById.get(l.id)?.href}>{shortId(l.id)}</a> {storyById.get(l.id)?.title}: the product manager
                  alone, {num(Math.round(l.days * 10) / 10)} days, two sprints
                </li>
              ))}
          </ul>
        </div>
      </div>

      <p className="note">
        <strong>Assumptions (Nikhil, PR #193):</strong> during a sprint the product manager spends{" "}
        {Math.round(model.product_share_of_engineering_story * 100)}% of an engineering story&apos;s size on it
        before the engineer starts. A quarter of every design story ({Math.round(model.joint_share_of_design_story * 100)}%)
        is design discussions and reviews that the product manager and an engineer do together. With Claude Code,
        product and development work both take {Math.round(f.development * 100)}% of the time (2.5 times faster):
        people still review, test and decide. All of it is set in <code>docs/process/roadmap/v4/model.json</code>.
      </p>

      {plans.map(({ key, label, plan }) => (
        <Fragment key={key}>
          <h3 className="section-subtitle">
            Who does what · {label} <span className="rm-group-total">{plan.endDay} working days</span>
          </h3>
          <TeamChart plan={plan} months={plan.months} label={label} />
        </Fragment>
      ))}
      <p className="rm-legend">
        <span className="rm-tone-docs">Documentation</span>
        <span className="rm-tone-platform">Platform foundation and identity</span>
        <span className="rm-tone-business">Business steps</span>
        <span className="rm-tone-readiness">Business readiness</span>
        <span className="rm-tone-extra">Spikes, extras and hardening</span>
        <span className="rm-legend-joint">Striped: product manager and engineer together</span>
      </p>
      <p className="note">
        <strong>Where the product manager held a story up:</strong> {loads.without.blocked} stories,{" "}
        {num(Math.round(loads.without.blockedDays))} days in all without Claude Code; {loads.with.blocked} stories,{" "}
        {num(Math.round(loads.with.blockedDays))} days with it. A story is held up when everything it waits for
        is done but its sprint product work is not, because the product manager is in the middle of other
        work. The product manager is busy {loads.without.percent}% of the plan without Claude Code and{" "}
        {loads.with.percent}% with it.{" "}
        {loads.without.percent >= 90
          ? "The product manager now sets the end date: the business readiness work fills their time, while engineers have gaps."
          : "What sets the end date is the chain of dependencies (review, then results, then delivery), which leaves engineers with gaps late in the plan for spikes and extras."}{" "}
        Most held up:{" "}
        {without.plan.pmBlocked.slice(0, 5).map((b, i) => (
          <Fragment key={b.id}>
            {i ? ", " : ""}
            {shortId(b.id)} ({num(Math.round(b.days * 4) / 4)} days)
          </Fragment>
        ))}
        .
      </p>

      <h3 className="section-subtitle">Month by month</h3>
      <p className="note">
        Each month: what is achieved by its end, then the stories worked on, by wave. ✓ finishes that
        month; → carries on into the next.
      </p>
      <div className="rm-switch">
        <input type="radio" name="rm-plan" id="rm-plan-without" className="rm-switch-input" defaultChecked />
        <label htmlFor="rm-plan-without">{without.label}</label>
        <input type="radio" name="rm-plan" id="rm-plan-with" className="rm-switch-input" />
        <label htmlFor="rm-plan-with">{withCc.label}</label>
        <div className="rm-panel rm-panel-without">
          <MonthBoard plan={without.plan} />
        </div>
        <div className="rm-panel rm-panel-with">
          <MonthBoard plan={withCc.plan} />
        </div>
      </div>

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

      <p className="note">
        Every story&apos;s four estimates and planned months, for reports:{" "}
        <a href={`${REPO}/docs/process/roadmap/v4/estimates.csv`}>docs/process/roadmap/v4/estimates.csv</a>.
      </p>

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
        Generated from <a href={`${REPO}/docs/process/roadmap/v4/ROADMAP.md`}>docs/process/roadmap/v4/ROADMAP.md</a>, the sizes in
        the epics files (S = {roadmap.personDaysPerSize.S}, M = {roadmap.personDaysPerSize.M}, L ={" "}
        {roadmap.personDaysPerSize.L} person-days, the estimate without Claude Code) and{" "}
        <code>docs/process/roadmap/v4/model.json</code>. A story shows as done once its issue is closed. Updated{" "}
        {roadmap.updated}.
      </p>
    </section>
  );
}
