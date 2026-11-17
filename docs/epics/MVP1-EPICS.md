# MVP1 — Epics and issues

Source: `docs/prd/MVP1-PRD.md`. Evals: `docs/evals/EVALS.md`.
Each story becomes one GitHub issue: `[ID] Title`. Size: S ≈ half a day, M ≈ 1–2 days, L ≈ 3+ days.
Acceptance criteria (AC) use Given / When / Then. A story is done when all its AC pass, tests exist for its logic, and its evals (if any) meet thresholds.

**Architecture.** 01scale is a set of independent platform services (Identity, Upload, LLM Extraction, Human Review, Payment, Delivery) behind one gateway, and DocFlow is the first app assembled from them. See `docs/architecture/ARCHITECTURE.md`. Every story names the **Service** that owns it and carries an **API design** (endpoints, request, response, errors) and a **Database design** (tables in that service's own schema). They are the contract for the story: review them before code is written, and change the story first if the design needs to change. Shared rules are in `docs/architecture/API-DESIGN.md` and `docs/architecture/DATABASE-DESIGN.md`. Nothing here is built until its story is picked up.

---

## E0 · Foundation
**Goal:** the plumbing every later epic relies on.

### MVP1-E0-01 · Database and migrations — S
As a developer, I want Neon Postgres with Drizzle migrations so the schema evolves safely.
- **AC1:** Given a service's `DATABASE_URL` is set, when that service deploys, then its pending migrations run before the new version serves traffic. Each service migrates only its own schema.
- **AC2:** Given a test run, when tests use the database, then they run against PGlite with the same migrations and need no network.
- **AC3:** One Neon project holds a separate schema and database role per service. A test proves a service's role cannot read another service's schema. Each service's tables are created by the story that needs them.
- **Service:** Platform (service template)
- **API design:** No endpoints.
- **Database design:** One Neon project; each service has its own Postgres schema (`identity`, `upload`, `extraction`, `review`, `payment`, `delivery`, `docflow`) and its own database role that can reach only that schema. No foreign keys between schemas: another service's record is stored as a plain ID. Conventions for every table: `id uuid` primary key (UUIDv7), `created_at timestamptz default now()`, snake_case, status as `text` with a `CHECK` list, money as integer minor units + ISO currency, `owner_id uuid` (the user ID from the access token) on every user-owned table with an index.

### MVP1-E0-02 · Audit log — S
As the owner, I want every important event recorded so I can trace what happened.
- **AC1:** A single `audit(actorId, action, target, metadata)` helper in the service template writes to that service's `audit_events`.
- **AC2:** The metadata is checked against an allow-list: document contents, tokens and full card or phone numbers are rejected by a unit test.
- **AC3:** Actions are a fixed list (`auth.*`, `document.*`, `review.*`, `order.*`, `delivery.*`).
- **Service:** Platform (service template)
- **API design:**
  - `GET /api/{service}/v1/audit-events` (signed in) — List my audit events in that service (admins: all users). Query `action`, `cursor`, `limit` → `200 {data: [AuditEvent], next_cursor}`.
- **Database design:** In every service's schema: `audit_events` (id, actor_id, actor_type `user|api_key|service|system`, action, target_type, target_id, metadata jsonb, request_id, created_at). Append-only: the service's role has no `UPDATE` or `DELETE` grant on it.

### MVP1-E0-03 · CI — S
- **AC1:** On every PR, lint, typecheck and unit tests run in GitHub Actions for each service or app the PR touches, and the PR can't merge if they fail.
- **AC2:** Given a PR with the label `evals`, the eval workflow runs and posts its summary as a PR comment.
- **Service:** Platform (service template)
- **API design:** No endpoints. Each service's pipeline also fails if its committed OpenAPI file differs from the one generated from code.
- **Database design:** No schema change. Each service's pipeline runs its migrations against PGlite to prove they apply from empty.

### MVP1-E0-04 · Eval harness skeleton — M
As the owner, I want `npm run eval` so the quality of LLM output is measured, not guessed.
- **AC1:** `npm run eval -- --set dev` runs every case in `evals/datasets/invoices/dev`, compares the output with ground truth and writes `evals/reports/<date>-<prompt-version>.md`.
- **AC2:** The report shows each metric from `EVALS.md` §MVP1 with pass/fail against its threshold, plus cost and latency.
- **AC3:** The command exits non-zero if any MVP1 threshold fails, or if a metric drops more than 2 points from the saved baseline.
- **AC4:** With `--record`, model responses are saved as fixtures, so later runs can use `--replay` without API calls.
- **Service:** LLM Extraction
- **API design:** No endpoints; the eval harness is a CLI in the Extraction service.
- **Database design:** No schema change; datasets and reports are files in `evals/`.

### MVP1-E0-05 · API contract in every service — M
As a developer or an AI agent, I want every service to follow the same API rules so I learn them once.
- **AC1:** Each service's endpoints live under `/api/{service}/v1`, take and return JSON, and are described in an OpenAPI 3.1 document served at `GET /api/{service}/v1/openapi.json`. The document is generated from the zod schemas the handlers validate with, and that service's pipeline fails if the committed copy is out of date.
- **AC2:** Errors use one shape, RFC 9457 `application/problem+json`: `{type, title, status, detail, code, request_id, errors[]}`. `code` is a stable machine-readable string.
- **AC3:** List endpoints use cursor pagination (`cursor`, `limit` ≤ 100 → `{data, next_cursor}`).
- **AC4:** `POST` endpoints that create things accept an `Idempotency-Key` header; a repeat with the same key and body returns the first response, and a repeat with a different body returns `422`.
- **AC5:** Each service versions its API on its own. Additive changes stay in the current version; a breaking change ships as `/v2` while `/v1` keeps working until its consumers have moved.
- **AC6:** Every response carries `X-Request-Id`, the same ID is passed on every call to another service, and rate-limited responses carry `Retry-After`.
- **Service:** Platform (service template)
- **API design:**
  - `GET /api/{service}/v1/health` (public) — Liveness check for that service. → `200 {status: "ok", service, version}`.
  - `GET /api/{service}/v1/openapi.json` (public) — That service's OpenAPI 3.1 contract. → `200` OpenAPI document, generated from the zod schemas the handlers validate with.
- **Database design:** In every service's schema: `idempotency_keys` (key, owner_id, method, path, request_hash, response_status, response_body jsonb, created_at; primary key (owner_id, key); rows expire after 24 hours).

### MVP1-E0-06 · Agent access: API keys and MCP — M
As an AI agent acting for a user, I want to authenticate without a browser and discover what I can do.
- **AC1:** A signed-in user can create, list and revoke API keys on `/account/api-keys`. The secret (`sk_01s_…`) is shown once; only its hash is stored, in Identity.
- **AC2:** `Authorization: Bearer <key>` is accepted by the gateway wherever a session cookie is, limited to the key's scopes (`upload:read`, `upload:write`, `extraction:read`, …). Keys can never manage keys, change the password or delete the account.
- **AC3:** Every service has an MCP server at `POST /api/{service}/mcp` exposing its operations as tools with the same names, inputs and outputs as its OpenAPI document. A test fails if an operation tagged `agent` has no matching tool.
- **AC4:** Every API-key and MCP call is audited with `actor_type: api_key` and the key ID.
- **AC5:** Payment still needs a human: an agent receives a `checkout_url` for the user to open and cannot complete payment itself.
- **Service:** Identity, plus every service
- **API design:**
  - `GET /api/identity/v1/api-keys` (signed in) — List my API keys (name, prefix, scopes, last used). Never returns the secret. → `200 {data: [ApiKey]}`.
  - `POST /api/identity/v1/api-keys` (signed in) — Create an API key for an agent or script. The secret is shown once. Body `{name, scopes[], expires_at?}` → `201 {api_key, secret}`. Session only: a key cannot create keys. Errors: `422`.
  - `DELETE /api/identity/v1/api-keys/{keyId}` (signed in) — Revoke an API key immediately. → `204`. Errors: `404`.
  - `POST /api/{service}/mcp` (signed in) — That service's MCP server: its operations exposed as tools for AI agents. Streamable HTTP. Tools map 1:1 to the service's OpenAPI `operationId`s and call the same service functions as the REST handlers.
- **Database design:** `identity.api_keys` (id, owner_id, name, prefix, key_hash unique, scopes text[], last_used_at, expires_at, revoked_at, created_at). Only the SHA-256 hash of the secret is stored; `prefix` (first 8 characters) is kept for display.

### MVP1-E0-07 · Service template — L
As the owner, I want one template every service is built from, so each new service is mostly copying and all of them behave the same way.
- **AC1:** The repository is one workspace: `apps/web` (the site and gateway), `apps/docflow`, `services/<name>` for each platform service, and `packages/` for shared code. Each service has its own package, version, changelog and Vercel project.
- **AC2:** `packages/service-kit` provides: access-token verification, the error format, request IDs and structured logs, the audit helper, idempotency, cursor pagination, OpenAPI and MCP generation, and signed outbound events.
- **AC3:** A boundary check fails the pipeline if a service imports another service's code or names another service's schema. Services depend only on each other's published contract.
- **AC4:** Each service has its own pipeline, triggered only by changes to its folder or to `packages/`, and deploys on its own. Reverting one service does not redeploy the others.
- **AC5:** Outbound events are written in the same database transaction as the change (outbox) and delivered with an HMAC signature and retries.
- **AC6:** Each service ships a UI package (`packages/ui-<name>`) of React components that call only its API, and a product page on 01scale.com built from the shared template (`MVP1-E0-10`): Read Me, Requirement EPIC, User Journey, UI Components, API Spec, Data Model and Schema, plus a try-it demo and its MCP tools once the service is live.
- **AC7:** Every call to another service has a timeout and a safe retry; a service being down returns a clear `503` problem response, never corrupt data.
- **AC8:** Calls to other services go through the gateway (decision on #21), with the caller's token, a service token or a delegated token (decision on #24). Every endpoint states the scope it needs.
- **AC9:** An event goes only to the app that started the work, found by its `reference` prefix (`EVENT_ROUTES`); platform-wide events such as `identity.user.deleted` go to every service and app (decision on #13).
- **Service:** Platform (service template)
- **API design:** No endpoints of its own. The template gives every service the endpoints in E0-02, E0-05 and E0-06, access-token verification, the error format, and signed outbound events: `POST <subscriber_url>` with `{event_id, type, occurred_at, data}` and an `X-01scale-Signature` HMAC header, retried with backoff.
- **Database design:** In every service's schema: `outbound_events` (id, type, payload jsonb, subscriber, status `pending|delivered|failed`, attempts, next_attempt_at, created_at). Events are written in the same transaction as the change they describe, then delivered (outbox pattern), so an event is never lost or sent for a change that rolled back.

### MVP1-E0-08 · Gateway — M
As a user or an agent, I want one address for the whole platform.
- **AC1:** `01scale.com/api/{service}/…` is routed to the service that owns it. Services are not reachable by browsers at any other public address.
- **AC2:** The gateway turns a session cookie or API key into a short-lived access token and forwards it; services never see cookies or API keys. An access token Identity already issued (a service or delegated token) is checked for signature and expiry and passed through unchanged.
- **AC6:** Services and apps call each other through the gateway, like every other client (decision on #21).
- **AC3:** `GET /api/openapi.json` returns one combined contract and `POST /api/mcp` one combined MCP server with tools namespaced by service.
- **AC4:** The gateway applies rate limits per user and per IP, checks `Origin` on cookie-authenticated writes, and adds `X-Request-Id`.
- **AC5:** The gateway contains no business logic and no data.
- **Service:** Gateway
- **API design:**
  - `GET /api/health` (public) — Health of the platform: the gateway and each service behind it. → `200 {status, services: {identity, upload, …}}`; `503` if the gateway itself is unhealthy.
  - `GET /api/openapi.json` (public) — One combined OpenAPI document for every service. → `200`; merged from each service's own contract, so agents can discover the whole platform in one call.
  - `POST /api/mcp` (signed in) — One combined MCP server: every service's tools, namespaced by service. Tool names are `<service>.<operationId>` (for example `upload.createFile`). Calls are forwarded to the owning service's MCP server.
- **Database design:** No tables; the gateway holds no data.

### MVP1-E0-09 · DocFlow app shell — M
As the owner, I want DocFlow to be a thin app that only connects platform services, so the next app can be built the same way.
- **AC1:** `apps/docflow` holds the DocFlow pages, its own API under `/api/docflow/v1`, and one table of process records. It contains no identity, storage, extraction, review, payment or email logic.
- **AC2:** DocFlow calls the services' APIs in a fixed order: upload → extraction → review → payment → delivery. It forwards the user's access token, so each service applies its own ownership checks.
- **AC3:** DocFlow reacts to signed service events on its webhook (extraction finished, order paid, user deleted) and each event is processed once.
- **AC4:** A boundary check fails the pipeline if a platform service refers to DocFlow.
- **Service:** DocFlow app
- **API design:**
  - `POST /api/docflow/v1/webhooks/{service}` (service) — Receives signed events from platform services and moves the process forward. HMAC-signed body `{event_id, type, occurred_at, data}` → `200`. Idempotent on `event_id`. Handles `extraction.job.completed|failed`, `payment.order.paid|expired|failed`, `identity.user.deleted`. Errors: `401` bad signature.
- **Database design:** `docflow.documents` (id, owner_id, file_name, file_id, job_id, review_task_id, order_id, status `pending_upload|uploaded|rejected|extracting|extraction_failed|needs_review|reviewed|paid`, created_at). The process record: it holds only IDs of records owned by other services. `docflow.inbound_events` (event_id primary key, type, received_at) gives idempotency.

### MVP1-E0-10 · Site navigation and product page template — M
As a hiring manager, I want every module to have its own page laid out the same way, on any device, so I can judge the product thinking quickly.
- **AC1:** The site has three navigation items: Home, Products and Architecture.
- **AC2:** The Products menu is organized at two levels, MVP1 and MVP2, with the numbered modules under each. Every number is fully visible on a phone, including 10 to 15.
- **AC3:** Choosing a module opens its own page in the same tab, with a service introduction at the top and seven sections: Read Me, Requirement EPIC, User Journey, UI Components, API Spec, Data Model and Schema. On a desktop the sections are a vertical list on the left; on a phone or tablet they are a bar that scrolls sideways and stays in view.
- **AC4:** Every module uses the same template. A section whose design is not finalized shows "Coming Soon..." and says what will appear there. Requirements, endpoints and data notes that already exist in the stories are shown.
- **AC5:** All seven sections are filled for Login using AWS (Identity, version 1).
- **AC6:** Pages use the full width of the screen and work at 320, 390, 768, 1024, 1440 and 1920 pixels wide, in light and dark mode, with no sideways scrolling of the page.
- **AC7:** Old addresses keep working: `/demos` opens Products and `/demos/login` opens Login using AWS.
- **Service:** Site (`apps/web`)
- **API design:** No endpoints. The pages are static and read their content from `app/products/data.ts` (generated from the stories in `docs/epics/`) and `app/products/identity.ts` (generated with `docs/services/identity/`).
- **Database design:** No tables.

### MVP1-E0-11 · Product vision page and flow diagram — S
As a hiring manager, I want one page that explains the whole product and shows where each component fits, so I understand the parts in context.
- **AC1:** In the Products menu and on the Products page, the group headings read "DocFlow Platform MVP1" and "DocFlow Platform MVP2". Choosing a heading opens the product vision page.
- **AC2:** The product vision page explains: what the product is, the problem and who it is for, why I am building it, why it is built from platform components, and what the end product will be (MVP1, MVP2, later).
- **AC3:** The page shows the whole flow as a diagram: Sign in → Upload → Extract → Review → Results → Pay → Deliver, with the component behind each step and what the step does. Each step opens that component's page.
- **AC4:** Every component page shows the same flow under its introduction, on every tab, with that component's step highlighted and the other steps visibly greyed out. The heading above it links to the vision page.
- **AC5:** A module that spans steps (for example web enrichment and chat correction) highlights each step it belongs to. MVP2 modules highlight the step they extend.
- **AC6:** On a phone every step is visible at once, so the highlighted step is never off-screen.
- **AC7:** The product name is defined in one place on the site, so a rename is a single edit. DocFlow is the working name, the same as in the design documents and API addresses.
- **Service:** Site (`apps/web`)
- **API design:** No endpoints. The flow and the mapping of modules to steps live in `app/products/flow.tsx`.
- **Database design:** No tables.

### MVP1-E0-12 · Design skills and How It's Built page — M
As a hiring manager, I want to see how the work is done with AI, not only what was built, so I can judge how the builder works.
- **AC1:** Designing a module is written down as one skill per document (API spec, data model, schema, user journey, UI components, read me), one that publishes the product page, and one that runs them in order. They live in `.claude/skills/` and follow one shared rules file, `docs/process/DESIGN-RULES.md`.
- **AC2:** Each skill states what to read first, what to produce, the rules that are easy to get wrong, and the checks that say it is done.
- **AC3:** The scripts that generate the design documents and the product page data are kept in the repository (`scripts/site/`) and run with `npm run site:data`, so the next session can reproduce them.
- **AC4:** The product page template works for any module with a design, not only Identity.
- **AC5:** The site has a How It's Built page in the navigation, with a Skills section listing each skill, its job, what it reads and produces, and a link to its file; and an Agents section marked "Coming Soon...".
- **AC6:** The skills are proven by designing a second module with them (Upload is next). Until then the page says their first run is pending.
- **AC7:** How It's Built has three sections, each its own tab and address: Skills (`/how-its-built`, the default), Token Costs (`/how-its-built/token-costs`) and Agents (`/how-its-built/agents`). The header's How It's Built item opens a menu with the same three; choosing How It's Built lands on the tabbed page with Skills open. The tab bar stays in view and works from 320 to 1920 pixels wide, in light and dark mode. (Added from Nikhil's review of PR #62.)
- **Service:** Site (`apps/web`) and repository tooling
- **API design:** No endpoints.
- **Database design:** No tables.

### MVP1-E0-13 · Token cost tracking — S
As a hiring manager, I want to see what each story cost to build with AI, including rework, so I can judge the builder's cost discipline.
- **AC1:** Every request in a working session is measured: tokens used and cost, from the session record, using the cost Claude Code computes itself. No cost is entered by hand.
- **AC2:** Each request is assigned to a story as build or rework, or to a scaffolding area (questions, discovery, tooling, process), in a ledger kept in the repository (`docs/process/token-ledger.json`).
- **AC3:** The How It's Built page has a Token Costs section with a table per story: tokens, build cost, rework cost, total and token yield; a separate scaffolding table; and running totals.
- **AC4:** Token yield per story is build tokens divided by build plus rework tokens, and is defined on the page.
- **AC5:** A cost the tool has not recorded yet is shown as pending, never estimated.
- **AC6:** Updating the table is one command (`npm run costs`) and a skill (`record-token-costs`) describes when and how to do it.
- **Service:** Site (`apps/web`) and repository tooling
- **API design:** No endpoints.
- **Database design:** No tables.

---

## E1 · Accounts with AWS Cognito (MVP1 "a")
**Goal:** users can create and manage an account securely, through OIDC so the provider can be swapped in MVP2.

### MVP1-E1-01 · Cognito user pool setup — S
- **AC1:** The user pool uses email as the username, requires a verified email and has a password policy of at least 12 characters with a mix of character types.
- **AC2:** Managed login is enabled and branded with the 01scale name, using an app client with the authorization code flow + PKCE and callback/logout URLs for production and localhost.
- **AC3:** The configuration is documented in `docs/infra/cognito.md`, with screenshots or CLI commands, so it can be rebuilt.
- **Service:** Identity
- **API design:** No endpoints; infrastructure only.
- **Database design:** No schema change.

### MVP1-E1-02 · Sign up with email verification — M
As a new user, I want to sign up with my email and password so I can use DocFlow.
- **AC1:** Given I'm signed out, when I choose "Sign up", then I'm taken to Cognito managed login's sign-up screen.
- **AC2:** Given I submit a valid email and password, when Cognito sends a verification code and I enter it, then I land on `/documents` signed in.
- **AC3:** Given I haven't verified my email, then I can't reach any protected page.
- **AC4:** On the first sign-in, a `users` row is created with `cognito_sub` and email, and `auth.signup` is audited.
- **Service:** Identity
- **API design:**
  - `GET /api/identity/v1/auth/login` (public) — Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE). Query `mode=signin|signup`, `return_to` (same-origin path only) → `302` to Cognito managed login. Stores `state`, `nonce` and the PKCE verifier in a short-lived HttpOnly cookie.
  - Sign-up shares the callback in E1-03.
- **Database design:** `identity.users` (id, cognito_sub unique, email unique (case-insensitive), email_verified_at, is_admin boolean default false, created_at).

### MVP1-E1-03 · Sign in and sign out — M
- **AC1:** Sign-in uses the OIDC authorization code flow with PKCE and `state`/`nonce` checks via `openid-client`; a mismatch is rejected.
- **AC2:** After sign-in, the app creates its own session cookie (HttpOnly, Secure, SameSite=Lax). Cognito tokens stay on the server and never reach browser JavaScript.
- **AC3:** Sign-out clears the app session and calls Cognito's logout endpoint, so the next sign-in shows the login form.
- **AC4:** `auth.signin` and `auth.signout` are audited.
- **AC5:** A registered service or app can sign in as itself with a client secret, and a service allowed to act for users can exchange its token for a 5-minute token for one user, carrying `act` (decision on #24, `docs/decisions/MVP1-E1.md`). Delegated tokens never carry Identity scopes.
- **Service:** Identity
- **API design:**
  - `GET /api/identity/v1/auth/callback` (public) — OIDC redirect target: exchanges the code and creates the session. Query `code`, `state` → `302` to `return_to` with the session cookie set. Errors: `400` on `state`/`nonce` mismatch or unverified email.
  - `POST /api/identity/v1/auth/logout` (signed in) — End the current session and sign out of the identity provider. → `200 {logout_url}` (the client follows it to clear the provider session).
  - `GET /api/identity/v1/session` (signed in) — Who am I: the current session and user, or 401. → `200 {user: {id, email}, session: {expires_at}, auth: "session"|"api_key", scopes[]}`. Errors: `401`.
  - `POST /api/identity/v1/token` (service) — Exchange a session cookie or API key for a short-lived access token (called by the gateway). → `200 {access_token, expires_in: 300}`. The token is a signed JWT with `sub`, `scopes`, `is_admin`, `aud` and `auth` (`session`, `api_key`, `service` or `delegated`). Also: `grant_type: client_credentials` (`client_id`, `client_secret`) → a service token with `app`; and `grant_type: urn:ietf:params:oauth:grant-type:token-exchange` with a service token and `on_behalf_of` → a delegated token with `act`. Errors: `401`, `403 delegation_not_allowed`, `404 user_not_found`.
  - `GET /api/identity/v1/jwks` (public) — The public keys services use to verify access tokens. → `200` JWKS. Cacheable; keys rotate with overlap so old tokens stay valid until they expire.
- **Database design:** `identity.sessions` (id, user_id → users, token_hash unique, created_at, expires_at, revoked_at). `identity.signing_keys` (kid, public_jwk, private_key_encrypted, created_at, retired_at) for access tokens. The cookie holds a random token; only its SHA-256 hash is stored. Cognito tokens are not stored. `identity.service_clients` (id, secret_hash unique, scopes, act_scopes, created_at, rotated_at, revoked_at): registered services and apps, added only by migrations.

### MVP1-E1-04 · Forgot and reset password — S
- **AC1:** Given I choose "Forgot password", when I enter my email, then Cognito sends a reset code. The page says the same thing whether or not the account exists.
- **AC2:** Given a valid code and a new password that meets the policy, then I can sign in with the new password, and my old app sessions are invalidated.
- **Service:** Identity
- **API design:** No endpoint of ours: Cognito managed login hosts the forgot-password screens. On the next `GET /api/identity/v1/auth/callback`, sessions created before the token's `auth_time` are revoked.
- **Database design:** No schema change; sets `identity.sessions.revoked_at`.

### MVP1-E1-05 · Account page — M
As a user, I want to see and manage my account.
- **AC1:** `/account` shows my email, when I joined, how many documents I've processed and my orders.
- **AC2:** "Change password" goes through Cognito's flow, and I come back to `/account` with a success message.
- **AC3:** "Delete account" requires typing `DELETE`. It then deletes the Cognito user, my S3 objects and my database rows (orders are kept, anonymized, for records) and signs me out. `auth.account_deleted` is audited.
- **Service:** Identity; the account page is composed by the DocFlow app
- **API design:**
  - `GET /api/identity/v1/me` (signed in) — My account: email and joined date. → `200 {id, email, created_at}`.
  - `POST /api/identity/v1/me/password-change` (signed in) — Start a password change through the identity provider. → `200 {redirect_url}`; the provider returns the user to `/account?password_changed=1`. Session only.
  - `DELETE /api/identity/v1/me` (signed in) — Delete my account. Every service then deletes that user's data. Body `{confirm: "DELETE"}` → `202`, session cleared. Emits `identity.user.deleted`; each service deletes or anonymizes its own rows. Session only. Errors: `422`.
  - `GET /api/docflow/v1/stats` (signed in) — My DocFlow totals for the account page. → `200 {documents_processed}`.
  - The account page is composed by the app: it reads `GET /api/identity/v1/me`, `GET /api/docflow/v1/stats` and `GET /api/payment/v1/orders`.
- **Database design:** No new tables. Identity deletes the user's rows and emits `identity.user.deleted`; each service deletes its rows for that `owner_id`. Payment keeps orders with `owner_id` set to null.

### MVP1-E1-06 · Route protection — S
- **AC1:** Middleware redirects signed-out users from `/documents`, `/review`, `/pay`, `/success` and `/account` to sign-in, and returns them to the page they asked for afterwards.
- **AC2:** The gateway returns 401 without a valid session or API key. Each service verifies the access token itself and returns 404 (not 403) for other users' resources, so IDs can't be probed.
- **Service:** Gateway and service template
- **API design:** No new endpoints. The gateway turns a session cookie or API key into an access token (`POST /api/identity/v1/token`) and forwards it. Every service verifies the token itself against `GET /api/identity/v1/jwks`, returns `401` without one and `404` for other users' resources.
- **Database design:** No schema change. Every query on a user-owned table filters by `owner_id` in the data-access layer, not in the route.

### MVP1-E1-07 · Branded sign-in page and address — S
**Status: pending.** Not needed for the first working login; build after `MVP1-E1-03`.
As a visitor, I want the sign-in page to look like 01scale and live on a 01scale address, so I trust it with my password.
- **AC1:** The Cognito managed login pages show the 01scale name, logo and brand blue `#0b00bf`, in light and dark mode, on phone and desktop.
- **AC2:** The sign-in page is served from `https://auth.01scale.com` with a valid certificate (AWS Certificate Manager in `us-east-1`, plus the DNS records for 01scale.com). The `amazoncognito.com` address is no longer shown to users.
- **AC3:** Verification and password-reset emails come from a 01scale sender address through Amazon SES, with 01scale wording, and pass SPF and DKIM. The 50-emails-a-day limit of the default sender no longer applies.
- **AC4:** The change is configuration only: `COGNITO_DOMAIN` is updated and no Identity code or API contract changes. Sign-in, sign-out and password reset are re-tested end to end.
- **AC5:** `docs/infra/cognito.md` is updated with the steps so the setup can be rebuilt.
- **Service:** Identity
- **API design:** No new endpoints and no contract change. The `Location` returned by `GET /api/identity/v1/auth/login` and the `logout_url` from `POST /api/identity/v1/auth/logout` now point at `auth.01scale.com`.
- **Database design:** No schema change.

### MVP1-E1-08 · Sign in with Google — M
**Status: pending.** Not in the first version of login; build after `MVP1-E1-03`.
As a user, I want to sign in with my Google account so I don't need another password.
- **AC1:** The sign-in page shows "Continue with Google". Choosing it signs me in through Google and returns me to the page I asked for.
- **AC2:** Google is added as an identity provider on the Cognito user pool, using an OAuth client from a Google Cloud project with the scopes `openid`, `email` and `profile`. Google's client secret is stored only in AWS.
- **AC3:** One person is one user: when Google reports a verified email that matches an existing 01scale user, I am signed in to that same user and keep my documents. An unverified Google email is refused.
- **AC4:** A first-time Google user gets a new 01scale user without a separate email verification step, because Google has already verified the email.
- **AC5:** `auth.signup` and `auth.signin` audit events record `provider: google`.
- **AC6:** No other service or app changes: sessions, access tokens and `GET /session` are identical whichever way the user signed in.
- **AC7:** The Google Cloud and Cognito steps are added to `docs/infra/cognito.md`.
- **Service:** Identity
- **API design:**
  - `GET /api/identity/v1/auth/login` (public) — gains an optional query parameter `provider=google`, which sends the browser straight to Google instead of showing the sign-in page first. Any other value returns `422 invalid_provider`. Omitted means the sign-in page, as today.
  - `GET /api/identity/v1/auth/callback` is unchanged for callers. Internally it now accepts ID tokens for federated users and applies the linking rule in AC3.
- **Database design:** `identity.user_logins` (id, user_id → users on delete cascade, provider `cognito|google`, subject, created_at; unique (`provider`, `subject`)). Cognito gives a federated user a different ID from the same person's password account, so one user can now have several logins. Sign-in looks up `user_logins` by provider and subject; if none matches, it links by verified email or creates a user. `identity.users.cognito_sub` is migrated into `user_logins` and dropped.

---

## E2 · Document upload to S3 (MVP1 "b")
**Goal:** files go from the browser straight to a private S3 bucket, safely.

### MVP1-E2-01 · S3 bucket and IAM — S
- **AC1:** The bucket has Block Public Access on, encryption on (SSE-S3), versioning off and a lifecycle rule that deletes objects after 30 days.
- **AC2:** CORS allows PUT and GET only from `https://01scale.com` and localhost.
- **AC3:** The app's IAM credentials allow only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` and `s3:HeadObject` on this bucket, documented in `docs/infra/s3.md`.
- **Service:** Upload
- **API design:** No endpoints; infrastructure only.
- **Database design:** No schema change.

### MVP1-E2-02 · Presigned upload URL — M
- **AC1:** `POST /api/upload/v1/files` with `{file_name, mime, size}` returns a presigned PUT URL valid for 5 minutes, with key `users/{userId}/{fileId}/original.{ext}`.
- **AC2:** Requests for file types other than PDF/PNG/JPG, or over 10 MB, are rejected with a clear message before any URL is issued.
- **AC3:** A file record is created with status `pending_upload`.
- **Service:** Upload; composed by the DocFlow app
- **API design:**
  - `POST /api/upload/v1/files` (signed in) — Create a file record and get a presigned upload URL. Body `{file_name, mime, size, accept?: {mimes[], max_bytes, max_pages}}` → `201 {file, upload: {url, method: "PUT", headers, expires_at}}`. Supports `Idempotency-Key`. Errors: `415` wrong type, `413` too large, `422`.
  - `GET /api/upload/v1/files/{fileId}` (signed in) — Get one file's details and status. → `200 {file: {id, file_name, mime, size_bytes, pages, status}}`. Errors: `404` (also for other users' files).
  - `DELETE /api/upload/v1/files/{fileId}` (signed in) — Delete a file and its stored object. → `204`.
  - `POST /api/docflow/v1/documents` (signed in) — Start the DocFlow process for one invoice: creates the document and its upload. Body `{file_name, mime, size}` → `201 {document, upload}`. Calls Upload `POST /files` with DocFlow's limits (PDF/PNG/JPG, 10 MB, 10 pages). Supports `Idempotency-Key`.
- **Database design:** `upload.files` (id, owner_id, s3_key, file_name, mime, size_bytes, pages, accept jsonb, status `pending_upload|ready|rejected|deleted`, rejection_reason, created_at). DocFlow: inserts `docflow.documents` with `file_id`.

### MVP1-E2-03 · Upload confirmation and checks — S
- **AC1:** `POST /api/upload/v1/files/{fileId}/complete` confirms the object exists (HeadObject) and its size matches.
- **AC2:** The file's first bytes are checked to confirm the real type. A mismatch, or a PDF over 10 pages, marks the file `rejected` and deletes the object.
- **AC3:** If it passes, the file's status becomes `ready` and `file.uploaded` is audited. In DocFlow, the app then queues extraction (E3).
- **Service:** Upload; composed by the DocFlow app
- **API design:**
  - `POST /api/upload/v1/files/{fileId}/complete` (signed in) — Confirm the upload; the service verifies the stored file. → `200 {file}` with status `ready` or `rejected` (+ `rejection_reason`). Idempotent. Errors: `404`, `409` if the object is missing or the size differs.
  - `GET /api/upload/v1/files/{fileId}/download-url` (signed in) — A short-lived link to read the file. Query `filename?`, `disposition=inline|attachment` → `200 {url, expires_at}` (presigned GET, 5 minutes).
  - `POST /api/docflow/v1/documents/{documentId}/upload-complete` (signed in) — Confirm the upload and start extraction. → `200 {document}`. Calls Upload `complete`, then Extraction `POST /jobs`. Idempotent. Errors: `409` if the file was rejected.
- **Database design:** No new tables; sets `upload.files.status`, `pages`, `rejection_reason` and `docflow.documents.status`, `job_id`.

### MVP1-E2-04 · Upload page UI — M
As Priya, I want to drag and drop or pick a file on my phone and see progress.
- **AC1:** Drag and drop on desktop and the file picker on mobile both work, including the camera option on phones.
- **AC2:** A progress bar shows upload percentage. On failure I see a retry button and a plain-language error.
- **AC3:** After upload, I'm taken to the document's extraction page automatically.
- **Service:** Upload (UI component), used by the DocFlow app
- **API design:** No new endpoints. The Upload UI component calls `POST /files`, PUTs the file to S3 and calls `complete`. Inside DocFlow it is pointed at DocFlow's `POST /documents` and `upload-complete` instead.
- **Database design:** No schema change.

### MVP1-E2-05 · Documents list — S
- **AC1:** `/documents` lists my documents with name, date, status chip (Uploaded / Extracting / Needs review / Ready to pay / Paid) and a link to the next action.
- **AC2:** Empty state: "Upload your first invoice", with a sample invoice a hiring manager can use.
- **Service:** DocFlow app, plus Upload
- **API design:**
  - `GET /api/upload/v1/files` (signed in) — List my files. Query `status`, `cursor`, `limit` → `200 {data: [File], next_cursor}`.
  - `GET /api/docflow/v1/documents` (signed in) — List my DocFlow documents with status and the next action. Query `status`, `cursor`, `limit` → `200 {data: [Document], next_cursor}`. `Document = {id, file_name, status, next_action: extract|review|results|pay|download, file_id, job_id?, review_task_id?, order_id?}`.
  - `GET /api/docflow/v1/documents/{documentId}` (signed in) — Get one DocFlow document and the IDs of its parts in each service. → `200 {document}`. Errors: `404`.
- **Database design:** No schema change; indexes `docflow.documents(owner_id, created_at desc)` and `upload.files(owner_id, created_at desc)` for cursor pagination.

---

## E3 · Extraction with Claude (MVP1 "c") — `llm`
**Goal:** accurate structured data, with confidence and evidence for every field.

### MVP1-E3-01 · Extraction job lifecycle — M
- **AC1:** A job moves through `queued → processing → extracted | failed`. Each change is stored and visible through `GET /api/extraction/v1/jobs/{jobId}`.
- **AC2:** Temporary failures (rate limit, timeout, overload) retry up to 2 times with backoff; after that the job is `failed` with a user-friendly message and a "Retry" button.
- **AC3:** Jobs are idempotent: calling extract twice for the same document doesn't create two jobs or bill twice.
- **Service:** LLM Extraction; composed by the DocFlow app
- **API design:**
  - `POST /api/extraction/v1/jobs` (signed in) — Start an extraction job for a file. Safe to call twice. Body `{file_id, schema: "invoice-v1", reference?}` → `202 {job}`; returns the existing job if one is active for that file and schema. Emits `extraction.job.completed|failed`. Errors: `404` unknown file, `422` unknown schema.
  - `GET /api/extraction/v1/jobs/{jobId}` (signed in) — Extraction job status, for polling. → `200 {job: {id, status: queued|processing|extracted|failed, steps[], error_message?, retryable}}`. Sends `Retry-After: 2` while running.
  - `POST /api/docflow/v1/documents/{documentId}/retry-extraction` (signed in) — Retry a failed extraction for a document. → `202 {document}`. Errors: `409` unless the last job failed.
- **Database design:** `extraction.jobs` (id, owner_id, file_id, schema, reference, status `queued|processing|extracted|failed`, attempt, error_code, error_message, started_at, finished_at, created_at). Partial unique index on `(file_id, schema)` where status in (`queued`, `processing`) makes a second active job impossible.

### MVP1-E3-02 · Claude extraction call — L
- **AC1:** The document (PDF or image) is sent to Claude as a document or image input along with the versioned prompt `prompts/extract-invoice/v1.md`.
- **AC2:** The output is forced into the invoice v1 schema (PRD §9) with a tool/JSON schema. Every field includes `value`, `confidence`, `source_page` and `source_quote`.
- **AC3:** The model ID and prompt version are read from configuration and saved on the job.
- **AC4:** The response is validated with zod. A schema failure triggers one repair attempt and then fails the job; invalid JSON is never stored.
- **Evals:** EXT-1 schema validity, EXT-2 header field accuracy, EXT-3 line item F1, EXT-4 hallucination rate, EXT-7 latency, EXT-8 cost (see `EVALS.md`).
- **Service:** LLM Extraction
- **API design:**
  - `GET /api/extraction/v1/jobs/{jobId}/fields` (signed in) — The extracted fields with value, confidence and evidence. Query `flagged=true` → `200 {data: [Field]}`; `Field = {id, name, line_index?, value, confidence, model_confidence, source_page, source_quote, flagged, flag_reasons[]}`.
  - Extraction itself has no endpoint: it runs inside the job started in E3-01. The job reads the file through Upload `GET /files/{fileId}/download-url`, forwarding the user's access token.
- **Database design:** `extraction.jobs` adds model, prompt_version. `extraction.fields` (id, job_id → jobs, name, line_index null, value jsonb, model_confidence numeric(3,2), source_page, source_quote, created_at); unique `(job_id, name, line_index)`. These rows are the model's output and are never edited; human changes live in Review.

### MVP1-E3-03 · Rule checks and final confidence — M
- **AC1:** The arithmetic, date, currency, required-field and source-quote checks (PRD §10) run on every extraction.
- **AC2:** Final confidence = the lower of model confidence and rule result (a failed check sets 0.3). Fields under the threshold (default 0.85) or failing a check are marked `flagged`.
- **AC3:** Each flagged field stores the reason ("Total ≠ subtotal + tax", "Quote not found in document").
- **AC4:** Unit tests cover every rule check, including rounding and missing-tax cases.
- **Evals:** EXT-5 routing recall, EXT-6 flag rate.
- **Service:** LLM Extraction
- **API design:**
  - `POST /api/extraction/v1/validations` (signed in) — Run the rule checks for a schema on a set of values. Body `{schema, values, file_id?}` → `200 {passed, checks: [{name, passed, fields[], message}]}`. Used after extraction and again on corrected data.
- **Database design:** `extraction.fields` adds confidence numeric(3,2), flagged boolean, flag_reasons text[]. Index `extraction.fields(job_id) where flagged`.

### MVP1-E3-04 · Extraction page — M
- **AC1:** While processing, the page shows status steps and polls every 2 seconds, without a full-page reload.
- **AC2:** When done, the document preview (rendered PDF page or image) is on the left and the fields on the right, with confidence badges (green ≥ 0.85, amber 0.6–0.85, red < 0.6) and flagged fields highlighted.
- **AC3:** Tapping a field shows its source quote and page. On desktop, the preview jumps to that page.
- **AC4:** A "Review N flagged fields" button goes to E4. If nothing is flagged, "Continue to results" goes to E5.
- **Service:** LLM Extraction (UI component), used by the DocFlow app
- **API design:** No new endpoints. The component polls `GET /jobs/{jobId}`, reads `GET /jobs/{jobId}/fields`, and shows the file through Upload `download-url`.
- **Database design:** No schema change.

### MVP1-E3-05 · Cost and latency logging — S
- **AC1:** Each job stores tokens in and out, estimated cost in USD and duration.
- **AC2:** An admin-only page `/admin/jobs` shows the last 100 jobs with these numbers and the failure rate.
- **Service:** LLM Extraction
- **API design:**
  - `GET /api/extraction/v1/admin/jobs` (admin) — Last 100 jobs with tokens, cost, duration and failure rate. → `200 {data: [Job], summary: {failure_rate, avg_cost_usd, p95_duration_ms}}`. Errors: `404` for non-admins.
- **Database design:** `extraction.jobs` adds tokens_in, tokens_out, cost_usd numeric(10,6), duration_ms.

---

## E4 · Human review of low-confidence fields (MVP1 "d")
**Goal:** a person checks only what the system is unsure about, quickly, with evidence beside each field.

### MVP1-E4-01 · Review queue — M
- **AC1:** `/documents/{id}/review` lists flagged fields first, ordered by lowest confidence, each with its reason, current value and source quote.
- **AC2:** A counter shows "N of M resolved". Unflagged fields are available under "Show all fields".
- **Service:** Human Review
- **API design:**
  - `POST /api/review/v1/tasks` (signed in) — Create a review task from a set of fields. Body `{reference, fields: [{name, line_index?, value, confidence, source_page, source_quote, flagged, flag_reasons[]}]}` → `201 {task}`. Supports `Idempotency-Key`.
  - `GET /api/review/v1/tasks/{taskId}` (signed in) — The review queue: flagged fields first, lowest confidence first. Query `all=true` → `200 {task: {id, status, resolved, total, can_complete}, fields: [Field]}`.
- **Database design:** `review.tasks` (id, owner_id, reference, status `open|completed`, checks_overridden boolean, completed_at, completed_by, created_at). `review.fields` (id, task_id → tasks, kind `extracted`, name, line_index null, original_value jsonb, value jsonb, confidence, source_page, source_quote, flagged, flag_reasons text[], status `pending|accepted|edited|not_present`, updated_by, updated_at). Review holds its own copy of the fields, so it never reads Extraction's tables.

### MVP1-E4-02 · Accept, edit or mark not present — M
- **AC1:** Per field, I can accept, edit (with input checks: dates, numbers, currency code) or mark "Not on document".
- **AC2:** Every change stores the original value, the new value, who changed it and when, and audits `review.field_updated`.
- **AC3:** On desktop: Enter accepts, E edits, ↓ moves to the next field. On mobile: large tap targets.
- **Service:** Human Review
- **API design:**
  - `PATCH /api/review/v1/tasks/{taskId}/fields/{fieldId}` (signed in) — Accept, edit or mark a field as not on the document. Body `{action: accept|edit|not_present, value?}` → `200 {field}`. Errors: `422` invalid date, number or currency; `409` if the task is locked.
- **Database design:** `review.field_changes` (id, field_id → fields, old_value jsonb, new_value jsonb, action, source `review|chat`, changed_by, created_at) keeps the full history so any change can be traced or undone.

### MVP1-E4-03 · Complete review — S
- **AC1:** "Complete review" stays disabled until every flagged field is resolved.
- **AC2:** On completion, the rule checks run again on the corrected data. If any still fail, I see which ones and can either fix them or confirm "Values are correct as on the document".
- **AC3:** The document status becomes `reviewed`, and I'm taken to results (E5).
- **Service:** Human Review; composed by the DocFlow app
- **API design:**
  - `POST /api/review/v1/tasks/{taskId}/complete` (signed in) — Complete the task once every flagged field is resolved. Body `{checks_overridden?: boolean}` → `200 {task, final_values}`. Emits `review.task.completed`. Errors: `409` with `unresolved_fields[]`.
  - `POST /api/docflow/v1/documents/{documentId}/complete-review` (signed in) — Finish review for a document: re-checks the corrected data and builds the outputs. Body `{confirm_failed_checks?: boolean}` → `200 {document}`. Calls Extraction `POST /validations`, then Review `complete`. Errors: `409` with `unresolved_fields[]` or `failed_checks[]`.
- **Database design:** Sets `review.tasks.status`, `completed_at`, `completed_by`, `checks_overridden` and `docflow.documents.status`.

### MVP1-E4-04 · Corrections feed the eval set — S
- **AC1:** Each human correction is saved as a candidate eval case (document reference, field, model value, human value) in `eval_candidates`.
- **AC2:** An admin export produces new ground-truth files for `evals/datasets/` after manual approval. Customer documents are never added automatically.
- **Service:** Human Review
- **API design:**
  - `GET /api/review/v1/admin/eval-candidates` (admin) — Human corrections waiting for approval as eval cases. Query `status`, `cursor` → `200 {data: [EvalCandidate], next_cursor}`.
  - `POST /api/review/v1/admin/eval-candidates/export` (admin) — Export approved corrections as ground-truth files. Body `{candidate_ids[]}` → `200 {files: [{name, url}]}`. Only candidates with status `approved` are exported.
- **Database design:** `review.eval_candidates` (id, task_id, reference, field_name, model_value jsonb, human_value jsonb, status `candidate|approved|rejected|exported`, created_at).

---

## E5 · JSON review, metadata and CSV (MVP1 "e")
**Goal:** clean, trustworthy outputs the user can preview before paying.

### MVP1-E5-01 · Final JSON with metadata — M
- **AC1:** The JSON has `data` (the invoice v1 schema with final values) and `metadata`: `document_id`, `file_name`, `pages`, `model`, `prompt_version`, `extracted_at`, `reviewed_at`, `reviewed_by`, `fields_flagged`, `fields_corrected`, and per-field `confidence` and `corrected` flags.
- **AC2:** The output is validated against a published JSON Schema in `schemas/invoice-v1.json`.
- **AC3:** The JSON preview has syntax highlighting and folding, and works on mobile.
- **Service:** DocFlow app
- **API design:**
  - `GET /api/docflow/v1/documents/{documentId}/outputs` (signed in) — The outputs available for a document, and whether download is unlocked. → `200 {version, locked, formats: ["json", "csv"], generated_at}`.
  - `GET /api/docflow/v1/documents/{documentId}/outputs/{format}/preview` (signed in) — Preview the JSON or CSV on screen before paying. `format = json|csv` → `200` with `application/json` (`{data, metadata}`) or `text/csv`, sent `Content-Disposition: inline`.
- **Database design:** No new tables; the JSON is built from the review task's final values and the job's metadata, both read through their APIs.

### MVP1-E5-02 · CSV export — S
- **AC1:** One row per line item, with invoice-level columns repeated on each row; the header order is documented.
- **AC2:** Quoting follows RFC 4180, with UTF-8 encoding and a BOM so Excel opens it correctly.
- **AC3:** Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` (CSV injection protection), with a unit test.
- **AC4:** An invoice with no line items gives one row with empty line columns.
- **Service:** DocFlow app
- **API design:** Served by `GET …/outputs/csv/preview` and `…/download` (E5-01, E5-03).
- **Database design:** No schema change.

### MVP1-E5-03 · Locked preview — S
- **AC1:** Before payment, I can see a full preview of both outputs on screen, but download buttons show "Pay to download".
- **AC2:** The download endpoints return 402 until the order is paid, enforced on the server.
- **Service:** DocFlow app
- **API design:**
  - `GET /api/docflow/v1/documents/{documentId}/outputs/{format}/download` (signed in) — Download an output. Locked until the order is paid. → `302` to an Upload `download-url` (5 minutes, correct filename). Errors: `402` until the Payment order is `paid`, `404`.
- **Database design:** No schema change; entitlement = the Payment order referenced by `docflow.documents.order_id` has status `paid`.

### MVP1-E5-04 · Store outputs — S
- **AC1:** On review completion, `result.json` and `result.csv` are written to `users/{userId}/{docId}/outputs/`.
- **AC2:** If the user later edits fields, the outputs are regenerated and the version increments.
- **Service:** DocFlow app (files stored through Upload)
- **API design:** No new endpoints. DocFlow builds the files and stores them through Upload `POST /files` with a service token; `version` in `GET …/outputs` increments when they are regenerated.
- **Database design:** `docflow.outputs` (id, document_id → documents, version, json_file_id, csv_file_id, created_at); unique `(document_id, version)`. The files themselves are `upload.files` rows owned by the user.

---

## E6 · Payment (MVP1 "f")
**Goal:** a reliable, secure one-time payment per document.

### MVP1-E6-01 · Checkout session — M
- **AC1:** "Pay $5.00" creates a Stripe Checkout session in test mode with `metadata.order_id`, and success/cancel URLs back to the app.
- **AC2:** An `orders` row is created with status `pending`. Clicking twice reuses the open session instead of creating a duplicate order.
- **AC3:** A banner says "Test mode — use card 4242 4242 4242 4242, any future date, any CVC".
- **Service:** Payment; composed by the DocFlow app
- **API design:**
  - `POST /api/payment/v1/orders` (service) — Create an order and a Stripe Checkout session. Called by an app's server, never the browser. Body `{user_id, reference, description, amount, currency, success_url, cancel_url}` → `201 {order, checkout_url}`; `200` with the open order for the same `reference`. Emits `payment.order.paid|expired|failed`.
  - `POST /api/docflow/v1/documents/{documentId}/checkout` (signed in) — Start payment for a document. → `201 {order_id, checkout_url}`. DocFlow sets the price and calls Payment `POST /orders`. Errors: `409` if already paid or not reviewed.
- **Database design:** `payment.orders` (id, owner_id null, app, reference, description, stripe_session_id unique, amount, currency, status `pending|paid|expired|failed`, paid_at, created_at). Partial unique index on `(app, reference)` where status = `pending` prevents duplicate open orders. DocFlow stores the returned ID in `docflow.documents.order_id`.

### MVP1-E6-02 · Webhook — M
- **AC1:** `POST /api/payment/v1/webhooks/stripe` verifies the Stripe signature and rejects invalid ones with 400.
- **AC2:** On `checkout.session.completed`, the order becomes `paid`, and `order.paid` is audited.
- **AC3:** The handler is idempotent: an event ID already processed returns 200 without changing anything again.
- **AC4:** Also handles `checkout.session.expired` (order becomes `expired`) and async payment failure (order becomes `failed`).
- **Service:** Payment
- **API design:**
  - `POST /api/payment/v1/webhooks/stripe` (service) — Stripe webhook: marks orders paid, expired or failed. Verifies `Stripe-Signature` → `200`. Already-processed event IDs return `200` with no change. Errors: `400` bad signature.
- **Database design:** `payment.stripe_events` (event_id primary key, type, processed_at) gives idempotency: insert first, skip if it already exists.

### MVP1-E6-03 · Payment page and states — S
- **AC1:** `/documents/{id}/pay` shows an order summary: document name, number of fields, price.
- **AC2:** Cancel returns here with "Payment cancelled — you haven't been charged" and a retry button.
- **AC3:** A document that's already paid skips straight to success (E7).
- **Service:** Payment (UI component), used by the DocFlow app
- **API design:**
  - `GET /api/payment/v1/orders` (signed in) — List my orders. Query `reference`, `status`, `cursor` → `200 {data: [Order], next_cursor}`.
  - `GET /api/payment/v1/orders/{orderId}` (signed in) — Get one order, for payment and success pages to poll. → `200 {order: {id, reference, description, amount, currency, status: pending|paid|expired|failed}}`.
  - The page also calls DocFlow `POST …/checkout` (E6-01).
- **Database design:** No schema change.

---

## E7 · Success, download and email (MVP1 "g")
**Goal:** the user gets their files immediately and has a record by email.

### MVP1-E7-01 · Success page — M
- **AC1:** On return from Stripe, the page polls the order status (up to 30 seconds) and shows "Confirming payment…" until the webhook marks it paid.
- **AC2:** Once paid, the "Download JSON" and "Download CSV" buttons work.
- **AC3:** If confirmation takes over 30 seconds, it says "We'll email you when it's ready", and the email still arrives.
- **Service:** DocFlow app
- **API design:** No new endpoints. The page polls `GET /api/payment/v1/orders/{orderId}` and then uses the DocFlow download endpoints.
- **Database design:** No schema change.

### MVP1-E7-02 · Secure downloads — S
- **AC1:** Each download checks on the server that the user owns the document and the order is paid, then redirects to a presigned GET URL valid for 5 minutes, with the right filename.
- **AC2:** `delivery.downloaded` is audited.
- **Service:** DocFlow app (links from Upload)
- **API design:** Uses DocFlow `GET …/outputs/{format}/download` (E5-03), which checks the Payment order and redirects to an Upload `download-url`.
- **Database design:** No schema change.

### MVP1-E7-03 · Email delivery — M
- **AC1:** When the order is paid (triggered by the webhook, not the browser), an email is sent via Resend within 60 seconds. It contains the document name, amount paid and a link to `/documents/{id}/success`, not a raw S3 link.
- **AC2:** A send failure retries 3 times with backoff and records the message's status. A permanent failure shows "Email couldn't be sent" on the success page.
- **AC3:** The email passes SPF/DKIM for the sending domain (Resend domain verification for 01scale.com), with plain-text and HTML versions.
- **Service:** Delivery; triggered by the DocFlow app
- **API design:**
  - `POST /api/delivery/v1/messages` (service) — Send a templated email to a user. Called by an app's server. Body `{user_id, template, data, reference}` + `Idempotency-Key` → `202 {message}`. Retries 3 times with backoff. Emits `delivery.message.failed` on permanent failure.
  - `GET /api/delivery/v1/messages` (signed in) — My messages and their delivery status. Query `reference`, `cursor` → `200 {data: [{id, channel, template, status: queued|sent|failed, attempts, sent_at}], next_cursor}`.
  - DocFlow calls `POST /messages` when it receives `payment.order.paid` on its webhook (E0-09), so the email is triggered by the server, not the browser.
- **Database design:** `delivery.messages` (id, owner_id, app, reference, channel `email`, template, status `queued|sent|failed`, attempts, provider_message_id, last_error, sent_at, created_at). The recipient address is read from Identity at send time, not stored.

---

## Definition of done for MVP1
- All stories pass their AC; E3 and E4 evals meet `EVALS.md` MVP1 thresholds on the holdout set.
- The demo script in PRD §15 runs end to end on a phone in under 3 minutes.
- README roadmap updated, release `mvp1` tagged, demo clip on the 01scale.com card.
