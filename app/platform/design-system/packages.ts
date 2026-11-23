// The packages the Design system page lists (MVP1-E0-52 AC2, AC3). Versions are read from each
// package's package.json and component counts from the module design data, so neither is typed
// by hand and the page cannot go stale.
import core from "../../../packages/ui-core/package.json";
import delivery from "../../../packages/ui-delivery/package.json";
import extraction from "../../../packages/ui-extraction/package.json";
import identity from "../../../packages/ui-identity/package.json";
import payment from "../../../packages/ui-payment/package.json";
import review from "../../../packages/ui-review/package.json";
import upload from "../../../packages/ui-upload/package.json";
import { APPS, appVersions, SERVICES, type ServiceKey } from "../../products/apps";
import { products } from "../../products/data";
import { details } from "../../products/details";

export const UI_CORE = { name: core.name, version: core.version };

export type PackageCard = {
  key: string;
  /** The package's name, or where the components live when they are not a package. */
  name: string;
  owner: string;
  version: string;
  components: number;
  galleries: { title: string; href: string; components: number }[];
};

function galleries(slugs: readonly string[]) {
  return slugs.map((slug) => {
    const product = products.find((p) => p.slug === slug);
    if (!product) throw new Error(`Design system page: no module "${slug}" in data.ts`);
    return {
      title: product.title,
      href: `/products/${slug}/ui-components`,
      components: details[slug]?.components.length ?? 0,
    };
  });
}

function card(key: string, name: string, owner: string, version: string, slugs: readonly string[]): PackageCard {
  const list = galleries(slugs);
  return { key, name, owner, version, components: list.reduce((sum, g) => sum + g.components, 0), galleries: list };
}

// Each service package and the module pages whose UI Components section shows its components.
// Identity's package holds both Login's and Account management's components.
const SERVICE_PACKAGES: { service: ServiceKey; pkg: { name: string; version: string }; modules: string[] }[] = [
  { service: "identity", pkg: identity, modules: ["login-using-aws", "account-management"] },
  { service: "upload", pkg: upload, modules: ["document-upload"] },
  { service: "extraction", pkg: extraction, modules: ["extraction-with-claude"] },
  { service: "review", pkg: review, modules: ["human-review"] },
  { service: "payment", pkg: payment, modules: ["payment"] },
  { service: "delivery", pkg: delivery, modules: ["download-and-email-delivery"] },
];

// DocFlow's own page sections live in the app, not in a package, so their version is the app's.
const docflowV1 = appVersions.find((v) => v.app === "docflow" && v.version === "V1");

export const packageCards: PackageCard[] = [
  ...SERVICE_PACKAGES.map(({ service, pkg, modules }) =>
    card(pkg.name, pkg.name, `${SERVICES[service].name} service`, pkg.version, modules),
  ),
  card(
    "docflow",
    `${APPS.docflow.name} page sections`,
    `${APPS.docflow.name} app, in the app itself`,
    `${APPS.docflow.name} ${docflowV1?.version ?? "V1"}`,
    ["json-and-csv-output"],
  ),
];
