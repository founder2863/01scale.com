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

## Roadmap

First app: **DocFlow** — upload an invoice, Claude extracts the data, a human reviews what the system is unsure about, pay, and get JSON + CSV. Details: [MVP1 PRD](docs/prd/MVP1-PRD.md) · [MVP2 PRD](docs/prd/MVP2-PRD.md) · [Evals](docs/evals/EVALS.md).

| Phase | Epic | Service | Status |
|---|---|---|---|
| 0 · Foundation | Site live at 01scale.com | Site | ✅ Done |
| MVP1 | E0 · Foundation: service template, gateway, DocFlow app shell, database, audit log, CI, eval harness, agent access (API keys + MCP) | Platform | ⚪ Planned |
| | E1 · Accounts with AWS Cognito (sign-up, sign-in, recovery, account page) | Identity | ⚪ Planned |
| | E2 · Document upload to S3 | Upload | ⚪ Planned |
| | E3 · Extraction with Claude | LLM Extraction | ⚪ Planned |
| | E4 · Human review of low-confidence fields | Human Review | ⚪ Planned |
| | E5 · JSON review, metadata and CSV | DocFlow app | ⚪ Planned |
| | E6 · Payment (Stripe Checkout) | Payment | ⚪ Planned |
| | E7 · Success, download and email | Delivery, DocFlow app | ⚪ Planned |
| MVP2 | E8 · Passwordless identity built by hand (magic link, passkeys) | Identity | ⚪ Planned |
| | E9 · Multi-document pipeline (LangGraph on Lambda) | LLM Extraction, DocFlow app | ⚪ Planned |
| | E10 · LLM as judge | LLM Extraction, Human Review | ⚪ Planned |
| | E11 · Web enrichment and chat correction | LLM Extraction, Human Review | ⚪ Planned |
| | E12 · Multi-document review and outputs | DocFlow app | ⚪ Planned |
| | E13 · Saved payment methods and payment history | Payment | ⚪ Planned |
| | E14 · Notifications: email, SMS, push | Delivery, Identity | ⚪ Planned |
| Later | More apps (Procure-to-Pay, Order-to-Cash); Identity as a provider (OIDC SSO, SCIM, organizations, RBAC → ABAC); OAuth for agent identity; visual builder for assembling apps | Platform | ⚪ Backlog |

## Stack

| Layer | Choice |
|---|---|
| Architecture | Independent services behind a gateway; one repository, one folder per service |
| Services and apps | Next.js + TypeScript |
| Hosting | Vercel, one project per service; AWS Lambda for the Extraction pipeline (MVP2) |
| Database | Neon (Postgres) + Drizzle ORM, one schema and role per service |
| Files | AWS S3 |
| API | REST under `/api/{service}/v1`, OpenAPI 3.1 and an MCP server per service |
| Identity | AWS Cognito via OIDC (MVP1) → hand-built (MVP2) |
| AI | Claude API (MVP1) → Python + LangGraph on AWS Lambda (MVP2) |
| Payments | Stripe (test mode) |
| Notifications | Resend (email); Twilio or AWS SNS (SMS) and Web Push (MVP2) |

## How it's built

Built with Claude Code, from VS Code on a laptop and from the Claude app on a phone.

1. Write the spec for the next slice.
2. Ask Claude Code to build it; it opens a pull request.
3. Review the diff and merge.
4. Vercel deploys to 01scale.com automatically.

## Each module includes

- A story naming its service, with acceptance criteria, API design and database design
- `SPEC.md`: problem, user story, acceptance criteria, out of scope
- `DECISIONS.md`: options considered and why
- A tagged release and a 60-second demo walkthrough

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

## Contact

Find me on LinkedIn, or reach out through [01scale.com](https://01scale.com).

---

© Nikhil Shrivastava. All rights reserved.
