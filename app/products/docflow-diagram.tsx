import Link from "next/link";
import { serviceHref, serviceLabel, type ServiceKey } from "./apps";
import { DiagramNode, Down, type Accent } from "./app-diagram";
import { flowSteps } from "./flow";

// DocFlow V1 at a glance (MVP1-E0-51), laid out like AutoRep's diagram (AUTOREP-E6-03) and built from
// the same parts. Content from docs/prd/MVP1-PRD.md (§6, §7, §8, §10, §12) and
// docs/architecture/ARCHITECTURE.md ("How it runs", §12.2 and §12.4).

const inputs = [
  {
    title: "An invoice",
    note: "The only document type in V1",
    items: ["PDF, PNG or JPG", "Up to 10 MB and 10 pages", "Checked by its content, not its extension"],
  },
  {
    title: "A test account",
    note: "Cognito managed login, through OIDC",
    items: ["Email and password", "A verified email address"],
  },
  {
    title: "A test card",
    note: "Stripe Checkout in test mode",
    items: ["4242 4242 4242 4242", "No real money moves"],
  },
];

const outputs = [
  { title: "result.json", items: ["Every field with its value and a metadata block", "Stored in S3"] },
  { title: "result.csv", items: ["Safe against CSV injection", "Ready for an accounting tool"] },
  { title: "Download + email", items: ["Unlocked after payment", "5-minute links; an email with a link to the results"] },
  { title: "Audit trail", items: ["Every review change, payment and delivery"] },
];

const infrastructure: { title: string; accent: Accent; text: string }[] = [
  { title: "Vercel", accent: "purple", text: "Next.js. Each service is its own project; the gateway at 01scale.com/api routes every call." },
  { title: "Neon Postgres", accent: "green", text: "One project, a schema and role per service. DocFlow's process record lives in its own schema." },
  { title: "AWS S3", accent: "amber", text: "Private and encrypted. Presigned links that expire in 5 minutes; files deleted after 30 days." },
  { title: "Claude API", accent: "blue", text: "Inside Extraction only. Opus 5.5, then Haiku 5.5: $5 + $5 a month. Under $0.10 per document." },
  { title: "Security", accent: "red", text: "Delegated 5-minute tokens, signed events from an outbox, idempotent calls, verified Stripe webhooks, no document contents in logs." },
];

const services: { key: ServiceKey; does: string }[] = [
  { key: "identity", does: "sign-in with Cognito" },
  { key: "upload", does: "the file, straight to S3" },
  { key: "extraction", does: "fields with confidence and evidence" },
  { key: "review", does: "a person checks flagged fields" },
  { key: "payment", does: "Stripe Checkout" },
  { key: "delivery", does: "the results email" },
];

export function DocflowDiagram() {
  return (
    <section className="ar" aria-labelledby="df-title">
      <header className="ar-head">
        <h2 id="df-title">DocFlow: invoices to structured data you can trust</h2>
        <p className="ar-sub">Six platform services, called in order by one thin app</p>
        <ol className="ar-steps">
          {flowSteps.map((step) => (
            <li key={step.key}>{step.label}</li>
          ))}
        </ol>
      </header>

      <div className="ar-main">
        <div className="ar-col">
          <p className="ar-col-title">Inputs</p>
          {inputs.map((item) => (
            <div className="ar-card" key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <p className="ar-card-note">{item.note}</p>
              <ul>
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ar-graph">
          <p className="ar-col-title">DocFlow&apos;s orchestration, every call through the gateway</p>
          <div className="ar-start">The user signs in and uploads an invoice</div>
          <Down />
          <DiagramNode n={1} name="Sign in · Identity" accent="purple">
            <p className="ar-node-text">Cognito managed login (OIDC with PKCE)</p>
          </DiagramNode>
          <Down />
          <DiagramNode n={2} name="Upload · Upload" accent="amber">
            <p className="ar-node-text">Browser to private S3 with a presigned link</p>
          </DiagramNode>
          <Down />
          <DiagramNode n={3} name="Extract · LLM Extraction" accent="blue">
            <p className="ar-node-text">Claude with a strict schema: value, confidence and source quote per field, then rule checks</p>
          </DiagramNode>
          <Down />
          <div className="ar-router">
            <strong>Confidence router</strong>
            <span>Every field 0.85 or more, and every check passed?</span>
          </div>
          <div className="ar-branches">
            <div className="ar-branch">
              <p className="ar-branch-label ar-yes">Yes: all confident</p>
              <DiagramNode n={5} name="Results · DocFlow" accent="green">
                <p className="ar-node-text">Locked preview of the JSON and CSV</p>
              </DiagramNode>
            </div>
            <div className="ar-branch">
              <p className="ar-branch-label ar-no">No: low confidence or a failed check</p>
              <DiagramNode n={4} name="Review · Human Review" accent="red">
                <p className="ar-node-text">Accept, edit or mark &ldquo;not present&rdquo;, with the evidence; corrected values re-checked</p>
              </DiagramNode>
              <Down />
              <DiagramNode n={5} name="Results · DocFlow" accent="green">
                <p className="ar-node-text">Locked preview of the JSON and CSV</p>
              </DiagramNode>
            </div>
          </div>
          <Down />
          <DiagramNode n={6} name="Pay · Payment" accent="teal">
            <p className="ar-node-text">Stripe Checkout; a signed webhook marks the order paid</p>
          </DiagramNode>
          <Down />
          <DiagramNode n={7} name="Deliver · Delivery" accent="purple">
            <p className="ar-node-text">Downloads unlock (paid is checked on every download); email with a link</p>
          </DiagramNode>
        </div>

        <div className="ar-col">
          <p className="ar-col-title">Outputs</p>
          {outputs.map((item) => (
            <div className="ar-card" key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <ul>
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">Data & infrastructure</p>
        <div className="ar-band-grid">
          {infrastructure.map((item) => (
            <div className={`ar-card ar-${item.accent}`} key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <p className="ar-card-text">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">Platform services used</p>
        <ul className="link-list">
          {services.map((service) => (
            <li key={service.key}>
              <Link className="status" href={serviceHref(service.key, "V1")}>
                {serviceLabel(service.key, "V1")}: {service.does}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">End-to-end flow</p>
        <ol className="ar-flow">
          {flowSteps.map((step, index) => (
            <li key={step.key}>
              <span className="ar-badge">{index + 1}</span>
              <span>
                <strong>{step.label}</strong>
                <span className="ar-flow-note">{step.does}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
