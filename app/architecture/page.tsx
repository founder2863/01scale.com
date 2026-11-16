import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture — 01scale",
  description:
    "How 01scale is built: independent platform services behind one gateway, and the reasoning behind that choice.",
};

const DOC_URL =
  "https://github.com/founder2863/01scale.com/blob/main/docs/architecture/ARCHITECTURE.md";

const apps = [
  { name: "DocIntel", note: "First app" },
  { name: "Procure-to-Pay", note: "Future" },
  { name: "Order-to-Cash", note: "Future" },
];

const services = [
  { name: "Identity", job: "Sign-in, sessions, accounts" },
  { name: "Upload", job: "Secure file intake" },
  { name: "LLM Extraction", job: "Files into structured data" },
  { name: "Human Review", job: "A person checks what is uncertain" },
  { name: "Payment", job: "Orders and checkout" },
  { name: "Delivery", job: "Email, later SMS and push" },
];

const options = [
  {
    name: "One app, strict boundaries",
    alias: "Modular monolith",
    summary: "One deployment and one database, with rules that keep components apart.",
    verdict: "Fastest and cheapest, and the right answer for a single app.",
    chosen: false,
  },
  {
    name: "Separate packages",
    alias: "Packaged monolith",
    summary: "Each component is its own versioned package, still deployed together.",
    verdict: "Better boundaries, but still one release and one runtime.",
    chosen: false,
  },
  {
    name: "Separate services",
    alias: "Distributed",
    summary: "Each component is its own service with its own data, contract and release.",
    verdict: "My choice. It costs more to build and run, and I accepted that.",
    chosen: true,
  },
];

const reasons = [
  {
    title: "Components are products, apps are customers",
    text: "Identity or Extraction must stand alone, with its own release, demo and documentation. A second app adopts it by calling it, not by being built inside the first app.",
  },
  {
    title: "Each component has a long evolution ahead",
    text: "The inside gets replaced many times while the contract stays stable. Old and new versions can run side by side so each app moves when it is ready.",
  },
  {
    title: "The components do not share one technology",
    text: "Extraction becomes Python on AWS Lambda. I made that separation the pattern instead of the exception.",
  },
  {
    title: "Identity and Payment deserve hard walls",
    text: "They hold the riskiest data, so each has its own data store and its own access rules.",
  },
  {
    title: "It shows the real work of a platform",
    text: "Contracts, versioning, backward compatibility and service ownership only become real when the components are actually separate.",
  },
];

const costs = [
  "More to build before the first app works. I contain it with one service template every service copies.",
  "No single transaction across services. I rely on safe-to-repeat calls, events that cannot be lost, and a process record that can resume.",
  "Harder debugging. One request ID travels through every service.",
  "The reason is reuse and independent evolution, not scale. This is a one-person project with low traffic, and I say so.",
];

const flow = [
  "DocIntel asks Upload to store the file",
  "DocIntel asks Extraction to start a job",
  "Extraction tells DocIntel the job finished",
  "DocIntel asks Review to open a task",
  "DocIntel asks Payment to create an order",
  "Payment tells DocIntel the order was paid",
  "DocIntel asks Delivery to send the email",
];

const ladders = [
  {
    name: "Identity",
    steps: [
      "AWS Cognito through standard OIDC",
      "Own sessions and account management",
      "Hand-built passwordless: magic links and codes",
      "Passkeys, recovery codes, re-authentication",
      "An identity provider for other apps: SSO, provisioning, roles",
    ],
  },
  {
    name: "LLM Extraction",
    steps: [
      "One model call with a strict schema",
      "Orchestration: multi-step, fan-out, resume",
      "Guardrails: schema, rule checks, source verification",
      "Cost-efficient model routing",
      "Latency management",
      "Logs and observability",
      "LLM-as-judge, compared with human decisions",
    ],
  },
];

const decisions = [
  ["Architecture", "Independent services behind one gateway"],
  ["Repository", "One repository, one folder per service, each with its own pipeline and version"],
  ["Hosting", "One Vercel project per service; Extraction moves to AWS Lambda"],
  ["Database", "One Neon project, a schema and login per service, nothing shared"],
  ["Communication", "The app orchestrates with API calls; services report completion with signed events"],
  ["Consistency", "Strong inside a service, eventual between services, never optimistic about money"],
  ["Every service ships", "UI components, an API, MCP tools for AI agents, and its own demo page"],
];

export default function Architecture() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Platform design</p>
          <h1>Architecture</h1>
          <p className="lead">
            01scale is a set of independent platform services. Apps are
            assembled from them. This is how it fits together and why I built
            it this way.
          </p>
        </div>
      </section>

      <div className="container content">
        <section>
          <h2 className="group-title">The platform</h2>
          <div className="diagram" role="img" aria-label="Apps call a gateway, which routes to six independent platform services">
            <p className="diagram-label">Apps: business processes</p>
            <div className="diagram-row">
              {apps.map((app) => (
                <div className="node node-app" key={app.name}>
                  <strong>{app.name}</strong>
                  <span>{app.note}</span>
                </div>
              ))}
            </div>
            <div className="diagram-arrow" aria-hidden="true">↓</div>
            <div className="node node-gateway">
              <strong>Gateway</strong>
              <span>One address for people, code and AI agents</span>
            </div>
            <div className="diagram-arrow" aria-hidden="true">↓</div>
            <p className="diagram-label">Platform services: reusable, each with its own data</p>
            <div className="diagram-grid">
              {services.map((service) => (
                <div className="node node-service" key={service.name}>
                  <strong>{service.name}</strong>
                  <span>{service.job}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="note">
            A service knows nothing about the apps that use it. Upload stores
            files, not invoices. That is what lets the next app reuse it.
          </p>
        </section>

        <section>
          <h2 className="group-title">The three options I compared</h2>
          <div className="cards">
            {options.map((option, index) => (
              <div className={option.chosen ? "card card-chosen" : "card"} key={option.name}>
                <p className="eyebrow">
                  Option {index + 1} · {option.alias}
                  {option.chosen && <span className="status">Chosen</span>}
                </p>
                <p className="card-title">{option.name}</p>
                <p>{option.summary}</p>
                <p className="verdict">{option.verdict}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="group-title">Why I chose separate services</h2>
          <p className="note">
            The question I asked myself: is 01scale one app, or a platform
            that many apps consume? For one app I would have chosen option 1.
            My goal is a platform.
          </p>
          <ol className="modules">
            {reasons.map((reason, index) => (
              <li key={reason.title}>
                <span className="module-number">{index + 1}</span>
                <div className="module-body">
                  <div className="module-title">{reason.title}</div>
                  <p>{reason.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="group-title">The cost I accepted</h2>
          <ul className="plain-list">
            {costs.map((cost) => (
              <li key={cost}>{cost}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="group-title">How services talk</h2>
          <p className="note">
            The app is the conductor. It calls each service in order, and a
            service reports back when something finishes. Services never call
            the app&apos;s logic and stay unaware of each other.
          </p>
          <ol className="flow">
            {flow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="note">
            Data is strongly consistent inside a service and catches up within
            seconds between services. Where money is involved, the system
            checks at the moment of use and never guesses.
          </p>
        </section>

        <section>
          <h2 className="group-title">How each service evolves</h2>
          <p className="note">
            Every service starts by wrapping an external cloud service and
            grows into providing the capability itself. The apps keep calling
            the same contract throughout.
          </p>
          <div className="cards">
            {ladders.map((ladder) => (
              <div className="card" key={ladder.name}>
                <p className="eyebrow">{ladder.name}</p>
                <ol className="ladder">
                  {ladder.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="group-title">Decisions at a glance</h2>
          <dl className="decisions">
            {decisions.map(([topic, choice]) => (
              <div key={topic}>
                <dt>{topic}</dt>
                <dd>{choice}</dd>
              </div>
            ))}
          </dl>
          <a className="button button-solid" href={DOC_URL}>
            Read the full architecture document
          </a>
        </section>
      </div>
    </>
  );
}
