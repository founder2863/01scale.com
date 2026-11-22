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
    text: "I'm Nikhil Shrivastava, a platform and AI product leader with 17+ years in regulated SaaS and PaaS, at start-ups and Fortune 500 companies. I've launched products 0→1 and scaled existing ones, across vertical SaaS and horizontal platform services, growing revenue and cutting cost. I've also built product teams, with competency levels and growth paths.",
  },
  {
    label: "Who this site is for",
    text: "Hiring managers and teams looking for a product leader who can show the work, not only describe it. It shows how a product manager uses modern AI tools such as Claude Code and Claude Cowork to do the job. Every product has working demos you can try as they ship, and its documents: requirements, API designs and the roadmap.",
  },
  {
    label: "What this site is",
    text: "01scale is organised like a multi-product platform company. Platform Core is the foundation. On it sit platform services, each a working slice of business functionality: sign-in, document upload, AI extraction, human review, payment and delivery. Customer-facing apps are assembled from those services. The first, DocFlow, turns an uploaded invoice into reviewed, structured data.",
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

// ---------------------------------------------------------------- companies worked for (E0-38, E0-39)

// One entry per company (Nikhil's decisions on PR #119): the role and dates, then his own breakdown
// by category. Logo files are his, kept in public/logos/. GovOS product names are his fictional names:
// BLT → Tax, CS → Search, CR → Records, eSub → Submit Online, Studio → No Code Builder.
type Item = string | { label: string; href: string };

export type OwnershipGroup = {
  title: string;
  items?: readonly Item[];
  // Named sub-lists, for example SaaS and Platform under GovOS's products.
  parts?: readonly { title: string; items: readonly Item[] }[];
  text?: string;
};

const DELIVERY = ["Roadmap", "Architecture", "Stories", "Demos", "QBRs", "Production releases", "Support escalations"];

export const companies: readonly {
  key: string;
  name: string;
  note: string | null;
  logo: string;
  role: string;
  dates: string;
  groups: readonly OwnershipGroup[];
}[] = [
  {
    key: "govos",
    name: "GovOS",
    note: "now Neumo",
    logo: "/logos/govos.jpg",
    role: "Group Product Manager (operated as Head), Platform & Payments",
    dates: "Jan 2024 – Dec 2025",
    groups: [
      {
        title: "Products I owned and enabled",
        parts: [
          {
            title: "Enterprise SaaS",
            items: [
              "Tax",
              "Search",
              "Records",
              "Submit Online",
              "No Code Builder",
              { label: "Payments (payfac)", href: "/products/services/payment" },
              { label: "ID Verification", href: "/products/services/identity" },
            ],
          },
          {
            title: "Platform",
            items: [
              { label: "Authentication", href: "/products/services/identity" },
              { label: "Gateway", href: "/platform/core/gateway" },
              "Tenant",
              { label: "Notification", href: "/products/services/delivery" },
              { label: "Audit", href: "/platform/core/audit-log" },
              { label: "LLM", href: "/products/services/extraction" },
              "Reporting",
              "Provisioning",
              "Playground",
            ],
          },
        ],
      },
      {
        title: "Product areas I owned",
        items: [
          "0→1",
          "Strategy",
          "Roadmap",
          "MVP definition",
          "Monetization",
          "Pricing: take rates, seat rates, subscriptions, annual billing",
          "Metrics and OKRs",
        ],
      },
      { title: "Commercial", items: ["Pricing", "Revenue model", "GTM", "Enablement of the CRO, CFO, COO and CCO functions"] },
      { title: "Technical & delivery", items: DELIVERY },
      { title: "Delivery mode", items: ["Embeddable components", "APIs"] },
      { title: "Customer management", items: ["Monthly meetings with customers' finance directors"] },
      {
        title: "Domain knowledge",
        items: [
          "Payments & cards",
          "Corporate finance, financial reporting & accounting",
          "Workflow & ID fraud",
          "Business tax",
          "Public records",
          "Search technologies",
          "No-code platforms",
          "Data science",
          "Business intelligence",
          "Marketing",
        ],
      },
    ],
  },
  {
    key: "tracelink",
    name: "TraceLink",
    note: null,
    logo: "/logos/tracelink.jpg",
    role: "Senior Manager, Platform Product Management (iPaaS)",
    dates: "Aug 2021 – Jan 2024",
    groups: [
      {
        title: "Products I owned and enabled",
        parts: [
          {
            title: "Enterprise SaaS",
            items: [
              "Extensible TraceLink Transfer (XTT)",
              "Integrations",
              "Network Administration",
              "MINT",
              "Compliance (US DSCSA and global equivalents)",
              "EDI",
            ],
          },
          { title: "Platform", items: ["B2B Messaging", "Canonical Data Models", "Transformations", "Network Objects"] },
        ],
      },
      {
        title: "Product areas I owned",
        items: [
          "Multi-enterprise data models (network partners)",
          "APIs",
          "Platform strategy",
          "Roadmap",
          "Multi-product use cases",
          "MVP definition",
          "Program plan",
          "Observability metrics",
          "Technical metrics: adoption, time to first value",
        ],
      },
      { title: "Commercial", items: ["Enabling solutions consulting and sales"] },
      { title: "Technical & delivery", items: DELIVERY },
      { title: "Delivery mode", items: ["Enterprise SaaS (XTT)", "Platform APIs", "Network apps"] },
      { title: "Domain knowledge", items: ["Computer science", "Compliance", "Supply chain", "Financial operations"] },
    ],
  },
  {
    key: "chubb",
    name: "Chubb",
    note: null,
    logo: "/logos/chubb.jpg",
    role: "Lead AI Product Manager",
    dates: "Jan 2019 – Aug 2021",
    groups: [
      {
        title: "Products I owned and enabled",
        parts: [
          { title: "Enterprise SaaS", items: ["Instant Quote", "Underwriter AI Assistant", "Embeddable Insurance", "Chubb Studio"] },
          { title: "Platform", items: ["APIs", "MLOps"] },
        ],
      },
      {
        title: "Product areas I owned",
        items: ["ML/DL models", "Commercial data", "Entity resolution", "Risk data APIs", "MVP definition", "Program plan"],
      },
      {
        title: "Commercial",
        text: "Adoption of the underwriting-answers API across the Micro, Small Commercial and Commercial insurance business units, and across product lines such as BOP and Liability.",
      },
      { title: "Technical & delivery", items: DELIVERY },
      { title: "Delivery mode", items: ["APIs", "SaaS app"] },
      { title: "Domain knowledge", items: ["Data science", "Insurance", "Risk", "Underwriting"] },
    ],
  },
];

// ---------------------------------------------------------------- academics (E0-40)

// No years on any degree (Nikhil's decision on PR #119).
// Logo files supplied by Nikhil, trimmed and kept in public/logos/.
export const academics = [
  {
    school: "New York University",
    degree: "M.S., Management (Finance & Economics / Information Systems)",
    note: null,
    logo: "/logos/nyu.png",
  },
  {
    school: "The George Washington University",
    degree: "D.Eng, Systems Engineering/AI (ABD)",
    note: null,
    logo: "/logos/gwu.png",
  },
  {
    school: "Massachusetts Institute of Technology",
    degree: "Building AI Products & Services (MIT Professional Education)",
    note: null,
    logo: "/logos/mit.png",
  },
  {
    school: "RGPV (RGTU)",
    degree: "B.S., Computer Science & Engineering",
    note: null,
    logo: "/logos/rgtu.png",
  },
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
