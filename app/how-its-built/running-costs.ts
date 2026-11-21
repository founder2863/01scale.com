// What 01scale costs to run and the limits that keep it cheap (story MVP1-E0-31).
// Every value here is a decision recorded in a story; when a story changes, change this file in the same PR.

// What is actually paid. The Claude API budget is the only cost beyond existing subscriptions.
export const paid = [
  {
    item: "Claude Pro",
    amount: "Subscription",
    covers: "The Claude app and Claude Code, which I build 01scale with. It does not cover the Claude API.",
  },
  {
    item: "Vercel Pro",
    amount: "$20 a month",
    covers: "Hosting the site and every service, with spend management set to pause rather than charge more.",
  },
  {
    item: "AWS credit",
    amount: "$10",
    covers: "File storage (S3) and sign-in (Cognito), with a budget alert.",
  },
  {
    item: "Claude API",
    amount: "Up to $10 a month",
    covers: "Reading documents in the demo: $5 on Claude Opus 5.5, then $5 on Claude Haiku 5.5. Prepaid, with auto-reload off.",
  },
];

// One row per provider: what it bills for, what covers it, and the most it can cost in a month.
export const providers = [
  {
    name: "Claude API",
    billsFor: "Tokens: Opus 5.5 at $4 in and $20 out per million; Haiku 5.5 at $0.10 in and $0.50 out",
    coveredBy: "Prepaid credit, auto-reload off",
    ceiling: "$10 ($5 Opus, then $5 Haiku)",
  },
  {
    name: "Vercel",
    billsFor: "Hosting, functions and bandwidth",
    coveredBy: "Pro plan",
    ceiling: "$20, paused rather than charged more",
  },
  {
    name: "AWS",
    billsFor: "Storage, requests and monthly active users",
    coveredBy: "$10 credit",
    ceiling: "Within the credit",
  },
  { name: "Neon", billsFor: "Compute hours and storage", coveredBy: "Free plan", ceiling: "$0" },
  { name: "Resend", billsFor: "Emails sent", coveredBy: "Free plan", ceiling: "$0" },
  { name: "Stripe", billsFor: "A fee per payment", coveredBy: "Test mode: no real money moves", ceiling: "$0" },
];

// Estimates until Extraction is built and measures them (MVP1-E3-05).
export const perExtraction = [
  {
    model: "Claude Opus 5.5",
    cost: "about $0.15",
    detail: "About $0.10 for one page, up to about $0.50 for ten",
    perMonth: "about 30 to 50 documents on $5",
  },
  {
    model: "Claude Haiku 5.5",
    cost: "about $0.003",
    detail: "Roughly fifty times cheaper; more fields may go to human review",
    perMonth: "about 1,500 documents on $5",
  },
];

// Every limit that keeps the demo safe and cheap, with its reason and the story that sets it.
export const constraints = [
  {
    limit: "Changes per user",
    value: "10 a minute",
    why: "Demo services, not for batch or programmatic use",
    story: "MVP1-E0-08",
  },
  {
    limit: "Reads per user",
    value: "60 a minute",
    why: "Enough for pages and progress checks",
    story: "MVP1-E0-08",
  },
  {
    limit: "Calls with an API key",
    value: "10 a minute in total",
    why: "Agents can try every operation, but not in bulk",
    story: "MVP1-E0-08",
  },
  {
    limit: "Extractions per user",
    value: "20 a day",
    why: "One person cannot use up the month's budget",
    story: "MVP1-E0-26",
  },
  {
    limit: "Claude budget",
    value: "$5 on Opus 5.5, then $5 on Haiku 5.5, each month",
    why: "Keeps the bill fixed; the extraction page says which model read the document",
    story: "MVP1-E3-02",
  },
  {
    limit: "When both budgets are used",
    value: "Extraction pauses until next month",
    why: "Visitors see when it is back instead of an error",
    story: "MVP1-E3-04",
  },
  {
    limit: "Payments",
    value: "Stripe test mode",
    why: "The whole journey works and no real money moves",
    story: "MVP1-E0-26",
  },
  {
    limit: "Original files",
    value: "Deleted after 30 days",
    why: "Less to store and less personal data kept",
    story: "MVP1-E2-01",
  },
  {
    limit: "Secrets",
    value: "Never in the repository or a browser",
    why: "The repository is public; keys live only in Vercel and AWS",
    story: "MVP1-E0-26",
  },
];
