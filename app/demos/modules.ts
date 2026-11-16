export type Module = {
  slug: string;
  title: string;
  description: string;
  // Set when the module has its own page; otherwise it links to its entry on /demos.
  href?: string;
  status?: "Planned" | "Designed" | "Live";
};

export type ModuleGroup = { tag: string; heading: string; modules: Module[] };

export const moduleGroups: ModuleGroup[] = [
  {
    tag: "MVP1",
    heading: "The full journey, end to end",
    modules: [
      {
        slug: "login-using-aws",
        title: "Login using AWS",
        description:
          "Sign up, sign in and password reset with AWS Cognito, integrated through standard OIDC.",
        href: "/demos/login",
        status: "Designed",
      },
      {
        slug: "account-management",
        title: "Account management",
        description: "An account page to view and update your details, with protected routes.",
      },
      {
        slug: "document-upload",
        title: "Document upload",
        description: "Upload an invoice from the browser straight to a private AWS S3 bucket.",
      },
      {
        slug: "extraction-with-claude",
        title: "Extraction with Claude",
        description:
          "Claude turns the document into structured data, with a confidence score and evidence for every field.",
      },
      {
        slug: "human-review",
        title: "Human review",
        description:
          "Review only the fields the system is unsure about, with the evidence beside each one.",
      },
      {
        slug: "json-and-csv-output",
        title: "JSON and CSV output",
        description: "Preview the final JSON, metadata and CSV before paying.",
      },
      {
        slug: "payment",
        title: "Payment",
        description: "A one-time payment per document with Stripe Checkout in test mode.",
      },
      {
        slug: "download-and-email-delivery",
        title: "Download and email delivery",
        description: "Get the files immediately by secure download, with a copy by email.",
      },
    ],
  },
  {
    tag: "MVP2",
    heading: "Own identity, many documents, trustworthy AI",
    modules: [
      {
        slug: "passwordless-login",
        title: "Passwordless login, built by hand",
        description:
          "Magic links, passkeys and sessions on our own identity provider, replacing AWS Cognito.",
      },
      {
        slug: "multi-document-pipeline",
        title: "Multi-document pipeline",
        description: "Process a batch of documents in parallel with LangGraph on AWS Lambda.",
      },
      {
        slug: "llm-as-judge",
        title: "LLM as judge",
        description: "A second, independent model check that catches the extractor's mistakes.",
      },
      {
        slug: "web-enrichment-and-chat-correction",
        title: "Web enrichment and chat correction",
        description:
          "Add cited context from the web, and fix data by describing the change in plain language.",
      },
      {
        slug: "multi-document-review",
        title: "Multi-document review and outputs",
        description: "Review a whole batch in tabs and export combined outputs.",
      },
      {
        slug: "saved-payment-methods",
        title: "Saved payment methods",
        description: "Saved cards, a default method and payment history.",
      },
      {
        slug: "notifications",
        title: "Notifications",
        description: "Email, SMS and push notifications, with preferences per channel and event.",
      },
    ],
  },
];
