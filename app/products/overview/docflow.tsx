import type { AppOverviewData } from "../app-overview";
import { DocflowDiagram } from "../docflow-diagram";

// DocFlow V1's Overview content (MVP1-E0-50), from docs/prd/MVP1-PRD.md and MVP2-PRD.md.
// Its design diagram is MVP1-E0-51.
export const docflowOverview: AppOverviewData = {
  tryIt: {
    text: "Click through the whole DocFlow V1 journey: sign in, upload an invoice, watch it being read, check the flagged fields, pay in test mode and download the results.",
    href: "/products/docflow/user-journey#try-it",
    fullScreen: "/products/docflow/try",
  },
  problem: [
    "Small businesses and bookkeepers retype invoice data into spreadsheets and accounting tools by hand. Tools that automate it either make silent mistakes or ask people to review every field.",
    "People need extraction that is right on the easy fields and honest about the hard ones.",
  ],
  personas: [
    {
      kind: "Primary",
      name: "Priya, a bookkeeper",
      text: "Handles invoices for 3 to 10 small clients, about 50 a month. She wants clean CSV files for her accounting tool and does not trust tools that hide mistakes.",
    },
    {
      kind: "Secondary",
      name: "A hiring manager",
      text: "Visits 01scale.com, signs up with a test account and runs the whole journey, from sign-up to downloaded files, in under three minutes.",
    },
  ],
  product: [
    "DocFlow takes a document, starting with invoices, and returns its contents as structured data. A user signs in, uploads the document, and Claude extracts every field with a confidence score and the exact text it was read from.",
    "Fields the system is unsure about go to a person, who accepts or corrects them with the evidence beside each one. The user then previews the result, pays, and receives the files by download and email.",
  ],
  design: {
    title: "DocFlow at a glance",
    summary: "The seven steps, what goes in and comes out, the services behind each step and what it runs on.",
    diagram: <DocflowDiagram />,
  },
  versions: {
    V1: {
      title: "One invoice, end to end",
      text: "Sign up, upload an invoice, watch it extracted, fix the few fields the system flags, preview the results, pay, and download JSON and CSV. Under three minutes on a phone.",
      notIn:
        "documents other than invoices, more than one document at a time, links to accounting tools such as QuickBooks or Xero, and real money (payments stay in test mode).",
    },
    V2: {
      title: "Many documents, more trust",
      text: "Batches of up to 10 documents, a second model that checks the first, vendor details enriched from the web with sources, fixes by describing the change in plain language, saved cards, SMS and push notifications, and passwordless sign-in with passkeys.",
    },
  },
};
