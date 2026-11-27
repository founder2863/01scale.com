import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { costs } from "../costs";
import { constraints, paid, perExtraction, providers, providersTotal } from "../running-costs";
import { designSkillCount, rulesHref, skillOrder, skills } from "../skills";
import { builtTabs, costTabAliases, costTabs, type BuiltTab, type CostTab } from "../tabs";
import { totalCost } from "../total-cost";
import { CostPager, CostTabs } from "../cost-tabs";
import { findMistake, mistakes } from "../mistakes";
import { articleBody, articleDomains, articles, findArticle } from "../articles";
import YieldExplainer from "../yield-explainer";
import { TokenSide, TokenTotal } from "../token-side";
import { findRoadmapVersion, roadmapVersions, RoadmapVersion } from "../roadmap-versions";

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

function usd(value: number | null) {
  return value === null ? "pending" : `$${value.toFixed(2)}`;
}

// Days with at most one decimal (MVP1-E8-15).
function num(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function dollars(value: number) {
  return `$${value.toLocaleString("en-US")}`;
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
// Total Cost has four tabs; the first is the tab's own address (MVP1-E8-10; label from MVP1-E8-11).
export function generateStaticParams(): Params[] {
  return [
    { tab: [] },
    ...builtTabs.slice(1).map((item) => ({ tab: [item.slug] })),
    ...costTabs.slice(1).map((item) => ({ tab: ["total-projected-cost", item.slug] })),
    ...Object.keys(costTabAliases).map((slug) => ({ tab: ["total-projected-cost", slug] })),
    // Each roadmap version has its own address; "/how-its-built/roadmap" is the latest.
    ...roadmapVersions.map((item) => ({ tab: ["roadmap", item.slug] })),
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
    if (params.tab?.[0] === "roadmap") {
      return findRoadmapVersion(slug) ? "roadmap" : null;
    }
    if (params.tab?.[0] === "total-projected-cost") {
      return costTabs.slice(1).some((item) => item.slug === slug) || slug in costTabAliases ? "total-projected-cost" : null;
    }
    return params.tab?.[0] === "expensive-mistakes" && (findMistake(slug) || findArticle(slug)) ? "expensive-mistakes" : null;
  }
  const found = builtTabs.find((item) => item.slug === (params.tab?.[0] ?? "skills"));
  return found ? found.slug : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = await params;
  const tab = resolve(resolved);
  const article = resolved.tab?.[1] ? findMistake(resolved.tab[1]) ?? findArticle(resolved.tab[1]) : undefined;
  const costSlug = resolved.tab?.[1] ? costTabAliases[resolved.tab[1]] ?? resolved.tab[1] : undefined;
  const costLabel = tab === "total-projected-cost" && costSlug ? costTabs.find((item) => item.slug === costSlug)?.label : undefined;
  const label = article?.title ?? costLabel ?? builtTabs.find((item) => item.slug === tab)?.label;
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
  const lessonBody = lesson ? articleBody(lesson) : null;
  const costTab: CostTab =
    (tab === "total-projected-cost" &&
      resolved.tab?.[1] &&
      ((costTabAliases[resolved.tab[1]] ?? resolved.tab[1]) as CostTab)) ||
    "so-far";
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
            What building with Claude Code has cost so far and what the rest
            will cost, read the way a product leader reads it: Product and
            Engineering, each consumed so far and projected for the remaining
            stories, then the total. The numbers so far are measured from the
            session record, using the cost Claude Code computes itself; only
            the assignment of each request to a story, and to Product or
            Engineering, is mine.
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

          <TokenSide side="product" letter="a" />
          <TokenSide side="engineering" letter="b" />
          <TokenTotal />

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
              <dt>Pre-requisites</dt>
              <dd>
                Work tied to no story (scaffolding): questions, discovery,
                tooling and process, split by subject: product topics to
                Product, scripts and site set-up to Engineering.
              </dd>
            </div>
            <div>
              <dt>Product and Engineering</dt>
              <dd>
                Product: PRDs, epics and stories, business functions, cost and
                roadmap work, non-technical documents and UX design.
                Engineering: code, architecture and sequence diagrams. API
                specs, data models and schemas count 75% Product, 25%
                Engineering. The Share column shows a story&apos;s part.
              </dd>
            </div>
            <div>
              <dt>Projected</dt>
              <dd>
                The remaining stories of the latest roadmap, each on the side
                of its owner there (product manager or engineer), priced by the
                roadmap&apos;s token rule.
              </dd>
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
            {costs.totals.pendingEstimated > 0 &&
              `${costs.totals.pendingEstimated} of them never will be: their measured tokens at list prices put them at about ${usd(costs.totals.pendingEstimate)} at most, an estimate kept out of the totals. `}
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
          {lessonBody ? (
            <div className="lesson-body">
              <div dangerouslySetInnerHTML={{ __html: lessonBody.intro }} />
              {lessonBody.sections.map((section) => (
                <details className="lesson-section" key={section.heading}>
                  <summary>
                    <h2 dangerouslySetInnerHTML={{ __html: section.heading }} />
                  </summary>
                  <div dangerouslySetInnerHTML={{ __html: section.html }} />
                </details>
              ))}
            </div>
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
            Total Cost <span className="status">In progress</span>
          </h2>
          <p className="note">
            What 01scale has cost with Claude Code so far, against what a human
            team would have cost for the same stories, and what the rest of the
            plan will cost without and with Claude Code: product managers and
            engineers, plus tokens. The plan is the latest roadmap version,{" "}
            <Link href={totalCost.version.href}>roadmap {totalCost.version.slug}</Link>. Visitors pay nothing: every cost lands on me, so every service
            has a ceiling, listed under{" "}
            <Link href="/how-its-built/constraints">Constraints</Link>.
          </p>

          <CostTabs current={costTab} />

          {costTab === "so-far" && (
          <div className="cost-panel">
            <h3 className="section-subtitle">Actuals so far: Claude Code against a human team</h3>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-value">{usd(costs.totals.cost)}</span>
                <span className="stat-label">Tokens spent so far, at API rates</span>
              </div>
              <div className="stat">
                <span className="stat-value">{costs.totals.storyYield}%</span>
                <span className="stat-label">Token yield across stories</span>
              </div>
              <div className="stat">
                <span className="stat-value">{dollars(totalCost.soFar.humanCost)}</span>
                <span className="stat-label">A human team for the {totalCost.soFar.stories} stories built</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {num(totalCost.soFar.productDays)} + {num(totalCost.soFar.devDays)}
                </span>
                <span className="stat-label">Product + development days they would take</span>
              </div>
            </div>
            <p className="note">
              Tokens are what Claude Code&apos;s work would cost an API customer; it is not what I
              pay, since building runs on my Claude Pro subscription. Build and rework, request by
              request, are in <Link href="/how-its-built/token-costs">Token Costs</Link>. The human
              team is priced like the roadmap prices planned stories: product days at the product
              manager rate ({dollars(totalCost.rates.productManager)} a day), development days at the
              engineer rate ({dollars(totalCost.rates.engineer)} a day); a built story the roadmap does
              not plan is engineering work, its size plus {Math.round(totalCost.productShare * 100)}% for
              the product manager&apos;s sprint work. Rates are an assumption (Nikhil, 27 Nov 2026).
            </p>

            <details className="cost-more">
              <summary>Each story built</summary>
              <h4 className="cost-more-title">Tokens, by story</h4>
              <table className="cost-table cost-table-small">
                <thead>
                  <tr>
                    <th scope="col">Story</th>
                    <th scope="col">Tokens</th>
                    <th scope="col">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.stories.map((story) => (
                    <tr key={story.key}>
                      <th scope="row">{story.name}</th>
                      <td data-label="Tokens">{mtok(story.buildTokens + story.reworkTokens)}</td>
                      <td data-label="Cost">
                        {usd(story.totalCost)}
                        {story.pending && <span className="cost-pending"> + pending</span>}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Scaffolding, not tied to a story</th>
                    <td data-label="Tokens">{mtok(costs.scaffoldingTotals.tokens)}</td>
                    <td data-label="Cost">{usd(costs.scaffoldingTotals.cost)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td data-label="Tokens">{mtok(costs.totals.tokens)}</td>
                    <td data-label="Cost">{usd(costs.totals.cost)}</td>
                  </tr>
                </tfoot>
              </table>
              <h4 className="cost-more-title">A human team, by story</h4>
              <table className="cost-table cost-table-small">
                <thead>
                  <tr>
                    <th scope="col">Story</th>
                    <th scope="col">Size</th>
                    <th scope="col">Product days</th>
                    <th scope="col">Development days</th>
                    <th scope="col">Human cost</th>
                  </tr>
                </thead>
                <tbody>
                  {totalCost.soFar.built.map((story) => (
                    <tr key={story.id}>
                      <th scope="row">
                        {story.id} {story.title}
                      </th>
                      <td data-label="Size">{story.size}</td>
                      <td data-label="Product days">{num(story.productDays)}</td>
                      <td data-label="Development days">{num(story.devDays)}</td>
                      <td data-label="Human cost">{dollars(story.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="cost-empty" />
                    <td data-label="Product days">{num(totalCost.soFar.productDays)}</td>
                    <td data-label="Development days">{num(totalCost.soFar.devDays)}</td>
                    <td data-label="Human cost">{dollars(totalCost.soFar.humanCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </details>

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
          </div>
          )}

          {costTab === "projected" && (
          <div className="cost-panel">
            <h3 className="section-subtitle">
              The rest of the plan: without and with Claude Code
            </h3>
            <div className="stat-row">
              <div className="stat">
                <span className="stat-value">{dollars(totalCost.projected.without.total)}</span>
                <span className="stat-label">Without Claude Code</span>
              </div>
              <div className="stat">
                <span className="stat-value">{dollars(totalCost.projected.with.total)}</span>
                <span className="stat-label">With Claude Code, tokens included</span>
              </div>
              <div className="stat">
                <span className="stat-value">{dollars(totalCost.projected.saved)}</span>
                <span className="stat-label">
                  Saved ({Math.round((totalCost.projected.saved / totalCost.projected.without.total) * 100)}%)
                </span>
              </div>
            </div>
            <table className="cost-table cost-table-text">
              <thead>
                <tr>
                  <th scope="col">Cost</th>
                  <th scope="col">Without Claude Code</th>
                  <th scope="col">With Claude Code</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    The team: {totalCost.projected.without.productManagers} product managers and{" "}
                    {totalCost.projected.without.engineers} engineers, every working day of the plan
                  </th>
                  <td data-label="Without Claude Code">
                    {dollars(totalCost.projected.without.team)} · {totalCost.projected.without.days} days
                  </td>
                  <td data-label="With Claude Code">
                    {dollars(totalCost.projected.with.team)} · {totalCost.projected.with.days} days
                  </td>
                </tr>
                <tr>
                  <th scope="row">Tokens for the remaining stories</th>
                  <td data-label="Without Claude Code">-</td>
                  <td data-label="With Claude Code">
                    {dollars(totalCost.projected.with.tokens)} (product {dollars(totalCost.projected.with.tokensProduct)},
                    engineering {dollars(totalCost.projected.with.tokensEngineering)})
                  </td>
                </tr>
                <tr>
                  <th scope="row">Total</th>
                  <td data-label="Without Claude Code">
                    <strong>{dollars(totalCost.projected.without.total)}</strong>
                  </td>
                  <td data-label="With Claude Code">
                    <strong>{dollars(totalCost.projected.with.total)}</strong>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Product + development days the stories take</th>
                  <td data-label="Without Claude Code">
                    {num(totalCost.projected.without.productDays)} + {num(totalCost.projected.without.devDays)}
                  </td>
                  <td data-label="With Claude Code">
                    {num(totalCost.projected.with.productDays)} + {num(totalCost.projected.with.devDays)}
                  </td>
                </tr>
                {totalCost.projected.milestones.map((m) => (
                  <tr key={m.name}>
                    <th scope="row">{m.name}</th>
                    <td data-label="Without Claude Code">
                      {m.without ? `Month ${m.without.month} · likely ${m.without.p50Month} · worst ${m.without.p90Month}` : "-"}
                    </td>
                    <td data-label="With Claude Code">
                      {m.with ? `Month ${m.with.month} · likely ${m.with.p50Month} · worst ${m.with.p90Month}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              From <Link href={totalCost.version.href}>roadmap {totalCost.version.slug}</Link>,{" "}
              {totalCost.version.title}. The team is paid for every working day of its plan, busy or
              not. {totalCost.projected.tokensWhy}
            </p>
            <h3 className="section-subtitle">Cost by story</h3>
            <p className="note">
              Every remaining story in the plan, without and with Claude Code: product days at the
              product manager rate and development days at the engineer rate, plus, with Claude Code,
              the story&apos;s projected tokens. Grouped by epic below; each story is in the table.
              These add up to the work ({dollars(totalCost.projected.byStoryTotal.without)} and{" "}
              {dollars(totalCost.projected.byStoryTotal.with)}), not the team total above, which
              also pays for idle days.
            </p>
            <CostByEpicChart />
            <details className="cost-more">
              <summary>Each story ({totalCost.projected.byStoryTotal.stories})</summary>
              <table className="cost-table cost-table-small">
                <thead>
                  <tr>
                    <th scope="col">Story</th>
                    <th scope="col">Size</th>
                    <th scope="col">Without Claude Code</th>
                    <th scope="col">With Claude Code</th>
                    <th scope="col">Of which tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {totalCost.projected.byStory.map((story) => (
                    <tr key={story.id}>
                      <th scope="row">
                        {story.id} {story.title}
                      </th>
                      <td data-label="Size">{story.size}</td>
                      <td data-label="Without Claude Code">{dollars(story.without)}</td>
                      <td data-label="With Claude Code">{dollars(story.with)}</td>
                      <td data-label="Of which tokens">{usd(story.tokens)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td className="cost-empty" />
                    <td data-label="Without Claude Code">{dollars(totalCost.projected.byStoryTotal.without)}</td>
                    <td data-label="With Claude Code">{dollars(totalCost.projected.byStoryTotal.with)}</td>
                    <td data-label="Of which tokens">{usd(totalCost.projected.byStoryTotal.tokens)}</td>
                  </tr>
                </tfoot>
              </table>
            </details>

            <h3 className="section-subtitle">Not in the plan</h3>
            <p className="note">
              {totalCost.projected.notPlanned.length} stories in scope that this roadmap version
              does not plan ({totalCost.projected.notPlannedDays} person-days by size): listed,
              not priced, until a roadmap version plans them.
            </p>
            <details className="cost-more">
              <summary>The stories not in the plan</summary>
              <ul className="rm-list">
                {totalCost.projected.notPlanned.map((s) => (
                  <li key={s.id}>
                    {s.id} {s.title} ({s.size})
                  </li>
                ))}
              </ul>
            </details>
          </div>
          )}

          <CostPager current={costTab} />
        </section>
        )}

        {tab === "roadmap" && <RoadmapVersion version={findRoadmapVersion(resolved.tab?.[1])!} />}

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

// Cost by epic, without and with Claude Code (MVP1-E8-15; Nikhil on PR #253). Horizontal bars on
// one scale, blue for without and orange for with (the dataviz palette's first two slots,
// validated against this site's surfaces); every bar carries its value, a hover title, and the
// story table above is the table view.
function CostByEpicChart() {
  const epics = totalCost.projected.byEpic;
  const max = Math.max(...epics.map((e) => e.without), 1);
  return (
    <figure className="cbe" aria-label="Cost by epic, without and with Claude Code">
      <div className="cbe-legend" aria-hidden="true">
        <span className="cbe-key cbe-without">Without Claude Code</span>
        <span className="cbe-key cbe-with">With Claude Code (tokens included)</span>
      </div>
      <ul className="cbe-rows">
        {epics.map((e) => (
          <li key={e.epic} className="cbe-row">
            <span className="cbe-name">
              <span className="cbe-id">{e.epic.replace("MVP1-", "")}</span> {e.name}
              <span className="cbe-count"> · {e.stories} {e.stories === 1 ? "story" : "stories"}</span>
            </span>
            <span className="cbe-bars">
              <span
                className="cbe-bar cbe-without"
                style={{ width: `${(e.without / max) * 100}%` }}
                title={`${e.epic} without Claude Code: ${dollars(e.without)}`}
              >
                <span className="cbe-value">{dollars(e.without)}</span>
              </span>
              <span
                className="cbe-bar cbe-with"
                style={{ width: `${(e.with / max) * 100}%` }}
                title={`${e.epic} with Claude Code: ${dollars(e.with)}, of which tokens ${usd(e.tokens)}`}
              >
                <span className="cbe-value">{dollars(e.with)}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
