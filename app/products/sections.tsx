import type { ReactNode } from "react";
import type { Product } from "./data";
import { identity } from "./identity";
import type { TabSlug } from "./tabs";

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
  if (!product.detailed) {
    return (
      <>
        <h2>Read Me</h2>
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

  const { overview } = identity;
  return (
    <>
      <h2>Read Me</h2>
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

      <h3>How login works</h3>
      <ol className="flow">
        {identity.flow.map((step) => (
          <li key={step.what}>
            <strong>{step.who}.</strong> {rich(step.what)}
          </li>
        ))}
      </ol>

      <h3>Words used here</h3>
      <dl className="decisions">
        {identity.concepts.map((concept) => (
          <div key={concept.term}>
            <dt>{concept.term}</dt>
            <dd>{rich(concept.meaning)}</dd>
          </div>
        ))}
      </dl>

      <h3>Quick start</h3>
      <p className="note">These examples work once the service is built and deployed.</p>
      {identity.quickstart.map((step, index) => (
        <div className="step" key={step.title}>
          <h4>
            {index + 1}. {step.title}
          </h4>
          <p>{rich(step.text)}</p>
          <Code>{step.code}</Code>
        </div>
      ))}

      <h3>Configuration</h3>
      <p>
        Environment variables on the service&apos;s own deployment. Secrets are never committed.
      </p>
      <dl className="fields">
        {identity.env.map((variable) => (
          <div key={variable.name}>
            <dt>
              <code>{variable.name}</code>
              {variable.secret === "Yes" && <span className="chip">secret</span>}
            </dt>
            <dd>{rich(variable.value)}</dd>
          </div>
        ))}
      </dl>

      <h3>Open questions</h3>
      <ul className="plain-list">
        {identity.openQuestions.map((question) => (
          <li key={question}>{rich(question)}</li>
        ))}
      </ul>

      <DocLink path="docs/services/identity/README.md" label="Developer guide on GitHub" />
      <DocLink path="docs/infra/cognito.md" label="AWS Cognito setup steps" />
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
  if (!product.detailed) {
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
      <p className="note">What a person sees and what the system does, for login in version 1.</p>

      {identity.journeys.map((journey) => (
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

      <h3>When something goes wrong</h3>
      <dl className="fields">
        {identity.edgeCases.map((edge) => (
          <div key={edge.situation}>
            <dt>
              {edge.situation}
              <span className="chip">{rich(edge.code)}</span>
            </dt>
            <dd>{edge.sees}</dd>
          </div>
        ))}
      </dl>

      <DocLink path="docs/services/identity/USER-JOURNEYS.md" label="User journeys on GitHub" />
    </>
  );
}

/* --------------------------------------------------------- UI components */

function UiComponents({ product }: { product: Product }) {
  if (!product.detailed) {
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
        UI Components <span className="status">Designed</span>
      </h2>
      <p className="note">
        What the Identity service ships for apps to use, as the package{" "}
        <code>packages/ui-identity</code>.
      </p>
      <ul className="plain-list">
        {identity.uiRules.map((rule) => (
          <li key={rule}>{rich(rule)}</li>
        ))}
      </ul>

      <div className="component-grid">
        {identity.components.map((component) => (
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
          </article>
        ))}
      </div>

      <h3>Pages provided by AWS Cognito in version 1</h3>
      <p className="note">
        These are not 01scale components. 01scale&apos;s own pages replace them in version 2.
      </p>
      <dl className="decisions">
        {identity.hostedPages.map((page) => (
          <div key={page.page}>
            <dt>{page.page}</dt>
            <dd>{page.what}</dd>
          </div>
        ))}
      </dl>

      <DocLink path="docs/services/identity/UI-COMPONENTS.md" label="UI components on GitHub" />
    </>
  );
}

/* --------------------------------------------------------------- API spec */

function ApiSpec({ product }: { product: Product }) {
  if (!product.detailed) {
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

  const { overview } = identity;
  return (
    <>
      <h2>
        API Spec <span className="status">Designed</span>
      </h2>
      <p className="note">
        Base address: <code>https://01scale.com{overview.base}</code>. Open an endpoint for its
        inputs, constraints, errors and samples.
      </p>

      {identity.endpoints.map((endpoint) => (
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

      <h3>Errors</h3>
      <p>
        Every error has the same shape and a stable <code>code</code> to branch on.
      </p>
      <Code>{identity.errorSample}</Code>

      <h3>Cookies</h3>
      <dl className="fields">
        {identity.cookies.map((cookie) => (
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

      <h3>Access token</h3>
      <p>A signed token (JWT, ES256) that lives 5 minutes. Browsers never see it.</p>
      <dl className="fields">
        {identity.claims.map((claim) => (
          <div key={claim.claim}>
            <dt>{rich(claim.claim)}</dt>
            <dd>{claim.meaning}</dd>
            <dd className="constraint">Example: {rich(claim.example)}</dd>
          </div>
        ))}
      </dl>

      <h3>Handled without an endpoint</h3>
      <dl className="decisions">
        {identity.noEndpoint.map((item) => (
          <div key={item.topic}>
            <dt>{item.topic}</dt>
            <dd>{rich(item.how)}</dd>
          </div>
        ))}
      </dl>

      <h3>Constraints at the API level</h3>
      <ul className="plain-list">
        {identity.rules[0].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>

      <DocLink path="docs/services/identity/API-SPEC.md" label="API specification on GitHub" />
    </>
  );
}

/* ------------------------------------------------------------- Data model */

function DataModel({ product }: { product: Product }) {
  if (!product.detailed) {
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

      <h3>Entities</h3>
      <div className="cards">
        {identity.entities.map((entity) => (
          <div className="card" key={entity.name}>
            <p className="card-title">{entity.name}</p>
            <p>{entity.what}</p>
            <p className="muted">{rich(entity.relations)}</p>
            <p>{rich(entity.table)}</p>
          </div>
        ))}
      </div>

      <h3>Life of each record</h3>
      <dl className="decisions">
        {identity.lifecycles.map((item) => (
          <div key={item.name}>
            <dt>{item.name}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>

      <h3>Fields</h3>
      {identity.tables.map((table) => (
        <details className="more" key={table.name} open={table.name === "identity.users"}>
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
      <p className="note">{rich(identity.otherTables)}</p>

      <h3>{identity.rules[2].level}</h3>
      <ul className="plain-list">
        {identity.rules[2].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>

      <h3>What is deliberately not stored</h3>
      <ul className="plain-list">
        <li>Passwords: they live only in AWS Cognito.</li>
        <li>Cognito&apos;s tokens: used once at the callback and discarded.</li>
        <li>The session token itself: only its hash.</li>
        <li>Access tokens: they are verified by signature, never looked up.</li>
      </ul>

      <DocLink path="docs/services/identity/DATA-MODEL.md" label="Data model on GitHub" />
    </>
  );
}

/* ----------------------------------------------------------------- Schema */

function Schema({ product }: { product: Product }) {
  if (!product.detailed) {
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
      <p className="note">
        The SQL for the tables login uses, in the <code>identity</code> schema. No other service
        can read them.
      </p>
      <Code>{identity.ddl}</Code>

      <h3>{identity.rules[1].level}</h3>
      <ul className="plain-list">
        {identity.rules[1].items.map((item) => (
          <li key={item}>{rich(item)}</li>
        ))}
      </ul>

      <h3>Constraints and indexes by table</h3>
      {identity.tables.map((table) => (
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
      {identity.tables.map((table) => (
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

      <h3>Common queries</h3>
      {identity.queries.map((query) => (
        <div key={query.title}>
          <h4>{query.title}</h4>
          <Code>{query.sql}</Code>
        </div>
      ))}

      <DocLink path="docs/services/identity/SCHEMA.md" label="Schema on GitHub" />
    </>
  );
}

export function TabContent({ product, tab }: { product: Product; tab: TabSlug }) {
  switch (tab) {
    case "readme":
      return <ReadMe product={product} />;
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
  }
}
