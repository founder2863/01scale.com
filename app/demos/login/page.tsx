import type { Metadata } from "next";
import type { ReactNode } from "react";
import { guide } from "./guide";

export const metadata: Metadata = {
  title: "Login using AWS — 01scale",
  description:
    "Developer guide for the Identity service, version 1: sign-up, sign-in and sessions with AWS Cognito. API, data model and constraints.",
};

const DOCS_URL = "https://github.com/founder2863/01scale.com/tree/main/docs/services/identity";
const SETUP_URL = "https://github.com/founder2863/01scale.com/blob/main/docs/infra/cognito.md";

const sections = [
  ["overview", "Overview"],
  ["flow", "How it works"],
  ["quickstart", "Quick start"],
  ["api", "API"],
  ["data", "Data model"],
  ["constraints", "Constraints"],
  ["setup", "Setup"],
];

// Renders `code` spans written with backticks in the guide text.
function rich(text: string): ReactNode {
  return text.split("`").map((part, index) =>
    index % 2 === 1 ? <code key={index}>{part}</code> : part,
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="code">
      <code>{children}</code>
    </pre>
  );
}

export default function LoginGuide() {
  const { overview } = guide;

  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Identity service · Developer guide</p>
          <h1>Login using AWS</h1>
          <p className="lead">
            Sign-up, sign-in and sessions with AWS Cognito, behind an API that
            every other 01scale service trusts.
          </p>
          <p className="hero-meta">
            <span>{overview.version}</span>
            <span>{overview.status}</span>
          </p>
        </div>
      </section>

      <div className="container content guide">
        <nav className="toc" aria-label="On this page">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>

        <section id="overview">
          <h2 className="group-title">What this service is</h2>
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

          <h3>In this version</h3>
          <ul className="plain-list">
            {overview.scope_in.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3>Not in this version</h3>
          <ul className="plain-list muted">
            {overview.scope_out.map((item) => (
              <li key={item}>{rich(item)}</li>
            ))}
          </ul>
        </section>

        <section id="flow">
          <h2 className="group-title">How login works</h2>
          <ol className="flow">
            {guide.flow.map((step) => (
              <li key={step.what}>
                <strong>{step.who}.</strong> {rich(step.what)}
              </li>
            ))}
          </ol>

          <h3>Words used here</h3>
          <dl className="decisions">
            {guide.concepts.map((concept) => (
              <div key={concept.term}>
                <dt>{concept.term}</dt>
                <dd>{rich(concept.meaning)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="quickstart">
          <h2 className="group-title">Quick start</h2>
          <p className="note">These examples work once the service is built and deployed.</p>
          {guide.quickstart.map((step, index) => (
            <div className="step" key={step.title}>
              <h3>
                {index + 1}. {step.title}
              </h3>
              <p>{rich(step.text)}</p>
              <Code>{step.code}</Code>
            </div>
          ))}
        </section>

        <section id="api">
          <h2 className="group-title">
            API <span className="status">Designed</span>
          </h2>
          <p className="note">
            Base address: <code>https://01scale.com{overview.base}</code>. Tap an endpoint for its
            inputs, constraints, errors and samples.
          </p>

          {guide.endpoints.map((endpoint) => (
            <details className="endpoint" key={endpoint.id} id={endpoint.id}>
              <summary>
                <span className={`method method-${endpoint.method.toLowerCase()}`}>
                  {endpoint.method}
                </span>
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
                            {param.required === "No" ? "optional" : rich(param.required.toLowerCase().startsWith("yes") ? "required" : param.required)}
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

                <h4>Sample request</h4>
                <Code>{endpoint.request}</Code>
                <h4>Sample response</h4>
                <Code>{endpoint.response}</Code>
              </div>
            </details>
          ))}

          <h3>Errors</h3>
          <p>
            Every error has the same shape and a stable <code>code</code> to branch on.
          </p>
          <Code>{guide.errorSample}</Code>

          <h3>Cookies</h3>
          <dl className="fields">
            {guide.cookies.map((cookie) => (
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
            {guide.claims.map((claim) => (
              <div key={claim.claim}>
                <dt>{rich(claim.claim)}</dt>
                <dd>{claim.meaning}</dd>
                <dd className="constraint">Example: {rich(claim.example)}</dd>
              </div>
            ))}
          </dl>

          <h3>Handled without an endpoint</h3>
          <dl className="decisions">
            {guide.noEndpoint.map((item) => (
              <div key={item.topic}>
                <dt>{item.topic}</dt>
                <dd>{rich(item.how)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="data">
          <h2 className="group-title">
            Data model <span className="status">Designed</span>
          </h2>
          <p className="note">
            Four tables in the <code>identity</code> schema. No other service can read them; other
            services refer to a user by ID only.
          </p>

          {guide.tables.map((table) => (
            <div className="table-block" key={table.name}>
              <h3>
                <code>{table.name}</code>
              </h3>
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

              <details className="more">
                <summary>Constraints and indexes</summary>
                <ul className="plain-list">
                  {table.constraints.map((constraint) => (
                    <li key={constraint}>{rich(constraint)}</li>
                  ))}
                </ul>
              </details>

              <details className="more">
                <summary>Sample data</summary>
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
              </details>
            </div>
          ))}
          <p className="note">{rich(guide.otherTables)}</p>
        </section>

        <section id="constraints">
          <h2 className="group-title">Constraints at each level</h2>
          {guide.rules.map((rule) => (
            <div key={rule.level}>
              <h3>{rule.level}</h3>
              <ul className="plain-list">
                {rule.items.map((item) => (
                  <li key={item}>{rich(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section id="setup">
          <h2 className="group-title">Setup</h2>
          <p>
            The service needs an AWS Cognito user pool and these settings. Secrets live only in
            the service&apos;s environment, never in the repository.
          </p>
          <dl className="fields">
            {guide.env.map((variable) => (
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
            {guide.openQuestions.map((question) => (
              <li key={question}>{rich(question)}</li>
            ))}
          </ul>

          <p className="button-row">
            <a className="button button-solid" href={SETUP_URL}>
              AWS setup steps
            </a>
            <a className="button button-outline" href={DOCS_URL}>
              Full documents on GitHub
            </a>
          </p>
        </section>
      </div>
    </>
  );
}
