// The six sections of How It's Built. Each has its own address; Skills is the
// default, so "/how-its-built" opens it. Used by the page's tab bar and the header menu.
export const builtTabs = [
  { slug: "skills", label: "Skills", href: "/how-its-built" },
  { slug: "token-costs", label: "Token Costs", href: "/how-its-built/token-costs" },
  { slug: "agents", label: "Agents", href: "/how-its-built/agents" },
  // Renamed from "Costs" and Constraints split into its own tab (MVP1-E8-01).
  { slug: "total-projected-cost", label: "Total Projected Cost", href: "/how-its-built/total-projected-cost" },
  { slug: "constraints", label: "Constraints", href: "/how-its-built/constraints" },
  // Lessons from mistakes, with their measured cost (MVP1-E0-46).
  { slug: "expensive-mistakes", label: "Expensive Mistakes", href: "/how-its-built/expensive-mistakes" },
] as const;

export type BuiltTab = (typeof builtTabs)[number]["slug"];
