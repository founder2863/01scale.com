// The fifteen sections of every module page, in this order, under four headings
// (story MVP1-E0-21, Nikhil's decision on PR #87: Market Outlook first).
// Market Outlook opens at "/products/<module>"; every other section has its own address.
export const tabGroups = [
  {
    heading: "Product",
    tabs: [
      { slug: "market-outlook", label: "Market Outlook" },
      { slug: "readme", label: "Read Me" },
      { slug: "prd-reference", label: "PRD Reference" },
      { slug: "requirements", label: "Requirement EPIC" },
      { slug: "metrics", label: "Metrics" },
      { slug: "monetization", label: "Monetization" },
      { slug: "gtm", label: "GTM" },
      { slug: "support", label: "Support" },
    ],
  },
  {
    heading: "Design",
    tabs: [
      { slug: "architecture", label: "Architecture & System Design" },
      { slug: "user-journey", label: "User Journey" },
      { slug: "ui-components", label: "UI Components" },
    ],
  },
  {
    heading: "Interfaces",
    tabs: [
      { slug: "api-spec", label: "API Spec" },
      { slug: "mcp", label: "MCP" },
    ],
  },
  {
    heading: "Data",
    tabs: [
      { slug: "data-model", label: "Data Model" },
      { slug: "schema", label: "Schema" },
    ],
  },
] as const;

export type Tab = (typeof tabGroups)[number]["tabs"][number];

export type TabSlug = Tab["slug"];

export const tabs: readonly Tab[] = tabGroups.flatMap((group): readonly Tab[] => group.tabs);

export const DEFAULT_TAB: TabSlug = "market-outlook";

export function tabHref(product: string, tab: TabSlug) {
  return tab === DEFAULT_TAB ? `/products/${product}` : `/products/${product}/${tab}`;
}

export const groups = [
  { tag: "MVP1", heading: "The full journey, end to end" },
  { tag: "MVP2", heading: "Own identity, many documents, trustworthy AI" },
] as const;
