import Link from "next/link";

// The product's working name lives here so a rename is one edit.
export const PRODUCT_NAME = "DocFlow";
export const VISION_HREF = "/products/vision";

// The end-to-end flow. Each step is one platform component; `modules` lists the
// product pages that belong to the step (the MVP1 module first, then MVP2 additions).
export const flowSteps = [
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
    service: `${PRODUCT_NAME} app`,
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
] as const;

/**
 * The flow as a row of steps. With `current` set to a module, the steps that
 * module belongs to are highlighted and the rest are greyed out.
 */
export function Flow({ current, detailed = false }: { current?: string; detailed?: boolean }) {
  return (
    <ol className={detailed ? "product-flow product-flow-detailed" : "product-flow"}>
      {flowSteps.map((step, index) => {
        const modules: readonly string[] = step.modules;
        const active = current === undefined || modules.includes(current);
        const here = current !== undefined && active;
        return (
          <li
            key={step.key}
            className={active ? "flow-step" : "flow-step is-dimmed"}
            aria-current={here ? "step" : undefined}
          >
            <Link href={`/products/${step.modules[0]}`}>
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
