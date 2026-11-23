import { products, type Product } from "./data";

// The apps and services, and their versions (MVP1-E0-32 to E0-34). Each name is defined once, here,
// so a rename is one edit. App versions and service versions are independent: each app version
// says which version of each service it is built on. Phases (MVP1, MVP2) stay the way the work is
// organised; a module's service version is its phase (MVP1 is V1, MVP2 is V2).

const REPO = "https://github.com/founder2863/01scale.com/blob/main";

export type Version = "V1" | "V2";
export const VERSION_LIST: readonly Version[] = ["V1", "V2"];

export function versionOf(phase: string): Version {
  return phase === "MVP2" ? "V2" : "V1";
}

export function phaseOf(version: Version) {
  return version === "V1" ? "MVP1" : "MVP2";
}

// ---------------------------------------------------------------- services

export const SERVICES = {
  identity: {
    name: "Identity",
    tagline: "Sign-in, sessions and accounts, for people and for AI agents.",
    // ARCHITECTURE.md §8. Numbered as steps, not versions, so they are not confused with V1 and V2.
    path: [
      "AWS Cognito managed login through standard OIDC",
      "Own sessions and account management around Cognito",
      "Hand-built passwordless: magic links, one-time codes",
      "Passkeys, recovery codes, re-authentication",
      "An identity provider for other apps: SSO, provisioning, organizations and roles",
    ],
  },
  upload: {
    name: "Upload",
    tagline: "Files from a browser or an app's server, straight to private storage.",
    path: [
      "Presigned uploads to AWS S3",
      "Content checks, virus scanning, retention policies, resumable and batch uploads",
    ],
  },
  extraction: {
    name: "LLM Extraction",
    tagline: "Documents into structured data, each field with a confidence score and evidence.",
    path: [
      "One model call with a strict output schema",
      "Orchestration: multi-step pipeline, fan-out per document, resume on failure",
      "Guardrails: schema validation, rule checks, source-quote verification, PII limits",
      "Cost-efficient model routing",
      "Latency management: batching, caching, parallelism, time budgets",
      "Logs and observability",
      "LLM-as-judge, compared with human decisions",
    ],
  },
  review: {
    name: "Human Review",
    tagline: "A person checks only what the system is unsure about.",
    path: [
      "A review queue for flagged fields",
      "Configurable review rules, assignment, service levels, corrections feeding evals",
    ],
  },
  payment: {
    name: "Payment",
    tagline: "Orders, checkout and payment status, through Stripe.",
    path: ["Stripe Checkout", "Saved methods, one-tap pay, payment history, later metering and invoicing"],
  },
  delivery: {
    name: "Delivery",
    tagline: "Email now; SMS, push and preferences later.",
    path: ["Email through Resend", "A notification service: email, SMS, push, preferences, delivery log"],
  },
} as const;

export type ServiceKey = keyof typeof SERVICES;
export const SERVICE_ORDER: readonly ServiceKey[] = ["identity", "upload", "extraction", "review", "payment", "delivery"];

export function serviceKeyOf(name: string): ServiceKey | undefined {
  return SERVICE_ORDER.find((key) => SERVICES[key].name === name);
}

// A module can belong to two services, written "LLM Extraction and Human Review".
export function serviceKeysOf(product: Product): ServiceKey[] {
  return product.service
    .split(" and ")
    .map((name) => serviceKeyOf(name))
    .filter((key): key is ServiceKey => key !== undefined);
}

// A service version's modules, built from data.ts so a new module appears without editing anything.
export function serviceModules(service: ServiceKey, version: Version) {
  const phase = phaseOf(version);
  return products.filter((product) => product.group === phase && serviceKeysOf(product).includes(service));
}

// The versions a service has: V1, and V2 once it has a V2 module.
export function serviceVersions(service: ServiceKey): Version[] {
  return VERSION_LIST.filter((version) => serviceModules(service, version).length > 0);
}

export function serviceHref(service: ServiceKey, version: Version = "V1") {
  return version === "V1" ? `/products/services/${service}` : `/products/services/${service}/${version.toLowerCase()}`;
}

export function serviceLabel(service: ServiceKey, version: Version) {
  return `${SERVICES[service].name} ${version}`;
}

// ---------------------------------------------------------------- apps

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
export const APP_ORDER: readonly AppKey[] = ["docflow", "autorep", "p2pflow"];

export type ServiceVersion = Version | "TBD";

const ALL_TBD: Record<ServiceKey, ServiceVersion> = {
  identity: "TBD",
  upload: "TBD",
  extraction: "TBD",
  review: "TBD",
  payment: "TBD",
  delivery: "TBD",
};

type AppVersion = {
  app: AppKey;
  version: Version;
  status: string;
  summary?: string;
  // Set when nothing is designed yet: what will appear (MVP1-E0-33 AC2).
  comingSoon?: string;
  // Which version of each service this app version is built on (MVP1-E0-33 AC3).
  // "TBD" until it is decided: never assumed (Nikhil's decision on PR #118).
  builtOn: Partial<Record<ServiceKey, ServiceVersion>>;
};

const ALL_V1: Record<ServiceKey, Version> = {
  identity: "V1",
  upload: "V1",
  extraction: "V1",
  review: "V1",
  payment: "V1",
  delivery: "V1",
};

export const appVersions: readonly AppVersion[] = [
  { app: "docflow", version: "V1", status: "Designed", builtOn: ALL_V1 },
  {
    app: "docflow",
    version: "V2",
    status: "Coming later",
    // V2 is coming later (Nikhil's decision for MVP1-E0-48): one page until it is designed.
    comingSoon:
      "Batches of documents, a second model that judges the first, web enrichment with sources, fixes by chat, saved cards, notifications, and sign-in rebuilt by hand with passkeys. DocFlow V2 will appear here when it is designed.",
    // Not decided yet, so every service version is TBD (Nikhil's decision on PR #118).
    builtOn: ALL_TBD,
  },
  {
    app: "autorep",
    version: "V1",
    status: "In design",
    builtOn: { identity: "V1", review: "V1", delivery: "V1" },
  },
  {
    app: "autorep",
    version: "V2",
    status: "Coming soon",
    comingSoon:
      "Analytics, a vector database, Slack, posting without approval, several locations and languages other than English, as listed for V2 in the AutoRep PRD, will appear here when V2 is designed.",
    builtOn: {},
  },
  {
    app: "p2pflow",
    version: "V1",
    status: "Coming soon",
    comingSoon: "The procure-to-pay journey and the service versions it is built on will appear here when it is designed.",
    builtOn: {},
  },
  {
    app: "p2pflow",
    version: "V2",
    status: "Coming soon",
    comingSoon: "P2PFlow's second version will appear here when it is designed.",
    builtOn: {},
  },
];

export function findAppVersion(app: AppKey, version: Version) {
  return appVersions.find((item) => item.app === app && item.version === version)!;
}

// An app is "Coming soon" in the menu until one of its versions is designed (MVP1-E0-32 AC3).
export function appStatus(app: AppKey) {
  return appVersions.find((item) => item.app === app && !item.comingSoon)?.status ?? "Coming soon";
}

export function appHref(app: AppKey, version: Version = "V1") {
  return version === "V1" ? `/products/${app}` : `/products/${app}/${version.toLowerCase()}`;
}

export function appLabel(app: AppKey, version: Version) {
  return `${APPS[app].name} ${version}`;
}

// The app versions built on a given version of a service (MVP1-E0-34 AC2).
export function usedBy(service: ServiceKey, version: Version) {
  return appVersions.filter((item) => item.builtOn[service] === version);
}
