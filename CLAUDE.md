# CLAUDE.md — 01scale

Context for Claude Code sessions in this repo. Read this first, then the doc for the phase you're working on.

## What this is
01scale.com is Nikhil Shrivastava's live portfolio of working prototypes. It shows hiring managers for platform product leadership roles his hands-on experience building with AI.

It is built as a **platform of independent services** (Identity, Upload, LLM Extraction, Human Review, Payment, Delivery) behind one gateway. Each service is released, demoed and marketed on its own, with a UI, an API and MCP tools for agents. **Apps** are assembled from the services. The first app is **DocFlow** (working name): a user signs in, uploads a document, Claude extracts structured data, a human reviews low-confidence fields, the user pays, and the results (JSON + CSV) are delivered by download and email.

Later apps (for example Procure-to-Pay, Order-to-Cash) reuse the same services. Each service evolves through versions, from consuming an external cloud service to providing the capability itself, without its contract changing for the apps that use it. Read `docs/architecture/ARCHITECTURE.md` before any design or build work.

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
| Architecture: options, Nikhil's decision and why, service evolution | `docs/architecture/ARCHITECTURE.md` |
| API rules + endpoint index by service | `docs/architecture/API-DESIGN.md` |
| Database rules + table index by service | `docs/architecture/DATABASE-DESIGN.md` |
| Per-service developer guide, user journeys, UI components, API spec, data model and schema | `docs/services/<service>/` (Identity login: `docs/services/identity/`) |
| Infrastructure setup steps | `docs/infra/` (Cognito: `docs/infra/cognito.md`) |
| Eval plan (LLM outputs) | `docs/evals/EVALS.md` |
| Decision log per epic | `docs/decisions/<EPIC-ID>.md` |
| Prompts (versioned) | `prompts/<name>/v<N>.md` |
| Eval datasets & reports | `evals/datasets/`, `evals/reports/` |

**Issue IDs:** `MVP1-E3-02` = MVP1, epic 3, story 2. Branch names, PR titles and commit messages reference the ID. When asked to create GitHub issues, create one issue per story from the epics file: title `[ID] Story title`, body = user story + acceptance criteria + service + API design + database design + evals, labels `mvp1|mvp2`, `epic:<E#>`, `service:<name>`, plus `llm` where evals apply.

## Principles
- **Independent services.** Each platform service owns its code, its database schema, its API contract, its MCP tools, its UI components, its version and its deployment. A service never imports another service's code or touches another service's schema; it depends only on the other's published contract. Services are app-agnostic: no DocFlow-specific logic in a platform service. Architecture decisions in `ARCHITECTURE.md` are Nikhil's; write them in the first person singular ("I chose"), never "we".
- **Apps are thin.** DocFlow holds only its pages, its process record and the order in which it calls services. If logic could be useful to a second app, it belongs in a service.
- **API first.** Each service's API is its product; UIs and apps are clients of it. Every capability is an endpoint under `/api/{service}/v1`, designed in its story before any code is written. Nothing reads a service's database except that service. Follow `docs/architecture/API-DESIGN.md` (JSON, problem+json errors, cursor pagination, idempotency keys, per-service versioning, OpenAPI generated from zod).
- **Agents first.** Anything a person can do in the UI, an AI agent can do through the API with the user's permission: API keys for auth without a browser, an OpenAPI contract, an MCP server per service exposing the same operations as tools (combined at the gateway), stable error codes and idempotent writes. When adding an endpoint, add its MCP tool in the same PR. Payment and account-security actions keep a human in the loop.
- **Design lives in the story.** Each story in the epics files names its **Service** and has an **API design** and a **Database design**. Build exactly that. If the design needs to change, update the story (and the index in `docs/architecture/`) in the same PR and say why in the description. Do not build endpoints or tables ahead of their story.
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
| Repository | One repo, npm workspaces: `apps/web` (site + gateway), `apps/docflow`, `services/<name>`, `packages/` | same |
| Services and apps | Next.js (App Router) + TypeScript; each service is its own Vercel project | Extraction worker moves to Python on AWS Lambda |
| Gateway | `apps/web` at 01scale.com routes `/api/{service}/…` to the owning service and exchanges cookie or API key for an access token | same |
| API | REST under `/api/{service}/v1`, OpenAPI 3.1 generated from zod, versioned per service | same |
| Service identity | Short-lived JWT access tokens issued by Identity, verified by each service (`jose`) | same |
| Events | Signed HTTP events with an outbox per service | + queue (SQS) where a second consumer needs it |
| Agent access | API keys + MCP server per service, combined at `/api/mcp` | + OAuth for agent identity (later) |
| Identity | AWS Cognito via OIDC (`openid-client`) | Hand-built: magic link, passkeys, sessions |
| Database | Neon Postgres + Drizzle ORM: one project, a schema and role per service, no cross-schema access | same |
| Files | AWS S3 (private bucket, presigned URLs) | same |
| Extraction | Claude API (TypeScript SDK) inside the Extraction service | Python + LangGraph orchestrator on AWS Lambda (fan-out per document), same API contract |
| Validation | zod schemas + rule validators | + LLM-as-judge |
| Enrichment | — | Claude web search tool, with citations |
| Payments | Stripe Checkout (test mode) | Stripe Customers, SetupIntents, saved methods |
| Email | Resend | same |
| SMS / push | — | Twilio (or AWS SNS) / Web Push (VAPID, `web-push`) |
| Tests | Vitest; PGlite for DB tests | same |

## Workflow
1. Work on a branch named after the issue ID, then open a PR with what changed, why, how to test, and the acceptance criteria checked off.
2. Build inside the owning service's folder, API before UI: schema and migration, service function, route handler with zod validation, OpenAPI entry, MCP tool, tests, then the UI component and the app page that calls it. A story that touches two services changes the provider first, then the consumer.
3. New services start from the service template (`packages/service-kit`, story `MVP1-E0-07`). Do not hand-roll auth checks, error formats, logging or events in a service.
4. Every module has a product page on the site at `/products/<module>`, built from one template with seven sections: Read Me, Requirement EPIC, User Journey, UI Components, API Spec, Data Model, Schema (`app/products/`, story `MVP1-E0-10`). A section whose design is not finalized shows "Coming Soon..."; never invent content to fill it. Page content comes from `app/products/data.ts` (the stories in `docs/epics/`) and a per-service file such as `app/products/identity.ts` (the docs in `docs/services/<service>/`): when a story or service doc changes, change the page data in the same PR. When an endpoint ships, also update `app/apis/endpoints.ts`.
5. The site has three navigation items: Home, Products (two levels: MVP1, MVP2) and Architecture. The product's working name is **DocFlow** everywhere (site, docs, API paths); on the site it is defined once in `app/products/flow.tsx`, with the flow steps and which modules belong to each. Do not rename it unless Nikhil asks. `/products/vision` is the product vision page, and every module page shows the flow with its own step highlighted (story `MVP1-E0-11`): a new module must be added to a step in `flow.tsx`. Pages use the full screen width and must work from 320 to 1920 pixels wide, in light and dark mode.
6. Mark the story done in the epics file, close its GitHub issue and keep README.md's roadmap in sync when an epic ships.
7. Run evals with `npm run eval` on demand and on PRs labelled `evals`, not on every PR (they cost money).
8. Cloud sessions have limited network access: don't rely on reaching Neon, AWS, Stripe or Anthropic from the session. Use PGlite, mocks and recorded fixtures for tests.

## Current status
- Phase 0 (foundation): site live at 01scale.com on Vercel, with Home, Products (a page per module) and Architecture.
- Architecture decided: independent services behind a gateway, one repo, Vercel (+ Lambda for Extraction later), one Neon project with a schema per service.
- All APIs and tables are designed in the stories by owning service; none is built yet. The current code is still a single Next.js app at the repo root; moving it to `apps/web` is part of `MVP1-E0-07`.
- MVP1 stories exist as GitHub issues labelled `mvp1`, `epic:<E#>`, `service:<name>`.
- **Next:** MVP1 epic E0 (service template `E0-07`, gateway `E0-08`, then the rest of E0), then E1 (Identity with Cognito). See `docs/epics/MVP1-EPICS.md`.
