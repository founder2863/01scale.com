// The same seven tabs appear on every product page, in this order.
export const tabs = [
  { slug: "readme", label: "Read Me" },
  { slug: "requirements", label: "Requirement EPIC" },
  { slug: "user-journey", label: "User Journey" },
  { slug: "ui-components", label: "UI Components" },
  { slug: "api-spec", label: "API Spec" },
  { slug: "data-model", label: "Data Model" },
  { slug: "schema", label: "Schema" },
] as const;

export type TabSlug = (typeof tabs)[number]["slug"];

export function tabHref(product: string, tab: TabSlug) {
  return tab === "readme" ? `/products/${product}` : `/products/${product}/${tab}`;
}

export const groups = [
  { tag: "MVP1", heading: "The full journey, end to end" },
  { tag: "MVP2", heading: "Own identity, many documents, trustworthy AI" },
] as const;
