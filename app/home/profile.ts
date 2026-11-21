// Nikhil's profile content for the home page (MVP1-E0-36). Every word and figure here is his,
// from his own summary graphic and résumé; change a figure here and it changes everywhere.

export const cover = {
  title: "Apps & platforms I launched, enabled and scaled",
  legend: {
    app: "App layer",
    platform: "Platform layer",
    expertise: "Functional expertise arc",
  },
  areas: [
    {
      title: "Embedded Products Platform",
      metric: "$100M+ GTV · $4M+ ARR",
      apps: ["Tax & Pay", "Doc Intelligence", "Identity & eSign"],
      platform: ["PayFac", "Agentic Workflows", "Auth", "Config"],
      expertise: "PayFac · KYB · Recon",
      modes: "Embedded · No-code · API",
    },
    {
      title: "Integration Platform (iPaaS)",
      metric: "300K+ partners self-integrating",
      apps: ["P2P & O2C", "Global Compliance", "Partner Onboarding"],
      platform: ["B2B Connectivity", "Messaging", "EDI", "Auth", "Admin"],
      expertise: "P2P / O2C Objects · Onboarding",
      modes: "No-code · API",
    },
    {
      title: "Data & AI APIs",
      metric: "+20–40% quote-to-bind",
      apps: ["Instant Quote", "Underwriting AI Assistant", "Embeddable Insurance"],
      platform: ["360° Risk Data & APIs", "Entity Resolution", "ML · DL · NLP"],
      expertise: "Quote · Underwriting · Risk",
      modes: "API & Data",
    },
  ],
} as const;
