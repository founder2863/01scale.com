// Nikhil's profile content for the home page (MVP1-E0-36 to E0-42). Every word and figure here is his:
// from his summary graphic, his résumés (conflicts resolved by him on PR #119), his functional
// responsibilities chart and his other site. Change a figure here and it changes everywhere.

const LINKEDIN = "https://www.linkedin.com/in/nikhilsnyu";

export const nameStrip = {
  name: "Nikhil Shrivastava",
  headline: "Platform & AI Product Leader",
};

// ---------------------------------------------------------------- cover (E0-36)

export const cover = {
  title: "Apps & platforms I launched, enabled and scaled",
  legend: {
    app: "App layer",
    platform: "Platform layer",
    expertise: "Functional expertise arc",
  },
  // The figures that used to sit under each title are in the numbers section (Nikhil's decision).
  areas: [
    {
      title: "Embedded Products Platform",
      apps: ["Tax & Pay", "Doc Intelligence", "Identity & eSign"],
      platform: ["PayFac", "Agentic Workflows", "Auth", "Config"],
      expertise: "PayFac · KYB · Recon",
      modes: "Embedded · No-code · API",
    },
    {
      title: "Integration Platform (iPaaS)",
      apps: ["P2P & O2C", "Global Compliance", "Partner Onboarding"],
      platform: ["B2B Connectivity", "Messaging", "EDI", "Auth", "Admin"],
      expertise: "P2P / O2C Objects · Onboarding",
      modes: "No-code · API",
    },
    {
      title: "Data & AI APIs",
      apps: ["Instant Quote", "Underwriting AI Assistant", "Embeddable Insurance"],
      platform: ["360° Risk Data & APIs", "Entity Resolution", "ML · DL · NLP"],
      expertise: "Quote · Underwriting · Risk",
      modes: "API & Data",
    },
  ],
} as const;

// ---------------------------------------------------------------- snapshot (E0-36)

export const snapshot = [
  {
    label: "Who I am",
    text: "I'm Nikhil Shrivastava, a platform and AI product leader with 17+ years in regulated SaaS: identity, payments, integrations and AI.",
  },
  {
    label: "Who this site is for",
    text: "Hiring managers and teams looking for a platform product leader who can show the work, not only describe it. Each demo is something you can try yourself as it ships.",
  },
  {
    label: "What this site is",
    text: "Each module is a small, working slice of a real product: sign-in, document upload, AI extraction, human review, payment and delivery. The first app is DocFlow, which turns an uploaded invoice into reviewed, structured data.",
  },
] as const;

// ---------------------------------------------------------------- in numbers (E0-37)

export const numbers = [
  { figure: "$100M+", label: "GTV in 18 months from embedded payments", source: "GovOS" },
  { figure: "$4M+", label: "platform ARR", source: "GovOS" },
  { figure: "300K+", label: "partners self-integrating", source: "TraceLink" },
  { figure: "+20–40%", label: "quote-to-bind", source: "Chubb" },
  { figure: "1B+", label: "regulated transactions a year", source: "TraceLink" },
  { figure: "6 mo → 2–4 wks", label: "new product launches", source: "GovOS" },
  { figure: "50+", label: "engineers led", source: "GovOS" },
  { figure: "17+", label: "years in platform, identity, payments and AI", source: "Career" },
] as const;

// ---------------------------------------------------------------- brands (E0-38)

export const brands = [
  {
    key: "govos",
    name: "GovOS",
    note: "now Neumo",
    // Logo files are added once Nikhil uploads them; until then the name is shown as a wordmark.
    logo: null as string | null,
    role: "Group Product Manager (operated as Head), Platform & Payments",
    dates: "Jan 2024 – Dec 2025",
    results: [
      "Launched GovOS Pay, an in-house payfac product embedded in 5 apps: $100M+ GTV in 18 months and $4M+ platform ARR.",
      "Cut new-product launches from ~6 months to 2–4 weeks with 7 embeddable platform components.",
      "Automated 80–90% of deed and title fields with a multi-model LLM pipeline and human review.",
    ],
  },
  {
    key: "tracelink",
    name: "TraceLink",
    note: null,
    logo: null as string | null,
    role: "Senior Manager, Platform Product Management (iPaaS)",
    dates: "Aug 2021 – Jan 2024",
    results: [
      "Launched Extensible TraceLink Transfer 0→1 and moved 300K+ partners to self-serve, no-code connectivity; onboarding effort down 60–80%.",
      "Owned platform services carrying 1B+ regulated transactions a year, in 40+ countries.",
    ],
  },
  {
    key: "chubb",
    name: "Chubb",
    note: null,
    logo: null as string | null,
    role: "Lead AI Product Manager",
    dates: "Jan 2019 – Aug 2021",
    results: [
      "Risk-data APIs cut underwriting questions from 60+ to 2–10, lifting quote-to-bind 20–40%.",
      "A Digital Underwriter Assistant (BERT, BART) cut complex risk review from hours to ~10 minutes.",
    ],
  },
] as const;

// ---------------------------------------------------------------- responsibilities (E0-39)

// From Nikhil's functional responsibilities chart. Product names are his fictional names
// (Nikhil's decision on PR #119): BLT → Tax, CS → Search, CR → Records, eSub → Submit Online,
// Studio → No Code Builder.
const LIFECYCLE = ["Why & use case", "What", "Integration & architecture", "Demo & feedback", "Oversee dev & support"];

const COMMERCIAL = [
  "Feature definition",
  "Revenue model",
  "Pricing strategy",
  "GTM",
  "Integration with Records",
  "Sales enablement",
  "Support enablement",
  "Solutions consulting enablement",
  "PS enablement",
  "Marketing",
  "Finance enablement",
  "Product adoption",
  "Product metrics",
  "Oversee dev & support",
];

type Node = {
  key: string;
  name: string;
  groups: readonly { title: string; items: readonly string[] }[];
  // The 01scale page that rebuilds this capability, if there is one.
  rebuild?: { label: string; href: string };
};

export const responsibilities: {
  company: string;
  title: string;
  intro: string;
  layers: readonly { name: string; nodes: readonly Node[] }[];
  domains: readonly string[];
} = {
  company: "GovOS (now Neumo)",
  title: "What I owned at GovOS",
  intro:
    "The platform I led and the products on it. Tap any part to see what I did there; where 01scale rebuilds the same capability, it links to it.",
  layers: [
    {
      name: "Products",
      nodes: [
        {
          key: "no-code-builder",
          name: "No Code Builder",
          groups: [
            { title: "Features", items: ["Author view", "Submission manager", "Live view", "PDF view", "Configs", "Webhooks", "APIs", "Exports"] },
            { title: "Commercial and delivery", items: COMMERCIAL },
          ],
        },
        {
          key: "pay",
          name: "Pay",
          groups: [
            {
              title: "Features",
              items: [
                "Pay by card",
                "Card config",
                "Pay by eCheck",
                "eCheck config",
                "Saved payment methods",
                "Default method",
                "Manage methods",
                "Schedule payments",
                "Manage schedules",
                "Point of sale",
                "Pre-authorization",
              ],
            },
            { title: "Commercial and delivery", items: [...COMMERCIAL, "Vendor management"] },
          ],
          rebuild: { label: "Payment on 01scale", href: "/products/services/payment" },
        },
        {
          key: "pay-portal",
          name: "Pay Portal",
          groups: [
            {
              title: "Features",
              items: [
                "User login",
                "Account settings",
                "Fee configs",
                "Full and partial refunds",
                "Transaction status",
                "Payouts",
                "Disbursement",
                "Web alerts",
                "Fee refunds to referrer",
              ],
            },
          ],
        },
        {
          key: "financial-reporting",
          name: "Financial Reporting",
          groups: [
            {
              title: "Features",
              items: [
                "P&L",
                "Balance details",
                "Transaction details",
                "Disbursement transaction detail",
                "Payouts",
                "Disputes",
                "Returns",
                "Division vs merchant",
                "Scheduled vs generated",
              ],
            },
          ],
        },
        {
          key: "id-verification",
          name: "ID Verification",
          groups: [
            {
              title: "Features (with Persona)",
              items: ["Workflow creation", "Verification conditions", "Geo constraints", "Email customization", "API", "Reporting", "Support"],
            },
            { title: "Commercial and delivery", items: [...COMMERCIAL, "Vendor management"] },
          ],
          rebuild: { label: "Identity on 01scale", href: "/products/services/identity" },
        },
        ...["Tax", "Search", "Records", "Submit Online"].map((app) => ({
          key: `payments-${app.toLowerCase().replace(/\s+/g, "-")}`,
          name: `${app} payments`,
          groups: [{ title: "Owned", items: [`${app} payments`, `${app} pay configs`, "Revenue model"] }],
        })),
      ],
    },
    {
      name: "Platform",
      nodes: [
        { key: "gateway", name: "Gateway", groups: [{ title: "Lifecycle", items: LIFECYCLE }], rebuild: { label: "Gateway on 01scale", href: "/platform/core/gateway" } },
        { key: "tenant", name: "Tenant Service", groups: [{ title: "Lifecycle", items: LIFECYCLE }] },
        {
          key: "authentication",
          name: "Authentication Service",
          groups: [{ title: "Lifecycle", items: LIFECYCLE }],
          rebuild: { label: "Identity on 01scale", href: "/products/services/identity" },
        },
        {
          key: "payment-service",
          name: "Payment Service",
          groups: [{ title: "Lifecycle", items: LIFECYCLE }],
          rebuild: { label: "Payment on 01scale", href: "/products/services/payment" },
        },
        {
          key: "notification",
          name: "Notification Service",
          groups: [{ title: "Lifecycle", items: LIFECYCLE }],
          rebuild: { label: "Delivery on 01scale", href: "/products/services/delivery" },
        },
        { key: "audit", name: "Audit", groups: [{ title: "Lifecycle", items: LIFECYCLE }], rebuild: { label: "Audit log on 01scale", href: "/platform/core/audit-log" } },
        { key: "llm", name: "LLM", groups: [{ title: "Lifecycle", items: LIFECYCLE }], rebuild: { label: "LLM Extraction on 01scale", href: "/products/services/extraction" } },
        { key: "reporting", name: "Reporting", groups: [{ title: "Lifecycle", items: [...LIFECYCLE, "Analytics", "AI/ML/DL working knowledge"] }] },
        { key: "provisioning", name: "Provisioning App", groups: [{ title: "Lifecycle", items: LIFECYCLE }] },
        { key: "playground", name: "Playground App", groups: [{ title: "Lifecycle", items: LIFECYCLE }] },
      ],
    },
  ],
  domains: [
    "Product management",
    "Computer science, engineering & technical architecture",
    "Data science",
    "Business intelligence",
    "Administration, configuration & deployment",
    "No-code platforms",
    "Corporate finance, financial reporting & accounting",
    "Marketing",
    "Payments & cards",
    "Workflow & ID fraud",
    "Business tax",
    "Public records",
    "Search technologies",
  ],
};

// ---------------------------------------------------------------- academics (E0-40)

// No years on any degree (Nikhil's decision on PR #119).
export const academics = [
  { school: "New York University", degree: "M.S., Management (Finance & Economics / Information Systems)", note: null },
  {
    school: "The George Washington University",
    degree: "D.Eng, Systems Engineering/AI (ABD)",
    note: null,
  },
  { school: "Massachusetts Institute of Technology", degree: "Building AI Products & Services", note: null },
  { school: "RGTU", degree: "B.S., Computer Science & Engineering", note: null },
] as const;

export const certifications = [
  "AI Coder: Claude Code & Coding Agents",
  "AI Engineer Agentic Track: Agents & MCP",
  "Professional Scrum Product Owner (PSPO)",
  "SAFe Product Owner / Product Manager (POPM)",
] as const;

// ---------------------------------------------------------------- recommendations (E0-41)

// From LinkedIn, as published on Nikhil's other site: role and company only, no names.
export const recommendations = [
  { quote: "Nik excels in systems thinking, connecting the dots and removing blockers from engineering team's progress.", role: "SVP", company: "Chubb" },
  { quote: "He exceeded my expectations by being willing to always go the extra mile to achieve the result we needed.", role: "CMRO", company: "MHS" },
  { quote: "Nikhil has a proven track record of earning the trust and confidence of non-technical stakeholders.", role: "Product Leader", company: "Carrier" },
  { quote: "His blend of strategic thinking and technical knowledge is excellent for product launch and expansion.", role: "Managing Director", company: "Deloitte" },
  { quote: "He is a self motivated leader who pushes himself and his teams to build great products.", role: "VP", company: "GovOS" },
  { quote: "Nik was in charge of defining our B2B platform strategy, which became part of key applications.", role: "VP", company: "RegScale" },
] as const;

// ---------------------------------------------------------------- LinkedIn and contact (E0-42)

export const linkedin = {
  url: LINKEDIN,
  articlesUrl: `${LINKEDIN}/recent-activity/articles/`,
  headline: "Platform & AI Product Leader · identity, payments, integrations and AI",
  articles: "9 published articles on AI, APIs and platforms, including the Demystify series.",
};

export const contact = {
  text: "The best way to reach me is a LinkedIn message: open my profile and press Message.",
  url: LINKEDIN,
  label: "Message me on LinkedIn",
};
