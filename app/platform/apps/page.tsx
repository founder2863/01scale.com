import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { products } from "../../products/data";

export const metadata: Metadata = {
  title: "Apps Architecture — 01scale",
  description:
    "How each app is assembled from the 01scale platform services: the order it calls them, the record it keeps, and the end-to-end flow.",
};

const DOC_URL =
  "https://github.com/founder2863/01scale.com/blob/main/docs/architecture/ARCHITECTURE.md";

type Step = { from: string; to: string; what: string; token: string | null; event: boolean };

// The DocFlow sequence is read from the Mermaid diagram in ARCHITECTURE.md §12.2 at build time,
// so this page and the architecture document cannot drift apart (MVP1-E0-23 AC3).
function docflowSequence(): { steps: Step[]; note: string | null } {
  const doc = readFileSync(join(process.cwd(), "docs/architecture/ARCHITECTURE.md"), "utf8");
  const section = doc.slice(doc.indexOf("### 12.2"));
  const block = section.slice(section.indexOf("```mermaid"), section.indexOf("```", section.indexOf("```mermaid") + 3));
  const names = new Map<string, string>();
  const steps: Step[] = [];
  let note: string | null = null;
  for (const raw of block.split("\n")) {
    const line = raw.trim();
    const participant = line.match(/^participant (\w+) as (.+)$/);
    if (participant) {
      names.set(participant[1], participant[2].replace(/ \(.*\)$/, ""));
      continue;
    }
    const noteMatch = line.match(/^Note over [^:]+: (.+)$/);
    if (noteMatch) {
      note = noteMatch[1];
      continue;
    }
    const arrow = line.match(/^(\w+)(-->>|->>)(\w+): (.+?)(?: \[(\w+)\])?$/);
    if (arrow) {
      steps.push({
        from: names.get(arrow[1]) ?? arrow[1],
        to: names.get(arrow[3]) ?? arrow[3],
        what: arrow[4],
        token: arrow[5] ?? null,
        event: arrow[2] === "-->>",
      });
    }
  }
  return { steps, note };
}

// The DocFlow process record, from story MVP1-E0-09.
const statuses = [
  "pending_upload",
  "uploaded",
  "rejected",
  "extracting",
  "extraction_failed",
  "needs_review",
  "reviewed",
  "paid",
];

const futureApps = [
  { name: "Procure-to-Pay", note: "Purchase orders, invoices and payments, reusing the same services." },
  { name: "Order-to-Cash", note: "Orders, invoicing and collection, reusing the same services." },
];

export default function AppsArchitecture() {
  const { steps, note } = docflowSequence();
  const docflowModules = products.filter((product) => product.service === "DocFlow app");
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Platform</p>
          <h1>Apps Architecture</h1>
          <p className="lead">
            An app is a thin conductor. It holds its pages, one process record
            and the order in which it calls the services. Everything a second
            app could use lives in a service.
          </p>
        </div>
      </section>

      <div className="container content">
        <section>
          <h2 className="group-title">
            DocFlow <span className="status">First app</span>
          </h2>
          <p className="note">
            A person signs in, uploads a document, Claude extracts the data, a
            person reviews what is uncertain, pays, and receives the results.
            See the <Link href="/products/vision">product vision</Link> for the
            whole journey, and{" "}
            <Link href="/platform/architecture">Platform Architecture</Link>{" "}
            for the services it calls.
          </p>

          <h3 className="section-subtitle">The order it calls the services</h3>
          {note && <p className="note">{note}.</p>}
          <table className="cost-table cost-table-text">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">From</th>
                <th scope="col">To</th>
                <th scope="col">What</th>
                <th scope="col">Carries</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr key={`${index}-${step.what}`}>
                  <th scope="row">{index + 1}</th>
                  <td data-label="From">{step.from}</td>
                  <td data-label="To">{step.to}</td>
                  <td data-label="What">{step.event ? `Event: ${step.what.replace(/^event: /, "")}` : step.what}</td>
                  <td data-label="Carries">{step.event ? "Signed event" : step.token ? `${step.token} token` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="note">
            A person token is the signed-in person&apos;s own. A delegated token
            is a 5-minute token for that person, issued by Identity to the
            acting service, used when no one is present and always for Payment
            and Delivery. A service token is the service acting as itself,
            never for a user&apos;s data. Read from the{" "}
            <a href={`${DOC_URL}#122-my-decision-orchestration-not-choreography`}>
              sequence diagram in the architecture document
            </a>
            .
          </p>

          <h3 className="section-subtitle">The process record</h3>
          <p className="note">
            DocFlow keeps one table, <code>docflow.documents</code>, holding
            only the IDs of records other services own, and a status:
          </p>
          <ul className="link-list">
            {statuses.map((status) => (
              <li key={status}>
                <code className="status">{status}</code>
              </li>
            ))}
          </ul>

          {docflowModules.length > 0 && (
            <>
              <h3 className="section-subtitle">DocFlow&apos;s own modules</h3>
              <ul className="link-list">
                {docflowModules.map((product) => (
                  <li key={product.slug}>
                    <Link href={`/products/${product.slug}`}>
                      {product.title} ({product.group})
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section>
          <h2 className="group-title">Later apps</h2>
          <div className="cards">
            {futureApps.map((app) => (
              <div className="card" key={app.name}>
                <p className="card-title">{app.name}</p>
                <div className="coming-soon">
                  <p className="coming-soon-title">Coming Soon...</p>
                  <p>{app.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
