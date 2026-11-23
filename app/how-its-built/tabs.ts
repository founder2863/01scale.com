// The six sections of How It's Built. Each has its own address; Skills is the
// default, so "/how-its-built" opens it. Used by the page's tab bar and the header menu.
export const builtTabs = [
  { slug: "skills", label: "Skills", href: "/how-its-built" },
  { slug: "token-costs", label: "Token Costs", href: "/how-its-built/token-costs" },
  { slug: "agents", label: "Agents", href: "/how-its-built/agents" },
  // Renamed from "Costs" and Constraints split into its own tab (MVP1-E8-01); labelled "Total Cost"
  // since MVP1-E8-11. The address keeps "total-projected-cost" so no link breaks.
  { slug: "total-projected-cost", label: "Total Cost", href: "/how-its-built/total-projected-cost" },
  { slug: "constraints", label: "Constraints", href: "/how-its-built/constraints" },
  // Lessons from mistakes, with their measured cost (MVP1-E0-46).
  { slug: "expensive-mistakes", label: "Expensive Mistakes", href: "/how-its-built/expensive-mistakes" },
] as const;

export type BuiltTab = (typeof builtTabs)[number]["slug"];

// The four tabs of Total Cost (MVP1-E8-10, renamed in MVP1-E8-11), each with its own address. The first opens
// at "/how-its-built/total-projected-cost".
export const costTabs = [
  { slug: "actual-token-cost", label: "Actual Token Cost So Far", href: "/how-its-built/total-projected-cost" },
  { slug: "estimated-human-cost", label: "Estimated Human Cost So Far", href: "/how-its-built/total-projected-cost/estimated-human-cost" },
  { slug: "projected-token-cost", label: "Projected Token Cost", href: "/how-its-built/total-projected-cost/projected-token-cost" },
  { slug: "projected-human-cost", label: "Projected Human Cost", href: "/how-its-built/total-projected-cost/projected-human-cost" },
] as const;

export type CostTab = (typeof costTabs)[number]["slug"];
