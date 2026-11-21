import { products, type Product } from "./data";

// The apps and their versions (MVP1-E0-32). Each name is defined once, here, so a rename is one edit.
// Versions are what visitors see; phases (MVP1, MVP2) stay the way the work is organised.
export const APPS = {
  docflow: {
    name: "DocFlow",
    tagline: "Turn a document into structured data you can trust.",
  },
  autorep: {
    name: "AutoRep",
    tagline: "AI-drafted replies to Google reviews, checked by a critic and approved by the owner when it matters.",
  },
  p2pflow: {
    name: "P2PFlow",
    tagline: "Procure-to-pay: purchase orders, invoices and payments, from the same services.",
  },
} as const;

export type AppKey = keyof typeof APPS;

export const SERVICES_NAME = "Services";

export const VERSIONS = [
  { version: "V1", phase: "MVP1" },
  { version: "V2", phase: "MVP2" },
] as const;

export type Version = (typeof VERSIONS)[number]["version"];
export type Phase = (typeof VERSIONS)[number]["phase"];

export const APP_ORDER: readonly AppKey[] = ["docflow", "autorep", "p2pflow"];

export function phaseOf(version: Version): Phase {
  return version === "V1" ? "MVP1" : "MVP2";
}

export function versionOf(phase: string): Version {
  return phase === "MVP2" ? "V2" : "V1";
}

export function appLabel(app: AppKey, version: Version) {
  return `${APPS[app].name} ${version}`;
}

export function appHref(app: AppKey, version: Version) {
  return `/products/${app}-${version.toLowerCase()}`;
}

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

type AppVersion = {
  app: AppKey;
  version: Version;
  status: string;
  // Shown under the title; from the app's PRD or its vision.
  summary?: string;
  // Set when nothing is designed yet: what will appear (MVP1-E0-33 AC2).
  comingSoon?: string;
  docs?: readonly { label: string; href: string }[];
};

// One entry per app version, in menu order within each version.
export const appVersions: readonly AppVersion[] = [
  { app: "docflow", version: "V1", status: "Designed" },
  {
    app: "autorep",
    version: "V1",
    status: "In design",
    summary:
      "A team of AI agents answers each Google review. The Analyst and the Researcher work in parallel, the Writer drafts a reply from sourced facts only, and the Critic checks it against fixed rules, sending it back up to twice. Replies to reviews of 4★ or more with no risk flag are published; anything else waits for the owner's approval. It reuses Identity, Human Review and Delivery unchanged.",
    docs: [
      { label: "AutoRep PRD", href: `${REPO}/docs/prd/AUTOREP-PRD.md` },
      { label: "AutoRep stories", href: `${REPO}/docs/epics/AUTOREP-EPICS.md` },
      { label: "AutoRep decisions", href: `${REPO}/docs/decisions/AUTOREP-E1.md` },
    ],
  },
  {
    app: "p2pflow",
    version: "V1",
    status: "Coming soon",
    comingSoon: "The procure-to-pay journey and the services it reuses will appear here when it is designed.",
  },
  {
    app: "docflow",
    version: "V2",
    status: "Planned",
    summary:
      "Batches of documents, a second model that judges the first, web enrichment with sources, fixes by chat, saved cards, notifications, and sign-in rebuilt by hand with passkeys.",
  },
  {
    app: "autorep",
    version: "V2",
    status: "Coming soon",
    comingSoon:
      "Analytics, a vector database, Slack, posting without approval, several locations and languages other than English, as listed for V2 in the AutoRep PRD, will appear here when V2 is designed.",
  },
  {
    app: "p2pflow",
    version: "V2",
    status: "Coming soon",
    comingSoon: "P2PFlow's second version will appear here when it is designed.",
  },
];

export function findAppVersion(app: AppKey, version: Version) {
  return appVersions.find((item) => item.app === app && item.version === version)!;
}

// The six platform services, in the order of the DocFlow journey (MVP1-E0-34).
export const SERVICE_NAMES = ["Identity", "Upload", "LLM Extraction", "Human Review", "Payment", "Delivery"] as const;

// A module can belong to two services, written "LLM Extraction and Human Review".
function servicesOf(product: Product) {
  return product.service.split(" and ");
}

// The platform services of one version, each with its modules; built from data.ts so a new module
// appears without editing the menu. Services with no module in that version are left out.
export function servicesFor(version: Version) {
  const phase = phaseOf(version);
  return SERVICE_NAMES.map((service) => ({
    service,
    modules: products.filter((product) => product.group === phase && servicesOf(product).includes(service)),
  })).filter((entry) => entry.modules.length > 0);
}

export function servicesHref(version: Version, service?: string) {
  const anchor = service ? `services-${version.toLowerCase()}-${service.toLowerCase().replace(/\s+/g, "-")}` : `services-${version.toLowerCase()}`;
  return `/products#${anchor}`;
}
