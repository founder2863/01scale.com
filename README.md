# 01scale

Working prototypes of products I've built in my career, rebuilt hands-on one module at a time and shipped live at **[01scale.com](https://01scale.com)**.

I'm Nikhil Shrivastava, a platform and AI product leader with 17+ years in regulated SaaS: identity, payments, integrations and AI. This repo is my proof of work. Each module is a small, working slice with its own demo, spec and decision log.

## Principles

- **Ship end to end first, then build the identity provider by hand.** MVP1 uses AWS Cognito through standard OIDC; MVP2 replaces it with hand-built passwordless identity (magic links, passkeys, sessions), using only low-level libraries for crypto and email.
- **Spec first.** Every module starts with a one-page spec and acceptance criteria.
- **Show the why.** Each module has a decision log covering options, trade-offs and build-vs-buy.
- **Secure by default.** Threat model, rate limiting, no account enumeration, audit logging, OWASP ASVS as the checklist.
- **Measure the agents.** AI features ship with an eval set, accuracy targets and cost per run.
- **Small slices, always live.** Every merge to `main` deploys to production.

## Roadmap

First product: **DocFlow** — upload an invoice, Claude extracts the data, a human reviews what the system is unsure about, pay, and get JSON + CSV. Details: [MVP1 PRD](docs/prd/MVP1-PRD.md) · [MVP2 PRD](docs/prd/MVP2-PRD.md) · [Evals](docs/evals/EVALS.md).

| Phase | Epic | Status |
|---|---|---|
| 0 · Foundation | Hello world live at 01scale.com | ✅ Done |
| MVP1 | E0 · Foundation: database, audit log, CI, eval harness | ⚪ Planned |
| | E1 · Accounts with AWS Cognito (sign-up, sign-in, recovery, account page) | ⚪ Planned |
| | E2 · Document upload to S3 | ⚪ Planned |
| | E3 · Extraction with Claude | ⚪ Planned |
| | E4 · Human review of low-confidence fields | ⚪ Planned |
| | E5 · JSON review, metadata and CSV | ⚪ Planned |
| | E6 · Payment (Stripe Checkout) | ⚪ Planned |
| | E7 · Success, download and email | ⚪ Planned |
| MVP2 | E8 · Passwordless identity built by hand (magic link, passkeys) | ⚪ Planned |
| | E9 · Multi-document pipeline (LangGraph on Lambda) | ⚪ Planned |
| | E10 · LLM as judge | ⚪ Planned |
| | E11 · Web enrichment and chat correction | ⚪ Planned |
| | E12 · Multi-document review and outputs | ⚪ Planned |
| | E13 · Saved payment methods and payment history | ⚪ Planned |
| | E14 · Notifications: email, SMS, push | ⚪ Planned |
| Later | Business accounts, RBAC → ABAC, OIDC provider (SSO), SCIM, MCP server, review responder | ⚪ Backlog |

## Stack

| Layer | Choice |
|---|---|
| App | Next.js + TypeScript |
| Hosting | Vercel |
| Database | Neon (Postgres) + Drizzle ORM |
| Files | AWS S3 |
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
