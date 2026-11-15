import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product demos — 01scale",
  description: "The modules that make up DocFlow, each shipped as a working demo.",
};

type Module = { title: string; description: string };

const mvp1: Module[] = [
  {
    title: "Login using AWS",
    description:
      "Sign up, sign in and password reset with AWS Cognito, integrated through standard OIDC.",
  },
  {
    title: "Account management",
    description: "An account page to view and update your details, with protected routes.",
  },
  {
    title: "Document upload",
    description: "Upload an invoice from the browser straight to a private AWS S3 bucket.",
  },
  {
    title: "Extraction with Claude",
    description:
      "Claude turns the document into structured data, with a confidence score and evidence for every field.",
  },
  {
    title: "Human review",
    description: "Review only the fields the system is unsure about, with the evidence beside each one.",
  },
  {
    title: "JSON and CSV output",
    description: "Preview the final JSON, metadata and CSV before paying.",
  },
  {
    title: "Payment",
    description: "A one-time payment per document with Stripe Checkout in test mode.",
  },
  {
    title: "Download and email delivery",
    description: "Get the files immediately by secure download, with a copy by email.",
  },
];

const mvp2: Module[] = [
  {
    title: "Passwordless login, built by hand",
    description: "Magic links, passkeys and sessions on our own identity provider, replacing AWS Cognito.",
  },
  {
    title: "Multi-document pipeline",
    description: "Process a batch of documents in parallel with LangGraph on AWS Lambda.",
  },
  {
    title: "LLM as judge",
    description: "A second, independent model check that catches the extractor's mistakes.",
  },
  {
    title: "Web enrichment and chat correction",
    description: "Add cited context from the web, and fix data by describing the change in plain language.",
  },
  {
    title: "Multi-document review and outputs",
    description: "Review a whole batch in tabs and export combined outputs.",
  },
  {
    title: "Saved payment methods",
    description: "Saved cards, a default method and payment history.",
  },
  {
    title: "Notifications",
    description: "Email, SMS and push notifications, with preferences per channel and event.",
  },
];

function ModuleList({ modules, start }: { modules: Module[]; start: number }) {
  return (
    <ol className="modules" start={start}>
      {modules.map((module, index) => (
        <li key={module.title}>
          <span className="module-number">{start + index}.</span>
          <div className="module-body">
            <div className="module-title">
              {module.title}
              <span className="status">Planned</span>
            </div>
            <p>{module.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function Demos() {
  return (
    <>
      <h1>Product demos</h1>
      <p className="lead">
        DocFlow is built one module at a time. Each module below becomes a
        working demo as it ships.
      </p>

      <h2>MVP1 · The full journey, end to end</h2>
      <ModuleList modules={mvp1} start={1} />

      <h2>MVP2 · Own identity, many documents, trustworthy AI</h2>
      <ModuleList modules={mvp2} start={mvp1.length + 1} />
    </>
  );
}
