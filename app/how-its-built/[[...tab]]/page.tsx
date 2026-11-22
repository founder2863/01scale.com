import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { costs } from "../costs";
import { constraints, paid, perExtraction, providers, providersTotal } from "../running-costs";
import { designSkillCount, rulesHref, skillOrder, skills } from "../skills";
import { builtTabs, type BuiltTab } from "../tabs";
import { findMistake, mistakes } from "../mistakes";
import { articleDomains, articleHtml, articles, findArticle } from "../articles";
import YieldExplainer from "../yield-explainer";

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

// One address per tab (Skills, the default, is /how-its-built), plus one per expensive mistake
// and one per published article (MVP1-E0-47).
export const dynamicParams = false;

// Each expensive mistake also has its own article page: /how-its-built/expensive-mistakes/<slug>.
export function generateStaticParams(): Params[] {
  return [
    { tab: [] },
    ...builtTabs.slice(1).map((item) => ({ tab: [item.slug] })),
    ...mistakes.map((item) => ({ tab: ["expensive-mistakes", item.slug] })),
    ...articles.map((item) => ({ tab: ["expensive-mistakes", item.slug] })),
  ];
}

function resolve(params: Params): BuiltTab | null {
  // "/how-its-built/skills" is not a real address: Skills lives at "/how-its-built".
  const depth = params.tab?.length ?? 0;
  if (depth > 2 || params.tab?.[0] === "skills") return null;
  if (depth === 2) {
    const slug = params.tab?.[1] ?? "";
    return params.tab?.[0] === "expensive-mistakes" && (findMistake(slug) || findArticle(slug)) ? "expensive-mistakes" : null;
  }
  const found = builtTabs.find((item) => item.slug === (params.tab?.[0] ?? "skills"));
  return found ? found.slug : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = await params;
  const tab = resolve(resolved);
  const article = resolved.tab?.[1] ? findMistake(resolved.tab[1]) ?? findArticle(resolved.tab[1]) : undefined;
  const label = article?.title ?? builtTabs.find((item) => item.slug === tab)?.label;
  return {
    title: tab === "skills" ? "How It's Built — 01scale" : `How It's Built · ${label} — 01scale`,
    description:
      "The skills and agents I use to build 01scale with Claude Code: repeatable work written down, kept in the repository and run the same way every time.",
  };
}

export default async function HowItsBuilt({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  const tab = resolve(resolved);
  if (!tab) notFound();
  const article = resolved.tab?.[1] ? findMistake(resolved.tab[1]) : undefined;
  const lesson = resolved.tab?.[1] ? findArticle(resolved.tab[1]) : undefined;
  const lessonHtml = lesson ? articleHtml(lesson) : null;
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
              <span className="stat-value">{mtok(costs.totals.tokens)}</span>
              <span className="stat-label">Total tokens so far</span>
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

          <YieldExplainer />

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
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td data-label="Tokens">{mtok(costs.storyTotals.tokens)}</td>
                <td data-label="Build cost">{usd(costs.storyTotals.buildCost)}</td>
                <td data-label="Rework cost">{usd(costs.storyTotals.reworkCost)}</td>
                <td data-label="Total">
                  {usd(costs.storyTotals.cost)}
                  {costs.storyTotals.pending && <span className="cost-pending"> + pending</span>}
                </td>
                <td data-label="Token yield">{costs.storyTotals.yield}%</td>
              </tr>
            </tfoot>
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
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td data-label="Requests">{costs.scaffoldingTotals.requests}</td>
                <td data-label="Tokens">{mtok(costs.scaffoldingTotals.tokens)}</td>
                <td data-label="Cost">{usd(costs.scaffoldingTotals.cost)}</td>
              </tr>
            </tfoot>
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

        {tab === "expensive-mistakes" && !article && !lesson && (
        <section id="expensive-mistakes">
          <h2 className="group-title">Expensive Mistakes</h2>
          <p className="note">
            Mistakes I paid for, what each one cost and what I do differently now. The costs in
            this project are measured from the token ledger, never typed in.
          </p>
          <h3 className="section-subtitle">In this project</h3>
          <ul className="mistake-list">
            {mistakes.map((item) => (
              <li key={item.slug}>
                <Link className="card mistake-card" href={`/how-its-built/expensive-mistakes/${item.slug}`}>
                  <span className="card-title">{item.title}</span>
                  <span className="mistake-cost">{item.cost}</span>
                  <span>{item.oneLine}</span>
                  <span className="mistake-more">Read the lesson →</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="section-subtitle">From my career</h3>
          <div className="coming-soon">
            <p className="coming-soon-title">Coming Soon...</p>
            <p>Lessons from the platforms and products I led before 01scale.</p>
          </div>
          {articleDomains.map((group) => (
            <div key={group.domain}>
              <h3 className="section-subtitle">{group.domain}</h3>
              <ul className="mistake-list lesson-list">
                {group.items.map((item) => (
                  <li key={item.slug}>
                    <Link className="card mistake-card" href={`/how-its-built/expensive-mistakes/${item.slug}`}>
                      <span className="card-title">{item.title}</span>
                      <span className="mistake-cost">
                        {item.source} · {item.published}
                      </span>
                      <span className="mistake-more">Read the article →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        )}

        {lesson && (
        <article className="mistake-article lesson-article" id={lesson.slug}>
          <p className="eyebrow">
            <Link href="/how-its-built/expensive-mistakes">Expensive Mistakes</Link> · {lesson.domain}
          </p>
          <h2 className="group-title">{lesson.title}</h2>
          <p className="note">
            Originally published on {lesson.source}, {lesson.published}
            {lesson.originalUrl && (
              <>
                {" · "}
                <a href={lesson.originalUrl}>Read the original →</a>
              </>
            )}
          </p>
          {lessonHtml ? (
            <div className="lesson-body" dangerouslySetInnerHTML={{ __html: lessonHtml }} />
          ) : (
            <div className="coming-soon">
              <p className="coming-soon-title">Coming Soon...</p>
            </div>
          )}
          <p className="note">
            <Link href="/how-its-built/expensive-mistakes">← All expensive mistakes</Link>
          </p>
        </article>
        )}

        {article && (
        <article className="mistake-article" id={article.slug}>
          <p className="eyebrow">
            <Link href="/how-its-built/expensive-mistakes">Expensive Mistakes</Link>
          </p>
          <h2 className="group-title">{article.title}</h2>
          <p className="mistake-cost">{article.cost}</p>
          <p className="lead-small">{article.oneLine}</p>
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="section-subtitle">{section.heading}</h3>
              {section.body}
            </section>
          ))}
          <ul className="link-list">
            {article.links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label} →</a>
              </li>
            ))}
          </ul>
          <p className="note">
            <Link href="/how-its-built/expensive-mistakes">← All expensive mistakes</Link>
          </p>
        </article>
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

        {tab === "total-projected-cost" && (
        <section id="total-projected-cost">
          <h2 className="group-title">
            Total Projected Cost <span className="status">In design</span>
          </h2>
          <div className="coming-soon">
            <p className="coming-soon-title">Coming Soon...</p>
            <p>
              The projected cost of building the whole platform, story by
              story, with a human team (engineers, product, QA, program and
              leadership, plus one person in each go-to-market function),
              against building it with Claude Code and one product manager,
              and the difference between the two (epic MVP1-E8).
            </p>
          </div>
          <p className="note">
            Until then, this page shows what 01scale has cost so far and what
            it costs to run. Visitors pay nothing: every cost lands on me, so
            every service has a ceiling, listed under{" "}
            <Link href="/how-its-built/constraints">Constraints</Link>.
          </p>

          <h3 className="section-subtitle">Development cost</h3>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{usd(costs.totals.cost)}</span>
              <span className="stat-label">Tokens so far, at API rates</span>
            </div>
            <div className="stat">
              <span className="stat-value">{costs.totals.storyYield}%</span>
              <span className="stat-label">Token yield across stories</span>
            </div>
          </div>
          <p className="note">
            This is what the tokens Claude Code used would cost an API
            customer. It is not what I pay: building runs on my Claude Pro
            subscription. The breakdown by story is in{" "}
            <Link href="/how-its-built/token-costs">Token Costs</Link>.
          </p>

          <h3 className="section-subtitle">What I actually pay</h3>
          <dl className="decisions cost-paid">
            {paid.map((row) => (
              <div key={row.item}>
                <dt>
                  {row.item} · {row.amount}
                </dt>
                <dd>{row.covers}</dd>
              </div>
            ))}
          </dl>

          <h3 className="section-subtitle">Usage cost, by provider</h3>
          <table className="cost-table cost-table-text">
            <thead>
              <tr>
                <th scope="col">Provider</th>
                <th scope="col">Bills for</th>
                <th scope="col">Covered by</th>
                <th scope="col">Most it can cost a month</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((row) => (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  <td data-label="Bills for">{row.billsFor}</td>
                  <td data-label="Covered by">{row.coveredBy}</td>
                  <td data-label="Most a month">{row.ceiling}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="cost-empty" colSpan={2} />
                <td data-label="Most a month">{providersTotal}</td>
              </tr>
            </tfoot>
          </table>

          <h3 className="section-subtitle">Cost of reading one document</h3>
          <div className="cards">
            {perExtraction.map((row) => (
              <div className="card" key={row.model}>
                <p className="card-title">
                  {row.model} · {row.cost}
                </p>
                <p>
                  {row.detail}. That is {row.perMonth}.
                </p>
              </div>
            ))}
          </div>
          <p className="note">
            Estimates until the Extraction service is built and measures every
            job. The month starts on Opus 5.5; when its $5 is used, Haiku 5.5
            takes over and the extraction page says so.
          </p>

        </section>
        )}

        {tab === "constraints" && (
        <section id="constraints">
          <h2 className="group-title">
            Constraints <span className="status">Designed</span>
          </h2>
          <p className="note">
            Every limit that keeps the demo safe and cheap, with its reason and
            the story that sets it. They are decided in the stories; the
            services that enforce them are not built yet.
          </p>
          <table className="cost-table cost-table-text">
            <thead>
              <tr>
                <th scope="col">Limit</th>
                <th scope="col">Value</th>
                <th scope="col">Why</th>
                <th scope="col">Story</th>
              </tr>
            </thead>
            <tbody>
              {constraints.map((row) => (
                <tr key={row.limit}>
                  <th scope="row">{row.limit}</th>
                  <td data-label="Value">{row.value}</td>
                  <td data-label="Why">{row.why}</td>
                  <td data-label="Story">
                    <code>{row.story}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        )}
      </div>
    </>
  );
}
