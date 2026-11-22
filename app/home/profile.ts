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

// ---------------------------------------------------------------- companies worked for (E0-38)

export const brands = [
  {
    key: "govos",
    name: "GovOS",
    note: "now Neumo",
    // Logo files supplied by Nikhil, kept in the repository (public/logos/).
    logo: "/logos/govos.jpg" as string | null,
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
    logo: "/logos/tracelink.jpg" as string | null,
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
    logo: "/logos/chubb.jpg" as string | null,
    role: "Lead AI Product Manager",
    dates: "Jan 2019 – Aug 2021",
    results: [
      "Risk-data APIs cut underwriting questions from 60+ to 2–10, lifting quote-to-bind 20–40%.",
      "A Digital Underwriter Assistant (BERT, BART) cut complex risk review from hours to ~10 minutes.",
    ],
  },
] as const;

// ---------------------------------------------------------------- what I owned (E0-39)

// Nikhil's own breakdown per company (PR #119). GovOS product names are his fictional names:
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

export const ownership: readonly {
  key: string;
  name: string;
  logo: string;
  groups: readonly OwnershipGroup[];
}[] = [
  {
    key: "govos",
    name: "GovOS",
    logo: "/logos/govos.jpg",
    groups: [
      {
        title: "Products",
        parts: [
          { title: "SaaS", items: ["Tax", "Search", "Records", "Submit Online", "No Code Builder"] },
          {
            title: "Platform",
            items: [
              { label: "Pay (payfac)", href: "/products/services/payment" },
              { label: "ID Verification", href: "/products/services/identity" },
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
      { title: "Product areas", items: ["Strategy", "Roadmap", "MVP definition", "Metrics and OKRs"] },
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
    logo: "/logos/tracelink.jpg",
    groups: [
      { title: "Products", items: ["XTT", "Global Compliance", "MINT (P2P & O2C) use cases"] },
      {
        title: "Product areas",
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
      { title: "Delivery mode", items: ["Enterprise SaaS (XTT)", "Platform APIs"] },
      { title: "Domain knowledge", items: ["Computer science", "Compliance", "Supply chain", "Financial operations"] },
    ],
  },
  {
    key: "chubb",
    name: "Chubb",
    logo: "/logos/chubb.jpg",
    groups: [
      { title: "Products", items: ["Instant Quote", "Underwriter AI Assistant", "Embeddable Insurance"] },
      {
        title: "Product areas",
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
