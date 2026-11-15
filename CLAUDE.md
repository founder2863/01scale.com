# CLAUDE.md — 01scale

Context for Claude Code sessions in this repo. Read this first, then the doc for the phase you're working on.

## What this is
01scale.com is Nikhil Shrivastava's live portfolio of working prototypes. It shows hiring managers for platform product leadership roles his hands-on experience building with AI. The first product is **DocFlow** (working name): a user signs in, uploads a document, Claude extracts structured data, a human reviews low-confidence fields, the user pays, and the results (JSON + CSV) are delivered by download and email.

It ships in two phases:
- **MVP1:** the whole journey end to end, using managed services where they save time (AWS Cognito for identity).
- **MVP2:** identity rebuilt by hand (passwordless + passkeys), multi-document, LLM-as-judge, web enrichment with chat correction, saved payment methods, and SMS + push notifications.

## Owner
Nikhil is a platform & AI product leader (17+ years: identity, payments, integrations, AI) and is technical. He builds mostly from the Claude app on his phone, sometimes VS Code. Explain non-obvious technical choices briefly in PR descriptions, because he will be asked about them in interviews.

## Where things live
| Doc | Path |
|---|---|
| MVP1 PRD | `docs/prd/MVP1-PRD.md` |
| MVP2 PRD | `docs/prd/MVP2-PRD.md` |
| MVP1 epics & issues | `docs/epics/MVP1-EPICS.md` |
| MVP2 epics & issues | `docs/epics/MVP2-EPICS.md` |
| Architecture decision (options, why distributed services) | `docs/architecture/ARCHITECTURE.md` |
| API rules + endpoint index | `docs/architecture/API-DESIGN.md` |
| Database rules + table index | `docs/architecture/DATABASE-DESIGN.md` |
| Eval plan (LLM outputs) | `docs/evals/EVALS.md` |
| Decision log per epic | `docs/decisions/<EPIC-ID>.md` |
| Prompts (versioned) | `prompts/<name>/v<N>.md` |
| Eval datasets & reports | `evals/datasets/`, `evals/reports/` |

**Issue IDs:** `MVP1-E3-02` = MVP1, epic 3, story 2. Branch names, PR titles and commit messages reference the ID. When asked to create GitHub issues, create one issue per story from the epics file: title `[ID] Story title`, body = user story + acceptance criteria + API design + database design + evals, labels `mvp1|mvp2`, `epic:<E#>`, plus `llm` where evals apply.

## Principles
- **API first.** The API is the product and the website is one client of it. Every backend capability is an endpoint under `/api/v1`, designed in its story before any code is written. Pages never read the database directly; they go through the same service functions as the API. Follow `docs/architecture/API-DESIGN.md` (JSON, problem+json errors, cursor pagination, idempotency keys, OpenAPI generated from zod).
- **Agents first.** Anything a person can do in the UI, an AI agent can do through the API with the user's permission: API keys for auth without a browser, an OpenAPI contract, an MCP server exposing the same operations as tools, stable error codes and idempotent writes. When adding an endpoint, add its MCP tool in the same PR. Payment and account-security actions keep a human in the loop.
- **Design lives in the story.** Each story in the epics files has an **API design** and a **Database design**. Build exactly that. If the design needs to change, update the story (and the index in `docs/architecture/`) in the same PR and say why in the description. Do not build endpoints or tables ahead of their story.
- **Phase-specific identity rule.**
  - MVP1: AWS Cognito (managed login) is allowed. Integrate it only through standard OIDC (authorization code + PKCE) with `openid-client`, so MVP2 can swap in the hand-built provider behind the same interface. No Amplify UI kits, no NextAuth.
  - MVP2: **build identity by hand.** No auth vendors or full auth frameworks (no Auth0, Clerk, Cognito, Better Auth, NextAuth). Allowed low-level libraries: `@node-rs/argon2` (password hashing), `jose` (JWT/JWS), `@simplewebauthn/*` (passkeys), Node `crypto`, Resend (email sending).
- **Spec first.** Build from the story's acceptance criteria. If a story is ambiguous, add the question to the PR description instead of guessing silently.
- **Decision log.** Record options and trade-offs in `docs/decisions/<EPIC-ID>.md`.
- **Secure by default.** Store only hashes of tokens and passwords. Use HttpOnly + Secure + SameSite cookies. Keep S3 private, with short-lived presigned URLs. Verify webhook signatures. Rate-limit auth endpoints and never reveal whether an email exists. Write audit log entries for auth, review, payment and delivery events. Use OWASP ASVS as the checklist. Never log document contents or PII.
- **LLM features ship with evals.** Thresholds are in `docs/evals/EVALS.md`. A prompt or model change must include an eval report in the PR.
- **Never trust the model blindly.** Validate every LLM output against a schema, check it with deterministic rules, and route low confidence to a human.
- **Small slices.** One story per PR where possible. Never commit secrets; use environment variables (set in Vercel and AWS).

## Stack
| Layer | MVP1 | MVP2 |
|---|---|---|
| App | Next.js (App Router) + TypeScript on Vercel | same |
| API | REST under `/api/v1` (Next.js route handlers), OpenAPI 3.1 generated from zod | same |
| Agent access | API keys + MCP server at `/api/mcp` | + OAuth for agent identity (later) |
| Identity | AWS Cognito via OIDC (`openid-client`) | Hand-built: magic link, passkeys, sessions |
| Database | Neon Postgres + Drizzle ORM | same |
| Files | AWS S3 (private bucket, presigned URLs) | same |
| Extraction | Claude API (TypeScript SDK) from a Next.js route | Python + LangGraph orchestrator on AWS Lambda (fan-out per document) |
| Validation | zod schemas + rule validators | + LLM-as-judge |
| Enrichment | — | Claude web search tool, with citations |
| Payments | Stripe Checkout (test mode) | Stripe Customers, SetupIntents, saved methods |
| Email | Resend | same |
| SMS / push | — | Twilio (or AWS SNS) / Web Push (VAPID, `web-push`) |
| Tests | Vitest; PGlite for DB tests | same |

## Workflow
1. Work on a branch named after the issue ID, then open a PR with what changed, why, how to test, and the acceptance criteria checked off.
2. Build API before UI within a story: schema and migration, service function, route handler with zod validation, OpenAPI entry, MCP tool, tests, then the page that calls it.
3. When an endpoint ships, change its status on the site's APIs page (`app/apis/endpoints.ts`) and the module's status on the demos page (`app/demos/modules.ts`).
4. Mark the story done in the epics file and keep README.md's roadmap in sync when an epic ships.
5. Run evals with `npm run eval` on demand and on PRs labelled `evals`, not on every PR (they cost money).
6. Cloud sessions have limited network access: don't rely on reaching Neon, AWS, Stripe or Anthropic from the session. Use PGlite, mocks and recorded fixtures for tests.

## Current status
- Phase 0 (foundation): site live at 01scale.com on Vercel, with a home page, product demos page and APIs page.
- All APIs and tables are designed in the stories; none is built yet.
- **Next:** MVP1, starting with epic E0 (foundation), then E1 (accounts with Cognito). See `docs/epics/MVP1-EPICS.md`.
