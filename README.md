# 01scale

Working prototypes of products I've built in my career, rebuilt hands-on one module at a time and shipped live at **[01scale.com](https://01scale.com)**.

I'm Nikhil Shrivastava, a platform and AI product leader with 17+ years in regulated SaaS: identity, payments, integrations and AI. This repo is my proof of work. Each module is a small, working slice with its own demo, spec and decision log.

## Architecture

01scale is a platform of independent services, and apps assembled from them:

- **Platform services:** Identity, Upload, LLM Extraction, Human Review, Payment, Delivery. Each has its own UI components, API, MCP tools for AI agents, database schema, version and deployment, behind one gateway at 01scale.com.
- **Apps:** DocFlow is the first. It only connects the services in order. Later apps (for example Procure-to-Pay or Order-to-Cash) reuse the same services.
- **Evolution:** each service starts by wrapping an external cloud service and grows into providing the capability itself, without its contract changing for the apps that use it. Identity goes from AWS Cognito to a hand-built identity provider; Extraction goes from one model call to an orchestrated, guarded, cost-routed and judged pipeline.

I compared a modular monolith, separate packages and separate services, and chose separate services. The options, my reasoning and the cost I accepted are in the [architecture doc](docs/architecture/ARCHITECTURE.md).

## Principles

- **Independent services.** Each service owns its data and publishes a contract; nothing else reaches into it. Apps stay thin.
- **API first.** Each service's API is its product, and UIs and apps are clients of it. Every endpoint is designed in its story before it is built. See the [API design](docs/architecture/API-DESIGN.md) and [database design](docs/architecture/DATABASE-DESIGN.md).
- **Agents first.** Anything a person can do in the UI, an AI agent can do through the API with the user's permission: API keys, an OpenAPI contract and an MCP server per service.
- **Ship end to end first, then build the identity provider by hand.** MVP1 uses AWS Cognito through standard OIDC; MVP2 replaces it with hand-built passwordless identity (magic links, passkeys, sessions), using only low-level libraries for crypto and email.
- **Spec first.** Every module starts with a one-page spec and acceptance criteria.
- **Show the why.** Each module has a decision log covering options, trade-offs and build-vs-buy.
- **Secure by default.** Threat model, rate limiting, no account enumeration, audit logging, OWASP ASVS as the checklist.
- **Measure the agents.** AI features ship with an eval set, accuracy targets and cost per run.
- **Small slices, always live.** Every merge to `main` deploys to production.

## Where it stands

Last updated 23 Nov 2026. The live state of every story is in [STATUS.md](docs/process/STATUS.md).

- **The site is live** at [01scale.com](https://01scale.com), with Home, Products (apps and services), Platform (Platform Core and architecture) and How It's Built.
- **Every MVP1 service is designed**: each has its stories, API spec, data model, schema, user journeys and UI components, published on its product page.
- **Each service's UI components are built** as their own package (`packages/ui-<service>`) on a shared design system (`packages/ui-core`). They are shown live, in every state, on each module page and on the [design system page](https://01scale.com/platform/core/design-system). Today they run against an in-browser stand-in for each service's API.
- **DocFlow V1 has a clickable prototype** at [/products/docflow/try](https://01scale.com/products/docflow/try), built from those packages.
- **No platform service runs yet.** Next is the service template (`MVP1-E0-07`), then the gateway (`MVP1-E0-08`), then Identity with AWS Cognito (E1).
- **Costs are measured as I go**: tokens per story on the [Token Costs](https://01scale.com/how-its-built/token-costs) tab, and what a human team would have cost on the [Total Cost](https://01scale.com/how-its-built/total-projected-cost) tab.

## Apps

| App | What it does | V1 | V2 |
|---|---|---|---|
| **DocFlow** | Upload an invoice, Claude extracts the data, a person checks what the system is unsure about, pay, and get JSON + CSV | 📐 Designed, clickable prototype | Coming later |
| **AutoRep** | AI-drafted replies to Google reviews, checked by a critic and approved by the owner when it matters | ✏️ In design | Coming soon |
| **P2PFlow** | Procure-to-pay: purchase orders, invoices and payments, from the same services | Coming soon | Coming soon |

DocFlow details: [MVP1 PRD](docs/prd/MVP1-PRD.md) · [MVP2 PRD](docs/prd/MVP2-PRD.md) · [Evals](docs/evals/EVALS.md). AutoRep: [PRD](docs/prd/AUTOREP-PRD.md) · [epics](docs/epics/AUTOREP-EPICS.md).

## Roadmap

✅ Done · 🟡 In progress · 📐 Designed (stories, API, tables and UI components designed; UI components built) · 📝 Stories written · ⚪ Later

| Phase | Epic | Service | Status |
|---|---|---|---|
| MVP1 | [E0](docs/epics/MVP1-EPICS.md) · Foundation: the site and product pages, design system and service UI packages; then the service template, gateway, database, audit log, CI, eval harness and agent access (API keys + MCP) | Platform, site | 🟡 Site, product pages and design system done; service template next |
| | E1 · Accounts with AWS Cognito (sign-up, sign-in, recovery, account page) | Identity | 📐 Designed |
| | E2 · Document upload to S3 | Upload | 📐 Designed |
| | E3 · Extraction with Claude | LLM Extraction | 📐 Designed |
| | E4 · Human review of low-confidence fields | Human Review | 📐 Designed |
| | E5 · JSON review, metadata and CSV | DocFlow app | 📐 Designed |
| | E6 · Payment (Stripe Checkout) | Payment | 📐 Designed |
| | E7 · Success, download and email | Delivery, DocFlow app | 📐 Designed |
| | E8 · Total projected cost: a human team versus Claude Code | Site | 🟡 Cost scripts and Total Cost page done; cost model next |
| MVP2 | [E8](docs/epics/MVP2-EPICS.md) · Passwordless identity built by hand (magic link, passkeys) | Identity | 📝 Stories written |
| | E9 · Multi-document pipeline (LangGraph on Lambda) | LLM Extraction, DocFlow app | 📝 Stories written |
| | E10 · LLM as judge | LLM Extraction, Human Review | 📝 Stories written |
| | E11 · Web enrichment and chat correction | LLM Extraction, Human Review | 📝 Stories written |
| | E12 · Multi-document review and outputs | DocFlow app | 📝 Stories written |
| | E13 · Saved payment methods and payment history | Payment | 📝 Stories written |
| | E14 · Notifications: email, SMS, push | Delivery, Identity | 📝 Stories written |
| | E15 · Rate limiting and protections built into the gateway | Gateway | 📝 Stories written |
| | E16 · Agents: their own identities, roles, groups and permissions | Identity, every service | 📝 Stories written |
| Later | More apps; Identity as a provider (OIDC SSO, SCIM, organizations, RBAC → ABAC); visual builder for assembling apps | Platform | ⚪ Backlog |

Story IDs read `MVP1-E3-02`: phase, epic, story. MVP1 and MVP2 number their epics separately.

## Stack

| Layer | Choice |
|---|---|
| Architecture | Independent services behind a gateway; one repository, one folder per service |
| Services and apps | Next.js + TypeScript |
| Hosting | Vercel, one project per service; AWS Lambda for the Extraction pipeline (MVP2) |
| Database | Neon (Postgres) + Drizzle ORM, one schema and role per service |
| Files | AWS S3 |
| API | REST under `/api/{service}/v1`, OpenAPI 3.1 and an MCP server per service |
| UI | `packages/ui-core` (design tokens and base components) and one `packages/ui-<service>` per service, as npm workspaces |
| Identity | AWS Cognito via OIDC (MVP1) → hand-built (MVP2) |
| AI | Claude API (MVP1) → Python + LangGraph on AWS Lambda (MVP2) |
| Payments | Stripe (test mode) |
| Notifications | Resend (email); Twilio or AWS SNS (SMS) and Web Push (MVP2) |
| Tests | Vitest; PGlite for database tests |

## How it's built

Built with Claude Code, from VS Code on a laptop and mostly from the Claude app on a phone.

1. Write the story: acceptance criteria, the service that owns it, its API design and its database design.
2. Design the module with the project's Claude Code skills (`.claude/skills/`: API spec, data model, schema, user journeys, UI components, read me), which also publish its product page.
3. Ask Claude Code to build one story per session; it opens a pull request that records what the session cost in tokens.
4. Review the diff and merge. Vercel deploys to 01scale.com automatically.
5. Close the story's issue with its measured token cost and the estimated cost for a human team.

The [How It's Built](https://01scale.com/how-its-built) pages show the skills, the token cost of every story, what a human team would cost, the roadmap of what is left to build (by dependency, size and value), the constraints and the expensive mistakes.

## Each module includes

Now:

- A story naming its service, with acceptance criteria, API design and database design ([MVP1 epics](docs/epics/MVP1-EPICS.md), [MVP2 epics](docs/epics/MVP2-EPICS.md))
- Design documents in `docs/services/<service>/`: read me, API spec, data model, schema, user journeys and UI components
- A decision log per epic in `docs/decisions/<epic>.md`: options considered and why
- A product page at `/products/<module>` with fifteen sections, from market outlook to schema; sections not designed yet say "Coming Soon..."
- Its UI components in the service's package, shown live in each state on the product page

Planned, once each module is built:

- Its API and MCP tools, live behind the gateway
- A tagged release and a 60-second demo walkthrough

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Other scripts: `npm run site:data` regenerates the product pages from the design files in `scripts/site/`, `npm run costs` rolls up the token ledger, and `npm run human-costs` refreshes the human-team estimate.

## Contact

Find me on LinkedIn, or reach out through [01scale.com](https://01scale.com).

---

© Nikhil Shrivastava. All rights reserved.
