# 01scale.com
Product Manager's Portfolio site
# 01scale

Working prototypes of products I've built in my career, rebuilt hands-on one module at a time and shipped live at **[01scale.com](https://01scale.com)**.

I'm Nikhil Shrivastava, a platform and AI product leader with 17+ years in regulated SaaS: identity, payments, integrations and AI. This repo is my proof of work. Each module is a small, working slice with its own demo, spec and decision log.

## Principles

- **Build the identity provider, not just the login page.** Identity features (sessions, magic links, passkeys, SSO, RBAC/ABAC) are built by hand, using only low-level libraries for crypto and email. No auth vendor.
- **Spec first.** Every module starts with a one-page spec and acceptance criteria.
- **Show the why.** Each module has a decision log covering options, trade-offs and build-vs-buy.
- **Secure by default.** Threat model, rate limiting, no account enumeration, audit logging, OWASP ASVS as the checklist.
- **Measure the agents.** AI features ship with an eval set, accuracy targets and cost per run.
- **Small slices, always live.** Every merge to `main` deploys to production.

## Roadmap

| Phase | Module | Status |
|---|---|---|
| 0 · Foundation | Hello world live at 01scale.com, CI/CD, logging | 🟡 In progress |
| 1 · Identity core | Sign-up, login, logout, sessions | ⚪ Planned |
| | Password recovery | ⚪ Planned |
| | Passwordless: magic link | ⚪ Planned |
| | Passkeys + MFA | ⚪ Planned |
| 2 · Accounts & access | Personal profile + photo | ⚪ Planned |
| | Business accounts, memberships, invites | ⚪ Planned |
| | RBAC → ABAC | ⚪ Planned |
| | OIDC provider (SSO), SCIM provisioning | ⚪ Planned |
| 3 · Agentic doc pipeline | Document upload | ⚪ Planned |
| | Extractor agent → structured JSON + CSV | ⚪ Planned |
| | Web research agent → document metadata | ⚪ Planned |
| | Multi-agent orchestration (LangGraph) | ⚪ Planned |
| 4 · Pay & deliver | Stripe Checkout (test mode) | ⚪ Planned |
| | Payment unlocks download | ⚪ Planned |
| | Email delivery workflow | ⚪ Planned |
| 5 · Agent ecosystem | MCP server with OAuth (agent identity) | ⚪ Planned |
| | Review responder with human-in-the-loop | ⚪ Planned |

## Stack

| Layer | Choice |
|---|---|
| App | Next.js + TypeScript |
| Hosting | Vercel |
| Database | Neon (Postgres) + Drizzle ORM |
| Files | AWS S3 |
| Agents | Python, LangGraph, Claude API on AWS Lambda |
| Payments | Stripe (test mode) |
| Email | Resend |

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

_Coming once the app is scaffolded._

## Contact

Find me on LinkedIn, or reach out through [01scale.com](https://01scale.com).

---

© Nikhil Shrivastava. All rights reserved.
