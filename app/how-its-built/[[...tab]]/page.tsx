import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { costs } from "../costs";
import { designSkillCount, rulesHref, skillOrder, skills } from "../skills";
import { builtTabs, type BuiltTab } from "../tabs";

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

function usd(value: number | null) {
  return value === null ? "pending" : `$${value.toFixed(2)}`;
}

function mtok(value: number) {
  return `${(value / 1_000_000).toFixed(1)}M`;
}

type Params = { tab?: string[] };

// The per-token rates Claude Code used, one row per model, fitted from its own cost snapshots.
const RATES = [
  { model: "Claude Opus 5.5", input: "$4", output: "$20", cacheRead: "$0.20", cacheWrite: "$8" },
  { model: "Claude Fable 5.2", input: "$8", output: "$40", cacheRead: "$0.20", cacheWrite: "$16" },
];

// Three addresses: /how-its-built (Skills, the default), /token-costs and /agents.
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return [{ tab: [] }, ...builtTabs.slice(1).map((item) => ({ tab: [item.slug] }))];
}

function resolve(params: Params): BuiltTab | null {
  // "/how-its-built/skills" is not a real address: Skills lives at "/how-its-built".
  if ((params.tab?.length ?? 0) > 1 || params.tab?.[0] === "skills") return null;
  const found = builtTabs.find((item) => item.slug === (params.tab?.[0] ?? "skills"));
  return found ? found.slug : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const tab = resolve(await params);
  const label = builtTabs.find((item) => item.slug === tab)?.label;
  return {
    title: tab === "skills" ? "How It's Built — 01scale" : `How It's Built · ${label} — 01scale`,
    description:
      "The skills and agents I use to build 01scale with Claude Code: repeatable work written down, kept in the repository and run the same way every time.",
  };
}

export default async function HowItsBuilt({ params }: { params: Promise<Params> }) {
  const tab = resolve(await params);
  if (!tab) notFound();
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Working with AI</p>
          <h1>How It&apos;s Built</h1>
          <p className="lead">
            I build 01scale with Claude Code. The work I repeat is written
            down as skills and agents, kept in the repository, and run the
            same way every time.
          </p>
          <p className="hero-meta">
            <span>{skills.length} skills</span>
            <span>Agents coming soon</span>
            <span>{usd(costs.totals.cost)} spent so far</span>
          </p>
        </div>
      </section>

      <div className="container">
        <nav className="page-tabs" aria-label="How It's Built sections">
          {builtTabs.map((item) => (
            <Link key={item.slug} href={item.href} aria-current={item.slug === tab ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="container content">
        {tab === "skills" && (
        <section id="skills">
          <h2 className="group-title">
            Skills <span className="status">In use</span>
          </h2>
          <p className="note">
            A skill is a playbook for one task: what to read first, what to
            produce, the rules that are easy to get wrong, and the checks that
            say it is done. Each one is a plain text file anyone can read.
          </p>
          <p className="note">
            Designing a module means producing the same seven documents each
            time, so I split that work into one skill per document, plus one
            that runs them in order, {designSkillCount} in all. A ninth records
            what each story cost, and a tenth reviews the whole design as an
            architect, across every module. They were written from how the{" "}
            <Link href="/products/login-using-aws">Login using AWS</Link>{" "}
            module was designed, then used to design every other MVP1 module.
          </p>

          <h3 className="section-subtitle">The order they run in</h3>
          <ol className="skill-order">
            {skillOrder.map((item) => (
              <li key={item.step}>
                <strong>{item.step}</strong>
                {item.text}
              </li>
            ))}
          </ol>

          <ul className="skill-grid">
            {skills.map((skill) => (
              <li key={skill.id}>
                <article className="skill-card">
                  <h3>
                    {skill.name}
                    <span className="status">{skill.kind}</span>
                  </h3>
                  <code>{skill.id}</code>
                  <p>{skill.job}</p>
                  <dl>
                    <dt>Reads</dt>
                    <dd>{skill.reads}</dd>
                    <dt>Produces</dt>
                    <dd>{skill.makes}</dd>
                  </dl>
                  <a href={skill.href}>Read the skill →</a>
                </article>
              </li>
            ))}
          </ul>

          <p className="note section-footnote">
            The design skills follow one set of <a href={rulesHref}>shared design rules</a>, so
            they cannot drift apart: the stories are the source, nothing is
            invented to fill a gap, and one file per module feeds both the
            documents and this site.
          </p>
        </section>
        )}

        {tab === "token-costs" && (
        <section id="token-costs">
          <h2 className="group-title">
            Token Costs <span className="status">Updated {costs.updated}</span>
          </h2>
          <p className="note">
            A running total of what each story cost to build with Claude Code,
            split into build, rework and scaffolding. The numbers are measured
            from the session record, using the cost Claude Code computes
            itself; only the assignment of each request to a story is mine.
          </p>

          <div className="card cost-baseline">
            <p className="card-title">Cost baselines</p>
            {RATES.map((rate) => (
              <div className="rate-model" key={rate.model}>
                <p className="rate-model-name">{rate.model}</p>
                <ul className="rate-tiles">
                  <li>
                    <span className="rate-value">{rate.input}</span>
                    <span className="rate-label">per million input tokens</span>
                  </li>
                  <li>
                    <span className="rate-value">{rate.output}</span>
                    <span className="rate-label">per million output</span>
                  </li>
                  <li>
                    <span className="rate-value">{rate.cacheRead}</span>
                    <span className="rate-label">per million read from the cache</span>
                  </li>
                  <li>
                    <span className="rate-value">{rate.cacheWrite}</span>
                    <span className="rate-label">per million written to the cache</span>
                  </li>
                </ul>
              </div>
            ))}
          </div>

          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{usd(costs.totals.cost)}</span>
              <span className="stat-label">Total so far</span>
            </div>
            <div className="stat">
              <span className="stat-value">{usd(costs.totals.buildCost)}</span>
              <span className="stat-label">Build</span>
            </div>
            <div className="stat">
              <span className="stat-value">{usd(costs.totals.reworkCost)}</span>
              <span className="stat-label">Rework</span>
            </div>
            <div className="stat">
              <span className="stat-value">{usd(costs.totals.scaffoldingCost)}</span>
              <span className="stat-label">Scaffolding</span>
            </div>
            <div className="stat">
              <span className="stat-value">{costs.totals.storyYield}%</span>
              <span className="stat-label">Token yield across stories</span>
            </div>
          </div>

          <h3 className="section-subtitle">Per story</h3>
          <table className="cost-table">
            <thead>
              <tr>
                <th scope="col">Story</th>
                <th scope="col">Tokens</th>
                <th scope="col">Build cost</th>
                <th scope="col">Rework cost</th>
                <th scope="col">Total</th>
                <th scope="col">Token yield</th>
              </tr>
            </thead>
            <tbody>
              {costs.stories.map((story) => (
                <tr key={story.key}>
                  <th scope="row">{story.name}</th>
                  <td data-label="Tokens">{mtok(story.buildTokens + story.reworkTokens)}</td>
                  <td data-label="Build cost">{usd(story.buildCost)}</td>
                  <td data-label="Rework cost">{usd(story.reworkCost)}</td>
                  <td data-label="Total">
                    {usd(story.totalCost)}
                    {story.pending && <span className="cost-pending"> + pending</span>}
                  </td>
                  <td data-label="Token yield">
                    <span className="yield">
                      <span className="yield-bar" style={{ width: `${story.yield ?? 0}%` }} />
                    </span>
                    {story.yield}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="section-subtitle">Scaffolding, not tied to a story</h3>
          <table className="cost-table cost-table-small">
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Requests</th>
                <th scope="col">Tokens</th>
                <th scope="col">Cost</th>
              </tr>
            </thead>
            <tbody>
              {costs.scaffolding.map((area) => (
                <tr key={area.name}>
                  <th scope="row">{area.name}</th>
                  <td data-label="Requests">{area.requests}</td>
                  <td data-label="Tokens">{mtok(area.tokens)}</td>
                  <td data-label="Cost">{usd(area.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="section-subtitle">What the numbers show</h3>
          <div className="cards">
            <div className="card">
              <p className="card-title">Reloading context costs more than writing answers</p>
              <p>
                {usd(costs.byKind.cache_write ?? null)} of {usd(costs.totals.cost)} went
                into loading the conversation into the model&apos;s cache, and{" "}
                {usd(costs.byKind.output ?? null)} into the answers themselves. After a
                break of more than an hour the whole conversation is loaded
                again, which is why a short question can cost several dollars.
              </p>
            </div>
            <div className="card">
              <p className="card-title">Rework is where decisions changed</p>
              <p>
                The biggest rework was redoing every story&apos;s API and database
                design when I moved to separate services. Changing a decision
                after design is cheaper than after code, but it is not free.
              </p>
            </div>
            <div className="card">
              <p className="card-title">Discovery is a real cost</p>
              <p>
                Questions, product discovery and tooling problems account for{" "}
                {usd(costs.totals.scaffoldingCost)}. It is the price of deciding
                what to build, and it is tracked so it can be managed.
              </p>
            </div>
          </div>

          <dl className="decisions cost-definitions">
            <div>
              <dt>Build</dt>
              <dd>Work that produced something kept.</dd>
            </div>
            <div>
              <dt>Rework</dt>
              <dd>
                Work that changed or fixed something already delivered for the
                same story, because a requirement changed or a mistake was found.
              </dd>
            </div>
            <div>
              <dt>Scaffolding</dt>
              <dd>Work tied to no story: questions, discovery, tooling and process.</dd>
            </div>
            <div>
              <dt>Token yield</dt>
              <dd>
                A story&apos;s build tokens divided by its build plus rework
                tokens. 100% means everything spent on it was kept the first time.
              </dd>
            </div>
          </dl>
          <p className="note">
            Tokens include context re-read from the cache, which is most of the
            volume but the cheapest part. Costs are what an API customer would
            pay at the rates Claude Code used; a subscription bills differently.{" "}
            {costs.totals.pendingRequests > 0 &&
              "Requests marked pending had not been priced by the tool when this was updated. "}
            <a href={`${REPO}/docs/process/TOKEN-COSTS.md`}>The full ledger and method</a>.
          </p>
        </section>
        )}

        {tab === "agents" && (
        <section id="agents">
          <h2 className="group-title">Agents</h2>
          <div className="coming-soon">
            <p className="coming-soon-title">Coming Soon...</p>
            <p>
              Agents are specialists with one job each, such as reviewing a
              change against the architecture decisions. The agents I use to
              build 01scale, and what each one caught, will appear here.
            </p>
          </div>
        </section>
        )}
      </div>
    </>
  );
}
