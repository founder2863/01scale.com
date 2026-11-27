// The seven sections of How It's Built, in the order Nikhil set (27 Nov 2026): Roadmap, Token
// Costs, Total Cost, Skills, Agents, Constraints, Expensive Mistakes. Each has its own address;
// Roadmap, the first, is the default, so "/how-its-built" opens the latest roadmap version
// ("/how-its-built/roadmap" still works). Used by the page's tab bar and the header menu.
export const builtTabs = [
  // What is left to build, in order, from docs/process/ROADMAP.md (MVP1-E0-54).
  { slug: "roadmap", label: "Roadmap", href: "/how-its-built" },
  { slug: "token-costs", label: "Token Costs", href: "/how-its-built/token-costs" },
  // Renamed from "Costs" and Constraints split into its own tab (MVP1-E8-01); labelled "Total Cost"
  // since MVP1-E8-11. The address keeps "total-projected-cost" so no link breaks.
  { slug: "total-projected-cost", label: "Total Cost", href: "/how-its-built/total-projected-cost" },
  { slug: "skills", label: "Skills", href: "/how-its-built/skills" },
  { slug: "agents", label: "Agents", href: "/how-its-built/agents" },
  { slug: "constraints", label: "Constraints", href: "/how-its-built/constraints" },
  // Lessons from mistakes, with their measured cost (MVP1-E0-46).
  { slug: "expensive-mistakes", label: "Expensive Mistakes", href: "/how-its-built/expensive-mistakes" },
] as const;

export type BuiltTab = (typeof builtTabs)[number]["slug"];

// The two tabs of Total Cost (MVP1-E8-15, Nikhil 27 Nov 2026; four tabs in MVP1-E8-10), each with
// its own address. Actuals (so far) opens at "/how-its-built/total-projected-cost".
export const costTabs = [
  { slug: "so-far", label: "Actuals (so far)", href: "/how-its-built/total-projected-cost" },
  { slug: "projected", label: "Projected", href: "/how-its-built/total-projected-cost/projected" },
] as const;

// The four earlier tab addresses still work and open the tab that replaced them.
export const costTabAliases: Record<string, "so-far" | "projected"> = {
  "estimated-human-cost": "so-far",
  "projected-token-cost": "projected",
  "projected-human-cost": "projected",
};

export type CostTab = (typeof costTabs)[number]["slug"];
