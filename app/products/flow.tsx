import Link from "next/link";
import { APPS, appHref, appVersions, serviceKeysOf, versionOf, type AppKey, type Version } from "./apps";
import { products } from "./data";

// DocFlow's name, kept here for the pages that still say "the product"; it comes from apps.ts.
export const PRODUCT_NAME = APPS.docflow.name;

type FlowStep = {
  key: string;
  label: string;
  service: string;
  does: string;
  later?: string;
  // The module pages that belong to this step; empty for a step the app does itself.
  modules: readonly string[];
};

// DocFlow's end-to-end flow. Each step is one platform component; `modules` lists the
// product pages that belong to the step (the MVP1 module first, then MVP2 additions).
const docflowSteps: readonly FlowStep[] = [
  {
    key: "sign-in",
    label: "Sign in",
    service: "Identity",
    does: "The user creates an account or signs in.",
    later: "Passwordless sign-in and passkeys, built by hand.",
    modules: ["login-using-aws", "account-management", "passwordless-login"],
  },
  {
    key: "upload",
    label: "Upload",
    service: "Upload",
    does: "A document goes from the browser straight to private storage.",
    later: "Batches of up to 10 documents.",
    modules: ["document-upload", "multi-document-pipeline"],
  },
  {
    key: "extract",
    label: "Extract",
    service: "LLM Extraction",
    does: "Claude turns the document into fields, each with a confidence score and evidence.",
    later: "A second model judges the first; vendor details are enriched from the web.",
    modules: [
      "extraction-with-claude",
      "multi-document-pipeline",
      "llm-as-judge",
      "web-enrichment-and-chat-correction",
    ],
  },
  {
    key: "review",
    label: "Review",
    service: "Human Review",
    does: "A person checks only the fields the system is unsure about.",
    later: "Fix data by describing the change in plain language; review a whole batch.",
    modules: ["human-review", "web-enrichment-and-chat-correction", "multi-document-review"],
  },
  {
    key: "results",
    label: "Results",
    service: `${APPS.docflow.name} app`,
    does: "The final JSON and CSV are previewed before paying.",
    later: "Combined outputs for a batch.",
    modules: ["json-and-csv-output", "multi-document-review"],
  },
  {
    key: "pay",
    label: "Pay",
    service: "Payment",
    does: "A one-time payment unlocks the download.",
    later: "Saved cards and one-tap payment.",
    modules: ["payment", "saved-payment-methods"],
  },
  {
    key: "deliver",
    label: "Deliver",
    service: "Delivery",
    does: "The files are downloaded and a copy is sent by email.",
    later: "SMS and push notifications.",
    modules: ["download-and-email-delivery", "notifications"],
  },
];

// AutoRep's flow, from docs/prd/AUTOREP-PRD.md (MVP1-E0-35). Steps the app does itself have no module page.
const autorepSteps: readonly FlowStep[] = [
  {
    key: "sign-in",
    label: "Sign in",
    service: "Identity",
    does: "The business owner signs in.",
    modules: ["login-using-aws", "account-management"],
  },
  {
    key: "ingest",
    label: "Ingest",
    service: `${APPS.autorep.name} app`,
    does: "New reviews come from Google Business Profile, or from recorded reviews in demo mode.",
    modules: [],
  },
  {
    key: "analyse",
    label: "Analyse ‖ Research",
    service: `${APPS.autorep.name} agents`,
    does: "The Analyst reads the review while the Researcher gathers sourced facts with its tools.",
    modules: [],
  },
  {
    key: "draft",
    label: "Draft and critique",
    service: `${APPS.autorep.name} agents`,
    does: "The Writer drafts a reply; the Critic checks it against fixed rules, up to two revisions.",
    modules: [],
  },
  {
    key: "approve",
    label: "Approve",
    service: "Human Review",
    does: "Below 4★ or flagged risky, the owner approves or edits the reply.",
    modules: ["human-review"],
  },
  {
    key: "notify",
    label: "Notify",
    service: "Delivery",
    does: "The owner is emailed when a reply needs approval.",
    modules: ["download-and-email-delivery"],
  },
  {
    key: "publish",
    label: "Publish",
    service: `${APPS.autorep.name} app`,
    does: "The reply is posted once, whatever retries happen.",
    modules: [],
  },
];

// One flow per app. P2PFlow has none until it is designed.
export const flows: Partial<Record<AppKey, readonly FlowStep[]>> = {
  docflow: docflowSteps,
  autorep: autorepSteps,
};

// Kept for the DocFlow V1 page, which lists what each step adds over time.
export const flowSteps = docflowSteps;

// The app versions that use a module (MVP1-E0-35 AC2): the module is in the app's flow, and that
// app version is built on the module's service at the module's version.
export function appsUsing(module: string): { app: AppKey; version: Version }[] {
  const product = products.find((item) => item.slug === module);
  if (!product) return [];
  const version = versionOf(product.group);
  const services = serviceKeysOf(product);
  return appVersions
    .filter(
      (entry) =>
        flows[entry.app]?.some((step) => step.modules.includes(module)) &&
        services.some((service) => entry.builtOn[service] === version),
    )
    .map((entry) => ({ app: entry.app, version: entry.version }));
}

/**
 * An app's flow as a row of steps. With `current` set to a module, the steps that
 * module belongs to are highlighted and the rest are greyed out.
 */
export function Flow({
  app = "docflow",
  version = "V1",
  current,
  detailed = false,
}: {
  app?: AppKey;
  version?: Version;
  current?: string;
  detailed?: boolean;
}) {
  const steps = flows[app] ?? [];
  return (
    <ol className={detailed ? "product-flow product-flow-detailed" : "product-flow"}>
      {steps.map((step, index) => {
        const active = current === undefined || step.modules.includes(current);
        const here = current !== undefined && active;
        const href = step.modules.length > 0 ? `/products/${step.modules[0]}` : appHref(app, version);
        return (
          <li
            key={step.key}
            className={active ? "flow-step" : "flow-step is-dimmed"}
            aria-current={here ? "step" : undefined}
          >
            <Link href={href}>
              <span className="flow-step-number">{index + 1}</span>
              <span className="flow-step-label">{step.label}</span>
              <span className="flow-step-service">{step.service}</span>
              {detailed && <span className="flow-step-does">{step.does}</span>}
              {here && <span className="flow-step-here">This component</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
