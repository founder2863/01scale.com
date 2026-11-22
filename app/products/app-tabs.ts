import { tabGroups, type Tab } from "./tabs";

// The side menu of an app page (MVP1-E0-48): the module page's four groups and fifteen sections,
// plus two sections only apps have. Overview opens at "/products/<app>"; Built On is what the app is
// assembled from (Nikhil's decision, Option A, 22 Nov 2026).
export type AppTab = { slug: string; label: string };

const OVERVIEW: AppTab = { slug: "overview", label: "Overview" };
const BUILT_ON: AppTab = { slug: "built-on", label: "Built On" };

export const appTabGroups: readonly { heading: string; tabs: readonly AppTab[] }[] = tabGroups.map((group) => {
  const tabs: AppTab[] = group.tabs.map((tab: Tab) => ({ slug: tab.slug, label: tab.label }));
  if (group.heading === "Product") return { heading: group.heading, tabs: [OVERVIEW, ...tabs] };
  if (group.heading === "Design") return { heading: group.heading, tabs: [tabs[0], BUILT_ON, ...tabs.slice(1)] };
  return { heading: group.heading, tabs };
});

export const appTabs: readonly AppTab[] = appTabGroups.flatMap((group) => group.tabs);

export const APP_DEFAULT_TAB = OVERVIEW.slug;
