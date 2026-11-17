// The three sections of How It's Built. Each has its own address; Skills is the
// default, so "/how-its-built" opens it. Used by the page's tab bar and the header menu.
export const builtTabs = [
  { slug: "skills", label: "Skills", href: "/how-its-built" },
  { slug: "token-costs", label: "Token Costs", href: "/how-its-built/token-costs" },
  { slug: "agents", label: "Agents", href: "/how-its-built/agents" },
] as const;

export type BuiltTab = (typeof builtTabs)[number]["slug"];
