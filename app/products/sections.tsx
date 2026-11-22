import Link from "next/link";
import type { ReactNode } from "react";
import type { Product } from "./data";
import { details } from "./details";
import { ComponentGallery } from "./gallery/gallery";
import { hasGallery } from "./gallery/modules";
import { DEFAULT_TAB, tabGroups, tabHref, type Tab, type TabSlug } from "./tabs";

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

// Renders `code` spans written with backticks in the content.
function rich(text: string): ReactNode {
  return text
    .split("`")
    .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part));
}

function Code({ children }: { children: string }) {
  return (
    <pre className="code">
      <code>{children}</code>
    </pre>
  );
}

function ComingSoon({ what }: { what: string }) {
  return (
    <div className="coming-soon">
      <p className="coming-soon-title">Coming Soon...</p>
      <p>{what}</p>
    </div>
  );
}

function DocLink({ path, label }: { path: string; label: string }) {
  return (
    <p className="doc-link">
      <a href={`${REPO}/${path}`}>{label} →</a>
    </p>
  );
}

function Method({ method }: { method: string }) {
  return <span className={`method method-${method.toLowerCase()}`}>{method}</span>;
}

/* ---------------------------------------------------------------- Read Me */

function ReadMe({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || detail.overview.what.length === 0) {
    return (
      <>
        <p>{product.description}</p>
        <dl className="decisions">
          <div>
            <dt>Service</dt>
            <dd>{product.service}</dd>
          </div>
          <div>
            <dt>Phase</dt>
            <dd>{product.group}</dd>
          </div>
          {product.epic.goal && (
            <div>
              <dt>Goal</dt>
              <dd>{rich(product.epic.goal)}</dd>
            </div>
          )}
          <div>
            <dt>Status</dt>
            <dd>{product.status}: requirements, endpoints and data notes are written; nothing is built yet.</dd>
          </div>
        </dl>
        <ComingSoon what="How it works, a quick start and configuration will appear here when this module's design is finalized." />
      </>
    );
  }

  const { overview } = detail;
  return (
    <>
      {overview.what.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <h3>Why it exists</h3>
      <div className="cards">
        {overview.why.map((reason) => (
          <div className="card" key={reason.title}>
            <p className="card-title">{reason.title}</p>
            <p>{reason.text}</p>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div>
          <h3>In this version</h3>
          <ul className="plain-list">
            {overview.scope_in.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Not in this version</h3>
          <ul className="plain-list muted">
            {overview.scope_out.map((item) => (
              <li key={item}>{rich(item)}</li>
            ))}
          </ul>
        </div>
      </div>

      {detail.flow.length > 0 && (
        <>
      <h3>{detail.labels.flow}</h3>
      <ol className="flow">
        {detail.flow.map((step) => (
          <li key={step.what}>
            <strong>{step.who}.</strong> {rich(step.what)}
          </li>
        ))}
      </ol>
        </>
      )}

      {detail.concepts.length > 0 && (
        <>
      <h3>Words used here</h3>
      <dl className="decisions">
        {detail.concepts.map((concept) => (
          <div key={concept.term}>
            <dt>{concept.term}</dt>
            <dd>{rich(concept.meaning)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.quickstart.length > 0 && (
        <>
      <h3>Quick start</h3>
      <p className="note">These examples work once the service is built and deployed.</p>
      {detail.quickstart.map((step, index) => (
        <div className="step" key={step.title}>
          <h4>
            {index + 1}. {step.title}
          </h4>
          <p>{rich(step.text)}</p>
          <Code>{step.code}</Code>
        </div>
      ))}
        </>
      )}

      {detail.env.length > 0 && (
        <>
      <h3>Configuration</h3>
      <p>
        Environment variables on the service&apos;s own deployment. Secrets are never committed.
      </p>
      <dl className="fields">
        {detail.env.map((variable) => (
          <div key={variable.name}>
            <dt>
              <code>{variable.name}</code>
              {variable.secret === "Yes" && <span className="chip">secret</span>}
            </dt>
            <dd>{rich(variable.value)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.decisions.length > 0 && (
        <>
      <h3>Decisions</h3>
      <dl className="decisions">
        {detail.decisions.map((item) => (
          <div key={item.question}>
            <dt>{item.question}</dt>
            <dd>{rich(item.decision)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.openQuestions.length > 0 && (
        <>
      <h3>Open questions</h3>
      <ul className="plain-list">
        {detail.openQuestions.map((question) => (
          <li key={question}>{rich(question)}</li>
        ))}
      </ul>
        </>
      )}

      <DocLink path={`${detail.docsPath}/README.md`} label="Developer guide on GitHub" />
      {detail.extraDocs.map((doc) => (
        <DocLink key={doc.path} path={doc.path} label={doc.label} />
      ))}
    </>
  );
}

/* ---------------------------------------------------------- Requirements */

function Requirements({ product }: { product: Product }) {
  return (
    <>
      <h2>Requirement EPIC</h2>
      <dl className="decisions">
        <div>
          <dt>Epic</dt>
          <dd>
            {product.group} · {product.epic.id} · {product.epic.title}
          </dd>
        </div>
        {product.epic.goal && (
          <div>
            <dt>Goal</dt>
            <dd>{rich(product.epic.goal)}</dd>
          </div>
        )}
        <div>
          <dt>Stories in this module</dt>
          <dd>{product.stories.length}</dd>
        </div>
      </dl>

      {product.stories.map((story) => (
        <article className="story" key={story.id} id={story.id.toLowerCase()}>
          <h3>
            <code>{story.id}</code> {story.title}
          </h3>
          <p className="story-meta">
            <span className="chip">Size {story.size}</span>
            <span className="chip">{story.service}</span>
            {story.pending && <span className="chip chip-pending">Pending</span>}
          </p>
          {story.pending && <p className="muted">{rich(story.pending)}</p>}
          {story.story && <p>{rich(story.story)}</p>}
          <ul className="criteria">
            {story.acs.map((criterion) => (
              <li key={criterion.label}>
                <span className="criteria-label">{criterion.label}</span>
                <span>{rich(criterion.text)}</span>
              </li>
            ))}
          </ul>
          {story.evals && (
            <p className="muted">
              <strong>Evals:</strong> {rich(story.evals)}
            </p>
          )}
        </article>
      ))}

      <DocLink
        path={`docs/epics/${product.group}-EPICS.md`}
        label={`All ${product.group} epics and stories on GitHub`}
      />
    </>
  );
}

/* ---------------------------------------------------------- User journey */

function UserJourney({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || detail.journeys.length === 0) {
    return (
      <>
        <h2>User Journey</h2>
        <ComingSoon what="Step-by-step journeys for this module (what a person sees and what the system does) will appear here when its design is finalized." />
      </>
    );
  }

  return (
    <>
      <h2>User Journey</h2>
      <p className="note">{detail.notes.journey}</p>

      {detail.journeys.map((journey) => (
        <article className="story" key={journey.name}>
          <h3>{journey.name}</h3>
          <p className="story-meta">
            <span className="chip">{journey.who}</span>
            {journey.stories.map((story) => (
              <span className="chip" key={story}>
                {story}
              </span>
            ))}
          </p>
          <p>
            <strong>Starts when:</strong> {rich(journey.trigger)}
          </p>
          <ol className="journey">
            {journey.steps.map((step) => (
              <li key={step.person}>
                <p>
                  <span className="journey-who">The person</span>
                  {rich(step.person)}
                </p>
                <p>
                  <span className="journey-who journey-system">The system</span>
                  {rich(step.system)}
                </p>
              </li>
            ))}
          </ol>
          <p>
            <strong>Result:</strong> {rich(journey.outcome)}
          </p>
        </article>
      ))}

      {detail.edgeCases.length > 0 && (
        <>
      <h3>When something goes wrong</h3>
      <dl className="fields">
        {detail.edgeCases.map((edge) => (
          <div key={edge.situation}>
            <dt>
              {edge.situation}
              <span className="chip">{rich(edge.code)}</span>
            </dt>
            <dd>{edge.sees}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      <DocLink path={`${detail.docsPath}/USER-JOURNEYS.md`} label="User journeys on GitHub" />
    </>
  );
}

/* --------------------------------------------------------- UI components */

function UiComponents({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || detail.components.length === 0) {
    return (
      <>
        <h2>UI Components</h2>
        <ComingSoon what="The components this module ships for apps to use, with their inputs and states, will appear here when its design is finalized." />
      </>
    );
  }

  return (
    <>
      <h2>
        UI Components <span className="status">{hasGallery(product.slug) ? "Live gallery" : "Designed"}</span>
      </h2>
      <p className="note">{rich(detail.notes.ui)}</p>
      {hasGallery(product.slug) ? (
        <p className="note">
          Each built component is shown live, from its package, in each of its states. Pick a state to
          see it; every state has its own stand-in for the service&apos;s API, with made-up data (MVP1-E0-19).
        </p>
      ) : null}
      <ul className="plain-list">
        {detail.uiRules.map((rule) => (
          <li key={rule}>{rich(rule)}</li>
        ))}
      </ul>

      <div className="component-grid">
        {detail.components.map((component) => (
          <article className="story" key={component.name}>
            <h3>{component.name}</h3>
            <p className="story-meta">
              <span className="chip">{component.kind}</span>
            </p>
            <p>{component.purpose}</p>
            <h4>Inputs</h4>
            <dl className="fields">
              {component.props.map((prop) => (
                <div key={prop.name}>
                  <dt>
                    <code>{prop.name}</code>
                    <span className="chip">{prop.type}</span>
                  </dt>
                  <dd>{rich(prop.meaning)}</dd>
                </div>
              ))}
            </dl>
            <h4>States</h4>
            <ul className="plain-list">
              {component.states.map((state) => (
                <li key={state}>{rich(state)}</li>
              ))}
            </ul>
            <h4>Calls</h4>
            <ul className="plain-list">
              {component.calls.map((call) => (
                <li key={call}>{rich(call)}</li>
              ))}
            </ul>
            <ComponentGallery module={product.slug} name={component.name} />
          </article>
        ))}
      </div>

      {detail.hostedPages.length > 0 && (
        <>
      <h3>{detail.labels.hosted}</h3>
      <p className="note">{detail.notes.hosted}</p>
      <dl className="decisions">
        {detail.hostedPages.map((page) => (
          <div key={page.page}>
            <dt>{page.page}</dt>
            <dd>{page.what}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      <DocLink path={`${detail.docsPath}/UI-COMPONENTS.md`} label="UI components on GitHub" />
    </>
  );
}

/* --------------------------------------------------------------- API spec */

function ApiSpec({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || detail.endpoints.length === 0) {
    return (
      <>
        <h2>
          API Spec {product.endpoints.length > 0 && <span className="status">Designed</span>}
        </h2>
        {product.endpoints.length === 0 ? (
          <p className="note">This module adds no endpoints of its own.</p>
        ) : (
          <ul className="endpoints">
            {product.endpoints.map((endpoint) => (
              <li key={endpoint.method + endpoint.path + endpoint.story}>
                <div className="endpoint-line">
                  <Method method={endpoint.method} />
                  <code>{endpoint.path}</code>
                </div>
                <p>
                  {rich(endpoint.summary)} <span className="access">{endpoint.access}</span>
                </p>
                {endpoint.detail && <p className="endpoint-detail">{rich(endpoint.detail)}</p>}
              </li>
            ))}
          </ul>
        )}
        {product.apiNotes.length > 0 && (
          <>
            <h3>Notes</h3>
            <ul className="plain-list">
              {product.apiNotes.map((note) => (
                <li key={note.story + note.text}>
                  <code>{note.story}</code> {rich(note.text)}
                </li>
              ))}
            </ul>
          </>
        )}
        <ComingSoon what="Full inputs, constraints, error codes and sample requests and responses for each endpoint will appear here when this module's design is finalized." />
      </>
    );
  }

  const { overview } = detail;
  return (
    <>
      <h2>
        API Spec <span className="status">Designed</span>
      </h2>
      <p className="note">
        Base address: <code>https://01scale.com{overview.base}</code>. Open an endpoint for its
        inputs, constraints, errors and samples.
      </p>

      {detail.endpoints.map((endpoint) => (
        <details className="endpoint" key={endpoint.id} id={endpoint.id}>
          <summary>
            <Method method={endpoint.method} />
            <span className="endpoint-head">
              <code>{endpoint.path.replace(overview.base, "")}</code>
              <span>{endpoint.title}</span>
            </span>
          </summary>
          <div className="endpoint-body">
            <p>
              {endpoint.summary} <span className="access">{endpoint.access}</span>
            </p>
            {"scope" in endpoint && (
              <p className="note">Scope: {rich(String((endpoint as { scope?: string }).scope))}</p>
            )}

            <h4>Inputs</h4>
            {endpoint.params.length === 0 ? (
              <p className="muted">None.</p>
            ) : (
              <dl className="fields">
                {endpoint.params.map((param) => (
                  <div key={param.name}>
                    <dt>
                      <code>{param.name}</code>
                      <span className="chip">{param.in}</span>
                      <span className="chip">{param.type}</span>
                      <span className="chip">
                        {param.required === "No"
                          ? "optional"
                          : param.required === "Yes"
                            ? "required"
                            : rich(param.required)}
                      </span>
                    </dt>
                    <dd>{rich(param.meaning)}</dd>
                    <dd className="constraint">{rich(param.constraints)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <h4>What it does</h4>
            <ul className="plain-list">
              {endpoint.behaviour.map((item) => (
                <li key={item}>{rich(item)}</li>
              ))}
            </ul>

            <h4>Responses</h4>
            <ul className="status-list">
              {endpoint.responses.map((response) => (
                <li key={response.status}>
                  <span className="code-ok">{response.status}</span>
                  <span>
                    {response.when}. {rich(response.body)}
                  </span>
                </li>
              ))}
              {endpoint.errors.map((error) => (
                <li key={error.code}>
                  <span className="code-err">{error.status}</span>
                  <span>
                    {rich(error.code)} {rich(error.when)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="two-col">
              <div>
                <h4>Sample request</h4>
                <Code>{endpoint.request}</Code>
              </div>
              <div>
                <h4>Sample response</h4>
                <Code>{endpoint.response}</Code>
              </div>
            </div>
          </div>
        </details>
      ))}

      {detail.errorSample !== "" && (
        <>
      <h3>Errors</h3>
      <p>
        Every error has the same shape and a stable <code>code</code> to branch on.
      </p>
      <Code>{detail.errorSample}</Code>
        </>
      )}

      {detail.cookies.length > 0 && (
        <>
      <h3>Cookies</h3>
      <dl className="fields">
        {detail.cookies.map((cookie) => (
          <div key={cookie.name}>
            <dt>
              {rich(cookie.name)}
              <span className="chip">{cookie.lifetime}</span>
            </dt>
            <dd>{rich(cookie.holds)}</dd>
            <dd className="constraint">{rich(cookie.attributes)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.claims.length > 0 && (
        <>
      <h3>Access token</h3>
      <p>{detail.notes.token}</p>
      <dl className="fields">
        {detail.claims.map((claim) => (
          <div key={claim.claim}>
            <dt>{rich(claim.claim)}</dt>
            <dd>{claim.meaning}</dd>
            <dd className="constraint">Example: {rich(claim.example)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.noEndpoint.length > 0 && (
        <>
      <h3>Handled without an endpoint</h3>
      <dl className="decisions">
        {detail.noEndpoint.map((item) => (
          <div key={item.topic}>
            <dt>{item.topic}</dt>
            <dd>{rich(item.how)}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      {detail.rules[0].items.length > 0 && (
        <>
      <h3>Constraints at the API level</h3>
      <ul className="plain-list">
        {detail.rules[0].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>
        </>
      )}

      <DocLink path={`${detail.docsPath}/API-SPEC.md`} label="API specification on GitHub" />
    </>
  );
}

/* ------------------------------------------------------------- Data model */

function DataModel({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || detail.tables.length === 0) {
    return (
      <>
        <h2>Data Model</h2>
        {product.dbNotes.length > 0 && (
          <>
            <p className="note">Design notes from each story. Tables belong to the owning service only.</p>
            <dl className="decisions">
              {product.dbNotes.map((note) => (
                <div key={note.story}>
                  <dt>
                    {note.story} · {note.title}
                  </dt>
                  <dd>{rich(note.text)}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
        <ComingSoon what="The entities, their relationships, what every field means and the business rules will appear here when this module's design is finalized." />
      </>
    );
  }

  return (
    <>
      <h2>
        Data Model <span className="status">Designed</span>
      </h2>
      <p className="note">
        What the service keeps, how the pieces relate, and what every field means. The SQL is on
        the Schema tab.
      </p>

      {detail.entities.length > 0 && (
        <>
      <h3>Entities</h3>
      <div className="cards">
        {detail.entities.map((entity) => (
          <div className="card" key={entity.name}>
            <p className="card-title">{entity.name}</p>
            <p>{entity.what}</p>
            <p className="muted">{rich(entity.relations)}</p>
            <p>{rich(entity.table)}</p>
          </div>
        ))}
      </div>
        </>
      )}

      {detail.lifecycles.length > 0 && (
        <>
      <h3>Life of each record</h3>
      <dl className="decisions">
        {detail.lifecycles.map((item) => (
          <div key={item.name}>
            <dt>{item.name}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
        </>
      )}

      <h3>Fields</h3>
      {detail.tables.map((table) => (
        <details className="more" key={table.name} open={table === detail.tables[0]}>
          <summary>
            <code>{table.name}</code>
          </summary>
          <div>
            <p>{table.purpose}</p>
            <dl className="fields">
              {table.columns.map((column) => (
                <div key={column.name}>
                  <dt>
                    <code>{column.name}</code>
                    <span className="chip">{column.type}</span>
                    {column.nullable === "Yes" && <span className="chip">can be empty</span>}
                    {column.default && <span className="chip">default {column.default}</span>}
                  </dt>
                  <dd>{rich(column.meaning)}</dd>
                  {column.constraints && <dd className="constraint">{rich(column.constraints)}</dd>}
                </div>
              ))}
            </dl>
          </div>
        </details>
      ))}
      {detail.otherTables !== "" && (
        <>
      <p className="note">{rich(detail.otherTables)}</p>
        </>
      )}

      {detail.rules[2].items.length > 0 && (
        <>
      <h3>{detail.rules[2].level}</h3>
      <ul className="plain-list">
        {detail.rules[2].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>
        </>
      )}

      {detail.notStored.length > 0 && (
        <>
      <h3>What is deliberately not stored</h3>
      <ul className="plain-list">
        {detail.notStored.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
        </>
      )}

      <DocLink path={`${detail.docsPath}/DATA-MODEL.md`} label="Data model on GitHub" />
    </>
  );
}

/* ----------------------------------------------------------------- Schema */

function Schema({ product }: { product: Product }) {
  const detail = details[product.slug];
  if (!detail || !detail.ddl) {
    return (
      <>
        <h2>Schema</h2>
        <ComingSoon what="The SQL for this module's tables, with constraints, indexes and sample data, will appear here when its design is finalized." />
      </>
    );
  }

  return (
    <>
      <h2>
        Schema <span className="status">Designed</span>
      </h2>
      <p className="note">{rich(detail.notes.schema)}</p>
      <Code>{detail.ddl}</Code>

      {detail.rules[1].items.length > 0 && (
        <>
      <h3>{detail.rules[1].level}</h3>
      <ul className="plain-list">
        {detail.rules[1].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>
        </>
      )}

      <h3>Constraints and indexes by table</h3>
      {detail.tables.map((table) => (
        <details className="more" key={table.name}>
          <summary>
            <code>{table.name}</code>
          </summary>
          <ul className="plain-list">
            {table.constraints.map((constraint) => (
              <li key={constraint}>{rich(constraint)}</li>
            ))}
          </ul>
        </details>
      ))}

      <h3>Sample data</h3>
      {detail.tables.map((table) => (
        <div key={table.name}>
          <h4>{table.name}</h4>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {table.sampleCols.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.sampleRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((value, index) => (
                      <td key={index}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {detail.queries.length > 0 && (
        <>
      <h3>Common queries</h3>
      {detail.queries.map((query) => (
        <div key={query.title}>
          <h4>{query.title}</h4>
          <Code>{query.sql}</Code>
        </div>
      ))}
        </>
      )}

      <DocLink path={`${detail.docsPath}/SCHEMA.md`} label="Schema on GitHub" />
    </>
  );
}

// Sections whose stories are written but not built yet (MVP1-E0-21 AC1). Each says what will
// appear and which story brings it; nothing is invented to fill it.
const PLANNED: Partial<Record<TabSlug, { title: string; what: string; story: string }>> = {
  "market-outlook": {
    title: "Market Outlook",
    what: "How big the market is, with sourced figures; why I am building this component; where I have used it in my own work; and the key market players and where this component sits against them.",
    story: "MVP1-E0-14",
  },
  "prd-reference": {
    title: "PRD Reference",
    what: "The sections of the product requirements this module implements, each with the stories that deliver it, and any requirement not covered yet.",
    story: "MVP1-E0-15",
  },
  metrics: {
    title: "Metrics",
    what: "The one metric that defines success and the few that drive it, service health against its targets, quality from the evals and cost per use, with live numbers once the module ships.",
    story: "MVP1-E0-27",
  },
  monetization: {
    title: "Monetization",
    what: "The pricing model and price, the cost of one use broken down by provider, the margin, and a comparison with the public prices of the market players.",
    story: "MVP1-E0-28",
  },
  gtm: {
    title: "GTM",
    what: "Who buys and who uses it, how it is positioned against the market players, how developers and agents find and adopt it, and the launch plan.",
    story: "MVP1-E0-29",
  },
  support: {
    title: "Support",
    what: "An FAQ, a guide to every error code and how to fix it, live status, how to get help, and the support level of this demo.",
    story: "MVP1-E0-30",
  },
  architecture: {
    title: "Architecture & System Design",
    what: "Who calls this module and what it calls, its inside, sequence diagrams of its key flows, how it is deployed, its targets for speed and availability, and its decisions and how it evolves.",
    story: "MVP1-E0-20",
  },
  mcp: {
    title: "MCP",
    what: "The MCP tools this module exposes to AI agents, each with its inputs and outputs, matching the API one for one.",
    story: "MVP1-E0-16",
  },
};

function Planned({ product, tab }: { product: Product; tab: TabSlug }) {
  const section = PLANNED[tab];
  if (!section) return null;
  return (
    <>
      <h2>{section.title}</h2>
      {tab === DEFAULT_TAB && (
        <p className="audience-link">
          Building with this?{" "}
          <Link href={tabHref(product.slug, "readme")}>Start with the Read Me →</Link>
        </p>
      )}
      <ComingSoon what={`${section.what} (story ${section.story})`} />
    </>
  );
}

// One line per section, for the two link blocks on the Read Me (Nikhil's decision on PR #111).
const SUMMARY: Record<TabSlug, string> = {
  "market-outlook": "The market, why I am building this, and the players",
  readme: "This guide",
  "prd-reference": "The product requirements this module implements",
  requirements: "The stories and their acceptance criteria",
  metrics: "How success is measured, and how it is doing",
  monetization: "Pricing, cost per use and margin",
  gtm: "Who it is for and how it reaches them",
  support: "Help, error codes and how to fix them",
  architecture: "Context, internals, flows, deployment and decisions",
  "user-journey": "What a person sees and does, step by step",
  "ui-components": "The components this module ships for apps",
  "api-spec": "Every endpoint, with inputs, errors and samples",
  mcp: "The tools this module gives AI agents",
  "data-model": "What it stores and why",
  schema: "The SQL, constraints and indexes",
};

// The Read Me is the technical entry page: it opens with links to the product sections and
// closes with links to the technical ones. It links, it never repeats their content.
function SectionLinks({ product, headings, title }: { product: Product; headings: string[]; title: string }) {
  const sections = tabGroups
    .filter((group) => headings.includes(group.heading))
    .flatMap((group): readonly Tab[] => group.tabs)
    .filter((tab) => tab.slug !== "readme");
  return (
    <nav className="section-links" aria-label={title}>
      <p className="section-links-title">{title}</p>
      <ul>
        {sections.map((tab) => (
          <li key={tab.slug}>
            <Link href={tabHref(product.slug, tab.slug)}>
              <span className="section-links-name">
                {tab.label}
                {PLANNED[tab.slug] && <span className="status">Coming soon</span>}
              </span>
              <span className="section-links-summary">{SUMMARY[tab.slug]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function TabContent({ product, tab }: { product: Product; tab: TabSlug }) {
  switch (tab) {
    case "readme":
      return (
        <>
          <h2>Read Me</h2>
          <SectionLinks product={product} headings={["Product"]} title="At a glance" />
          <ReadMe product={product} />
          <SectionLinks product={product} headings={["Design", "Interfaces", "Data"]} title="Go deeper" />
        </>
      );
    case "requirements":
      return <Requirements product={product} />;
    case "user-journey":
      return <UserJourney product={product} />;
    case "ui-components":
      return <UiComponents product={product} />;
    case "api-spec":
      return <ApiSpec product={product} />;
    case "data-model":
      return <DataModel product={product} />;
    case "schema":
      return <Schema product={product} />;
    default:
      return <Planned product={product} tab={tab} />;
  }
}
