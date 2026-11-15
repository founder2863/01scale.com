# MVP1 — Epics and issues

Source: `docs/prd/MVP1-PRD.md`. Evals: `docs/evals/EVALS.md`.
Each story becomes one GitHub issue: `[ID] Title`. Size: S ≈ half a day, M ≈ 1–2 days, L ≈ 3+ days.
Acceptance criteria (AC) use Given / When / Then. A story is done when all its AC pass, tests exist for its logic, and its evals (if any) meet thresholds.

**API first, agents first.** Every story carries an **API design** (endpoints, request, response, errors) and a **Database design** (tables, columns, constraints). They are the contract for the story: review them before code is written, and change the story first if the design needs to change. Shared rules are in `docs/architecture/API-DESIGN.md` and `docs/architecture/DATABASE-DESIGN.md`. Pages are clients of the API; nothing here is built until its story is picked up.

---

## E0 · Foundation
**Goal:** the plumbing every later epic relies on.

### MVP1-E0-01 · Database and migrations — S
As a developer, I want Neon Postgres with Drizzle migrations so the schema evolves safely.
- **AC1:** Given `DATABASE_URL` is set, when the app deploys on Vercel, then pending migrations run before the new version serves traffic.
- **AC2:** Given a test run, when tests use the database, then they run against PGlite with the same migrations and need no network.
- **AC3:** The initial migration creates `users`, `documents`, `extraction_jobs`, `fields`, `orders`, `deliveries` and `audit_events` as in PRD §11.
- **API design:** No endpoints.
- **Database design:** Conventions for every table: `id uuid` primary key (UUIDv7, so IDs sort by time), `created_at timestamptz default now()`, snake_case names, status columns as `text` with a `CHECK` list, money as integer minor units + ISO currency, foreign keys `ON DELETE CASCADE` from `users` except `orders`. Initial tables as in PRD §11. Indexes: `documents(user_id, created_at desc)`, `extraction_jobs(document_id)`, `fields(job_id)`, `orders(user_id)`, `orders(document_id)`, `audit_events(actor_id, created_at desc)`.

### MVP1-E0-02 · Audit log — S
As the owner, I want every important event recorded so I can trace what happened.
- **AC1:** A single `audit(actorId, action, target, metadata)` helper writes to `audit_events`.
- **AC2:** The metadata is checked against an allow-list: document contents, tokens and full card or phone numbers are rejected by a unit test.
- **AC3:** Actions are a fixed list (`auth.*`, `document.*`, `review.*`, `order.*`, `delivery.*`).
- **API design:**
  - `GET /api/v1/audit-events` (signed in) — List audit events for the signed-in user (admins: all users). Query `action`, `cursor`, `limit` → `200 {data: [AuditEvent], next_cursor}`.
- **Database design:** `audit_events` (id, actor_id → users null, actor_type `user|api_key|system`, action, target_type, target_id, metadata jsonb, request_id, created_at). Append-only: the app role has no `UPDATE` or `DELETE` grant on this table.

### MVP1-E0-03 · CI — S
- **AC1:** On every PR, lint, typecheck and unit tests run in GitHub Actions, and the PR can't merge if they fail.
- **AC2:** Given a PR with the label `evals`, the eval workflow runs and posts its summary as a PR comment.
- **API design:** No endpoints. CI also checks that the committed OpenAPI file matches the one generated from code (E0-05).
- **Database design:** No schema change. CI runs migrations against PGlite to prove they apply from empty.

### MVP1-E0-04 · Eval harness skeleton — M
As the owner, I want `npm run eval` so the quality of LLM output is measured, not guessed.
- **AC1:** `npm run eval -- --set dev` runs every case in `evals/datasets/invoices/dev`, compares the output with ground truth and writes `evals/reports/<date>-<prompt-version>.md`.
- **AC2:** The report shows each metric from `EVALS.md` §MVP1 with pass/fail against its threshold, plus cost and latency.
- **AC3:** The command exits non-zero if any MVP1 threshold fails, or if a metric drops more than 2 points from the saved baseline.
- **AC4:** With `--record`, model responses are saved as fixtures, so later runs can use `--replay` without API calls.
- **API design:** No endpoints; the eval harness is a CLI.
- **Database design:** No schema change; datasets and reports are files in `evals/`.

### MVP1-E0-05 · API foundation — M
As a developer or an AI agent, I want one consistent, documented API so every feature can be used without the website.
- **AC1:** Every endpoint lives under `/api/v1`, takes and returns JSON, and is described in an OpenAPI 3.1 document served at `GET /api/v1/openapi.json`. The document is generated from the zod schemas the handlers validate with, and a CI check fails if the committed copy is out of date.
- **AC2:** Errors use one shape, RFC 9457 `application/problem+json`: `{type, title, status, detail, code, request_id, errors[]}`. `code` is a stable machine-readable string.
- **AC3:** List endpoints use cursor pagination (`cursor`, `limit` ≤ 100 → `{data, next_cursor}`).
- **AC4:** `POST` endpoints that create things accept an `Idempotency-Key` header; a repeat with the same key and body returns the first response, and a repeat with a different body returns `422`.
- **AC5:** Pages never read the database directly. Server components and browser code call the same service functions that back the API, and every user-visible capability has an endpoint.
- **AC6:** Every response carries `X-Request-Id`, and rate-limited responses carry `Retry-After`.
- **API design:**
  - `GET /api/v1/health` (public) — Liveness check for uptime monitors and agents. → `200 {status: "ok", version}`.
  - `GET /api/v1/openapi.json` (public) — The OpenAPI 3.1 description of every endpoint. → `200` OpenAPI document, generated from the same zod schemas the handlers validate with.
- **Database design:** `idempotency_keys` (key, user_id, method, path, request_hash, response_status, response_body jsonb, created_at; primary key (user_id, key); rows expire after 24 hours).

### MVP1-E0-06 · Agent access: API keys and MCP server — M
As an AI agent acting for a user, I want to authenticate without a browser and discover what I can do.
- **AC1:** A signed-in user can create, list and revoke API keys on `/account/api-keys`. The secret (`sk_01s_…`) is shown once; only its hash is stored.
- **AC2:** `Authorization: Bearer <key>` is accepted wherever a session cookie is, limited to the key's scopes (`documents:read`, `documents:write`, `orders:read`, `orders:write`). Keys can never manage keys, change the password or delete the account.
- **AC3:** An MCP server at `POST /api/mcp` (Streamable HTTP) exposes the documented operations as tools with the same names, inputs and outputs as the OpenAPI document. A test fails if an operation tagged `agent` has no matching tool.
- **AC4:** Every API-key and MCP call is audited with `actor_type: api_key` and the key ID.
- **AC5:** Payment still needs a human: `POST /api/v1/orders` returns a `checkout_url` for the user to open; an agent cannot complete payment itself.
- **API design:**
  - `GET /api/v1/api-keys` (signed in) — List my API keys (name, prefix, scopes, last used). Never returns the secret. → `200 {data: [ApiKey]}`.
  - `POST /api/v1/api-keys` (signed in) — Create an API key for an agent or script. The secret is shown once. Body `{name, scopes[], expires_at?}` → `201 {api_key, secret}`. Session only: a key cannot create keys. Errors: `422`.
  - `DELETE /api/v1/api-keys/{keyId}` (signed in) — Revoke an API key immediately. → `204`. Errors: `404`.
  - `POST /api/mcp` (signed in) — MCP server (Streamable HTTP): the same operations exposed as tools for AI agents. Bearer API key. Tools map 1:1 to OpenAPI `operationId`s and call the same service functions as the REST handlers.
- **Database design:** `api_keys` (id, user_id → users, name, prefix, key_hash unique, scopes text[], last_used_at, expires_at, revoked_at, created_at). Only the SHA-256 hash of the secret is stored; `prefix` (first 8 characters) is kept for display.

---

## E1 · Accounts with AWS Cognito (MVP1 "a")
**Goal:** users can create and manage an account securely, through OIDC so the provider can be swapped in MVP2.

### MVP1-E1-01 · Cognito user pool setup — S
- **AC1:** The user pool uses email as the username, requires a verified email and has a password policy of at least 12 characters with a mix of character types.
- **AC2:** Managed login is enabled and branded with the 01scale name, using an app client with the authorization code flow + PKCE and callback/logout URLs for production and localhost.
- **AC3:** The configuration is documented in `docs/infra/cognito.md`, with screenshots or CLI commands, so it can be rebuilt.
- **API design:** No endpoints; infrastructure only.
- **Database design:** No schema change.

### MVP1-E1-02 · Sign up with email verification — M
As a new user, I want to sign up with my email and password so I can use DocFlow.
- **AC1:** Given I'm signed out, when I choose "Sign up", then I'm taken to Cognito managed login's sign-up screen.
- **AC2:** Given I submit a valid email and password, when Cognito sends a verification code and I enter it, then I land on `/documents` signed in.
- **AC3:** Given I haven't verified my email, then I can't reach any protected page.
- **AC4:** On the first sign-in, a `users` row is created with `cognito_sub` and email, and `auth.signup` is audited.
- **API design:**
  - `GET /api/v1/auth/login` (public) — Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE). Query `mode=signin|signup`, `return_to` (same-origin path only) → `302` to Cognito managed login. Stores `state`, `nonce` and PKCE verifier in a short-lived HttpOnly cookie.
  - Sign-up shares the callback in E1-03.
- **Database design:** `users` (id, cognito_sub unique, email unique (case-insensitive), email_verified_at, created_at). `is_admin boolean default false` is added here for E3-05.

### MVP1-E1-03 · Sign in and sign out — M
- **AC1:** Sign-in uses the OIDC authorization code flow with PKCE and `state`/`nonce` checks via `openid-client`; a mismatch is rejected.
- **AC2:** After sign-in, the app creates its own session cookie (HttpOnly, Secure, SameSite=Lax). Cognito tokens stay on the server and never reach browser JavaScript.
- **AC3:** Sign-out clears the app session and calls Cognito's logout endpoint, so the next sign-in shows the login form.
- **AC4:** `auth.signin` and `auth.signout` are audited.
- **API design:**
  - `GET /api/v1/auth/callback` (public) — OIDC redirect target: exchanges the code, creates the app session. Query `code`, `state` → `302` to `return_to` with the session cookie set. Errors: `400` on `state`/`nonce` mismatch or unverified email.
  - `POST /api/v1/auth/logout` (signed in) — End the current session and sign out of the identity provider. → `200 {logout_url}` (the client follows it to clear the provider session).
  - `GET /api/v1/session` (signed in) — Who am I: the current session and user, or 401. → `200 {user: {id, email}, session: {expires_at}, auth: "session"|"api_key", scopes[]}`. Errors: `401`.
- **Database design:** `sessions` (id, user_id → users, token_hash unique, created_at, expires_at, revoked_at). The cookie holds a random token; only its SHA-256 hash is stored. Cognito tokens are not stored. MVP2-E8-01 extends this table.

### MVP1-E1-04 · Forgot and reset password — S
- **AC1:** Given I choose "Forgot password", when I enter my email, then Cognito sends a reset code. The page says the same thing whether or not the account exists.
- **AC2:** Given a valid code and a new password that meets the policy, then I can sign in with the new password, and my old app sessions are invalidated.
- **API design:** No endpoint of ours: Cognito managed login hosts the forgot-password screens. On the next `GET /api/v1/auth/callback`, sessions created before the token's `auth_time` are revoked.
- **Database design:** No schema change; sets `sessions.revoked_at`.

### MVP1-E1-05 · Account page — M
As a user, I want to see and manage my account.
- **AC1:** `/account` shows my email, when I joined, how many documents I've processed and my orders.
- **AC2:** "Change password" goes through Cognito's flow, and I come back to `/account` with a success message.
- **AC3:** "Delete account" requires typing `DELETE`. It then deletes the Cognito user, my S3 objects and my database rows (orders are kept, anonymized, for records) and signs me out. `auth.account_deleted` is audited.
- **API design:**
  - `GET /api/v1/me` (signed in) — My account: email, joined date, documents processed. → `200 {id, email, created_at, documents_processed}`.
  - `POST /api/v1/me/password-change` (signed in) — Start a password change through the identity provider. → `200 {redirect_url}`; the provider returns the user to `/account?password_changed=1`. Session only.
  - `DELETE /api/v1/me` (signed in) — Delete my account, files and data (orders kept, anonymized). Body `{confirm: "DELETE"}` → `204`, session cleared. Session only. Errors: `422` if the confirmation text is wrong.
  - Orders on the page come from `GET /api/v1/orders` (E6-03).
- **Database design:** No new tables. On deletion: user rows cascade; `orders.user_id` is set to null and `orders.document_id` to null so the payment record stays without personal data.

### MVP1-E1-06 · Route protection — S
- **AC1:** Middleware redirects signed-out users from `/documents`, `/review`, `/pay`, `/success` and `/account` to sign-in, and returns them to the page they asked for afterwards.
- **AC2:** API routes return 401 without a valid session and 404 (not 403) for other users' resources, so IDs can't be probed.
- **API design:** No new endpoints. A shared `requireUser()` guard gives every `/api/v1` route `401` without credentials and `404` for other users' resources. Pages are protected by middleware; the API is protected by the guard.
- **Database design:** No schema change. Every query on a user-owned table filters by `user_id` in the data-access layer, not in the route.

---

## E2 · Document upload to S3 (MVP1 "b")
**Goal:** files go from the browser straight to a private S3 bucket, safely.

### MVP1-E2-01 · S3 bucket and IAM — S
- **AC1:** The bucket has Block Public Access on, encryption on (SSE-S3), versioning off and a lifecycle rule that deletes objects after 30 days.
- **AC2:** CORS allows PUT and GET only from `https://01scale.com` and localhost.
- **AC3:** The app's IAM credentials allow only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` and `s3:HeadObject` on this bucket, documented in `docs/infra/s3.md`.
- **API design:** No endpoints; infrastructure only.
- **Database design:** No schema change.

### MVP1-E2-02 · Presigned upload URL — M
- **AC1:** `POST /api/v1/documents` with `{file_name, mime, size}` returns a presigned PUT URL valid for 5 minutes, with key `users/{userId}/{docId}/original.{ext}`.
- **AC2:** Requests for file types other than PDF/PNG/JPG, or over 10 MB, are rejected with a clear message before any URL is issued.
- **AC3:** A `documents` row is created with status `pending_upload`.
- **API design:**
  - `POST /api/v1/documents` (signed in) — Create a document and get a presigned upload URL. Body `{file_name, mime, size}` → `201 {document, upload: {url, method: "PUT", headers, expires_at}}`. Supports `Idempotency-Key`. Errors: `415` wrong type, `413` over 10 MB, `422`.
- **Database design:** `documents` (id, user_id → users, s3_key, file_name, mime, size_bytes, pages, status `pending_upload|uploaded|rejected|extracting|needs_review|reviewed|paid`, rejection_reason, created_at).

### MVP1-E2-03 · Upload confirmation and checks — S
- **AC1:** `POST /api/v1/documents/{documentId}/complete-upload` confirms the object exists (HeadObject) and its size matches.
- **AC2:** The file's first bytes are checked to confirm the real type. A mismatch, or a PDF over 10 pages, marks the document `rejected` and deletes the object.
- **AC3:** If it passes, the status becomes `uploaded`, extraction is queued (E3) and `document.uploaded` is audited.
- **API design:**
  - `POST /api/v1/documents/{documentId}/complete-upload` (signed in) — Confirm the upload; the server verifies the file and queues extraction. → `200 {document}` with status `uploaded` or `rejected` (+ `rejection_reason`). Idempotent. Errors: `404`, `409` if the object is missing or the size differs.
- **Database design:** No new tables; sets `documents.status`, `pages`, `rejection_reason`.

### MVP1-E2-04 · Upload page UI — M
As Priya, I want to drag and drop or pick a file on my phone and see progress.
- **AC1:** Drag and drop on desktop and the file picker on mobile both work, including the camera option on phones.
- **AC2:** A progress bar shows upload percentage. On failure I see a retry button and a plain-language error.
- **AC3:** After upload, I'm taken to the document's extraction page automatically.
- **API design:** No new endpoints. The page calls `POST /api/v1/documents`, PUTs the file to S3, then calls `complete-upload`.
- **Database design:** No schema change.

### MVP1-E2-05 · Documents list — S
- **AC1:** `/documents` lists my documents with name, date, status chip (Uploaded / Extracting / Needs review / Ready to pay / Paid) and a link to the next action.
- **AC2:** Empty state: "Upload your first invoice", with a sample invoice a hiring manager can use.
- **API design:**
  - `GET /api/v1/documents` (signed in) — List my documents with status and the next action. Query `status`, `cursor`, `limit` → `200 {data: [Document], next_cursor}`. `Document.next_action` is one of `extract|review|results|pay|download`.
  - `GET /api/v1/documents/{documentId}` (signed in) — Get one document. → `200 {document}`. Errors: `404` (also for other users' documents).
- **Database design:** No schema change; uses index `documents(user_id, created_at desc)` for cursor pagination.

---

## E3 · Extraction with Claude (MVP1 "c") — `llm`
**Goal:** accurate structured data, with confidence and evidence for every field.

### MVP1-E3-01 · Extraction job lifecycle — M
- **AC1:** A job moves through `queued → processing → extracted | failed`. Each change is stored and visible through `GET /api/v1/documents/{documentId}/extraction`.
- **AC2:** Temporary failures (rate limit, timeout, overload) retry up to 2 times with backoff; after that the job is `failed` with a user-friendly message and a "Retry" button.
- **AC3:** Jobs are idempotent: calling extract twice for the same document doesn't create two jobs or bill twice.
- **API design:**
  - `POST /api/v1/documents/{documentId}/extraction` (signed in) — Start (or retry) extraction. Safe to call twice. → `202 {job}`; returns the existing job if one is queued or running. Errors: `404`, `409` if the document is not `uploaded` or `failed`.
  - `GET /api/v1/documents/{documentId}/extraction` (signed in) — Extraction job status, for polling. → `200 {job: {id, status: queued|processing|extracted|failed, steps[], error_message?, retryable}}`. Sends `Retry-After: 2` while running.
- **Database design:** `extraction_jobs` (id, document_id → documents, status `queued|processing|extracted|failed`, attempt, error_code, error_message, started_at, finished_at, created_at). Partial unique index on `(document_id)` where status in (`queued`, `processing`) makes a second active job impossible.

### MVP1-E3-02 · Claude extraction call — L
- **AC1:** The document (PDF or image) is sent to Claude as a document or image input along with the versioned prompt `prompts/extract-invoice/v1.md`.
- **AC2:** The output is forced into the invoice v1 schema (PRD §9) with a tool/JSON schema. Every field includes `value`, `confidence`, `source_page` and `source_quote`.
- **AC3:** The model ID and prompt version are read from configuration and saved on the job.
- **AC4:** The response is validated with zod. A schema failure triggers one repair attempt and then fails the job; invalid JSON is never stored.
- **Evals:** EXT-1 schema validity, EXT-2 header field accuracy, EXT-3 line item F1, EXT-4 hallucination rate, EXT-7 latency, EXT-8 cost (see `EVALS.md`).
- **API design:**
  - `GET /api/v1/documents/{documentId}/fields` (signed in) — The extracted fields with value, confidence and evidence. Query `flagged=true` → `200 {data: [Field]}`; `Field = {id, name, line_index?, value, confidence, model_confidence, source_page, source_quote, flagged, flag_reasons[], status}`.
  - Extraction itself has no endpoint: it runs inside the job started in E3-01.
- **Database design:** `extraction_jobs` adds model, prompt_version. `fields` (id, job_id → extraction_jobs, document_id, name, line_index null, value jsonb, model_confidence numeric(3,2), source_page, source_quote, created_at); unique `(job_id, name, line_index)`.

### MVP1-E3-03 · Rule checks and final confidence — M
- **AC1:** The arithmetic, date, currency, required-field and source-quote checks (PRD §10) run on every extraction.
- **AC2:** Final confidence = the lower of model confidence and rule result (a failed check sets 0.3). Fields under the threshold (default 0.85) or failing a check are marked `flagged`.
- **AC3:** Each flagged field stores the reason ("Total ≠ subtotal + tax", "Quote not found in document").
- **AC4:** Unit tests cover every rule check, including rounding and missing-tax cases.
- **Evals:** EXT-5 routing recall, EXT-6 flag rate.
- **API design:** No new endpoints; results appear in `GET …/fields` (`confidence`, `flagged`, `flag_reasons`).
- **Database design:** `fields` adds confidence numeric(3,2), flagged boolean, flag_reasons text[], status `pending|accepted|edited|not_present`. Index `fields(document_id) where flagged`.

### MVP1-E3-04 · Extraction page — M
- **AC1:** While processing, the page shows status steps and polls every 2 seconds, without a full-page reload.
- **AC2:** When done, the document preview (rendered PDF page or image) is on the left and the fields on the right, with confidence badges (green ≥ 0.85, amber 0.6–0.85, red < 0.6) and flagged fields highlighted.
- **AC3:** Tapping a field shows its source quote and page. On desktop, the preview jumps to that page.
- **AC4:** A "Review N flagged fields" button goes to E4. If nothing is flagged, "Continue to results" goes to E5.
- **API design:**
  - `GET /api/v1/documents/{documentId}/file` (signed in) — A short-lived link to view the original document. → `200 {url, expires_at, mime, pages}` (presigned GET, 5 minutes).
- **Database design:** No schema change.

### MVP1-E3-05 · Cost and latency logging — S
- **AC1:** Each job stores tokens in and out, estimated cost in USD and duration.
- **AC2:** An admin-only page `/admin/jobs` shows the last 100 jobs with these numbers and the failure rate.
- **API design:**
  - `GET /api/v1/admin/jobs` (admin) — Last 100 extraction jobs with tokens, cost, duration and failure rate. → `200 {data: [Job], summary: {failure_rate, avg_cost_usd, p95_duration_ms}}`. Errors: `404` for non-admins.
- **Database design:** `extraction_jobs` adds tokens_in, tokens_out, cost_usd numeric(10,6), duration_ms.

---

## E4 · Human review of low-confidence fields (MVP1 "d")
**Goal:** a person checks only what the system is unsure about, quickly, with evidence beside each field.

### MVP1-E4-01 · Review queue — M
- **AC1:** `/documents/{id}/review` lists flagged fields first, ordered by lowest confidence, each with its reason, current value and source quote.
- **AC2:** A counter shows "N of M resolved". Unflagged fields are available under "Show all fields".
- **API design:**
  - `GET /api/v1/documents/{documentId}/review` (signed in) — The review queue: flagged fields first, lowest confidence first. → `200 {flagged: [Field], resolved, total, can_complete}`.
- **Database design:** No schema change.

### MVP1-E4-02 · Accept, edit or mark not present — M
- **AC1:** Per field, I can accept, edit (with input checks: dates, numbers, currency code) or mark "Not on document".
- **AC2:** Every change stores the original value, the new value, who changed it and when, and audits `review.field_updated`.
- **AC3:** On desktop: Enter accepts, E edits, ↓ moves to the next field. On mobile: large tap targets.
- **API design:**
  - `PATCH /api/v1/documents/{documentId}/fields/{fieldId}` (signed in) — Accept, edit or mark a field as not on the document. Body `{action: accept|edit|not_present, value?}` → `200 {field}`. Errors: `422` invalid date, number or currency; `409` if the document is already paid.
- **Database design:** `fields` adds original_value jsonb, updated_by → users, updated_at. `field_changes` (id, field_id → fields, old_value jsonb, new_value jsonb, action, source `review|chat`, changed_by, created_at) keeps the full history so any change can be traced or undone.

### MVP1-E4-03 · Complete review — S
- **AC1:** "Complete review" stays disabled until every flagged field is resolved.
- **AC2:** On completion, the rule checks run again on the corrected data. If any still fail, I see which ones and can either fix them or confirm "Values are correct as on the document".
- **AC3:** The document status becomes `reviewed`, and I'm taken to results (E5).
- **API design:**
  - `POST /api/v1/documents/{documentId}/review/complete` (signed in) — Complete the review; rule checks run again on the corrected data. Body `{confirm_failed_checks?: boolean}` → `200 {document}` (status `reviewed`). Errors: `409` with `unresolved_fields[]` or `failed_checks[]`.
- **Database design:** `documents` adds reviewed_at, reviewed_by, checks_overridden boolean.

### MVP1-E4-04 · Corrections feed the eval set — S
- **AC1:** Each human correction is saved as a candidate eval case (document reference, field, model value, human value) in `eval_candidates`.
- **AC2:** An admin export produces new ground-truth files for `evals/datasets/` after manual approval. Customer documents are never added automatically.
- **API design:**
  - `GET /api/v1/admin/eval-candidates` (admin) — Human corrections waiting for approval as eval cases. Query `status`, `cursor` → `200 {data: [EvalCandidate], next_cursor}`.
  - `POST /api/v1/admin/eval-candidates/export` (admin) — Export approved corrections as ground-truth files. Body `{candidate_ids[]}` → `200 {files: [{name, url}]}`. Only candidates with status `approved` are exported.
- **Database design:** `eval_candidates` (id, document_id, field_name, model_value jsonb, human_value jsonb, status `candidate|approved|rejected|exported`, created_at).

---

## E5 · JSON review, metadata and CSV (MVP1 "e")
**Goal:** clean, trustworthy outputs the user can preview before paying.

### MVP1-E5-01 · Final JSON with metadata — M
- **AC1:** The JSON has `data` (the invoice v1 schema with final values) and `metadata`: `document_id`, `file_name`, `pages`, `model`, `prompt_version`, `extracted_at`, `reviewed_at`, `reviewed_by`, `fields_flagged`, `fields_corrected`, and per-field `confidence` and `corrected` flags.
- **AC2:** The output is validated against a published JSON Schema in `schemas/invoice-v1.json`.
- **AC3:** The JSON preview has syntax highlighting and folding, and works on mobile.
- **API design:**
  - `GET /api/v1/documents/{documentId}/outputs` (signed in) — The outputs available for a document, and whether download is unlocked. → `200 {version, locked, formats: ["json", "csv"], generated_at}`.
  - `GET /api/v1/documents/{documentId}/outputs/{format}/preview` (signed in) — Preview the JSON or CSV on screen before paying. `format = json|csv` → `200` with `application/json` (`{data, metadata}`) or `text/csv`, sent `Content-Disposition: inline`.
- **Database design:** No new tables; the JSON is built from `fields` and `documents`.

### MVP1-E5-02 · CSV export — S
- **AC1:** One row per line item, with invoice-level columns repeated on each row; the header order is documented.
- **AC2:** Quoting follows RFC 4180, with UTF-8 encoding and a BOM so Excel opens it correctly.
- **AC3:** Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` (CSV injection protection), with a unit test.
- **AC4:** An invoice with no line items gives one row with empty line columns.
- **API design:** Served by `GET …/outputs/csv/preview` and `…/download` (E5-01, E5-03).
- **Database design:** No schema change.

### MVP1-E5-03 · Locked preview — S
- **AC1:** Before payment, I can see a full preview of both outputs on screen, but download buttons show "Pay to download".
- **AC2:** The download endpoints return 402 until the order is paid, enforced on the server.
- **API design:**
  - `GET /api/v1/documents/{documentId}/outputs/{format}/download` (signed in) — Download an output. Locked until the order is paid. → `302` to a presigned GET URL (5 minutes, correct filename). Errors: `402` until paid, `404`.
- **Database design:** No schema change; entitlement = an `orders` row with status `paid` for the document.

### MVP1-E5-04 · Store outputs — S
- **AC1:** On review completion, `result.json` and `result.csv` are written to `users/{userId}/{docId}/outputs/`.
- **AC2:** If the user later edits fields, the outputs are regenerated and the version increments.
- **API design:** No new endpoints; `version` in `GET …/outputs` increments when outputs are regenerated.
- **Database design:** `outputs` (id, document_id → documents, version, json_s3_key, csv_s3_key, created_at); unique `(document_id, version)`.

---

## E6 · Payment (MVP1 "f")
**Goal:** a reliable, secure one-time payment per document.

### MVP1-E6-01 · Checkout session — M
- **AC1:** "Pay $5.00" creates a Stripe Checkout session in test mode with `metadata.order_id`, and success/cancel URLs back to the app.
- **AC2:** An `orders` row is created with status `pending`. Clicking twice reuses the open session instead of creating a duplicate order.
- **AC3:** A banner says "Test mode — use card 4242 4242 4242 4242, any future date, any CVC".
- **API design:**
  - `POST /api/v1/orders` (signed in) — Create an order and a Stripe Checkout session for a document. Body `{document_id}` → `201 {order, checkout_url}`; `200` with the open order if one exists. The price is set on the server. Errors: `409` if already paid or not reviewed.
- **Database design:** `orders` (id, user_id → users null, document_id → documents null, stripe_session_id unique, amount, currency, status `pending|paid|expired|failed`, paid_at, created_at). Partial unique index on `(document_id)` where status = `pending` prevents duplicate open orders.

### MVP1-E6-02 · Webhook — M
- **AC1:** `POST /api/v1/webhooks/stripe` verifies the Stripe signature and rejects invalid ones with 400.
- **AC2:** On `checkout.session.completed`, the order becomes `paid`, and `order.paid` is audited.
- **AC3:** The handler is idempotent: an event ID already processed returns 200 without changing anything again.
- **AC4:** Also handles `checkout.session.expired` (order becomes `expired`) and async payment failure (order becomes `failed`).
- **API design:**
  - `POST /api/v1/webhooks/stripe` (service) — Stripe webhook: marks orders paid, expired or failed. Verifies `Stripe-Signature` → `200`. Already-processed event IDs return `200` with no change. Errors: `400` bad signature.
- **Database design:** `stripe_events` (event_id primary key, type, processed_at) gives idempotency: insert first, skip if it already exists.

### MVP1-E6-03 · Payment page and states — S
- **AC1:** `/documents/{id}/pay` shows an order summary: document name, number of fields, price.
- **AC2:** Cancel returns here with "Payment cancelled — you haven't been charged" and a retry button.
- **AC3:** A document that's already paid skips straight to success (E7).
- **API design:**
  - `GET /api/v1/orders` (signed in) — List my orders. Query `document_id`, `status`, `cursor` → `200 {data: [Order], next_cursor}`.
  - `GET /api/v1/orders/{orderId}` (signed in) — Get one order, for the payment and success pages to poll. → `200 {order: {id, document_id, amount, currency, status: pending|paid|expired|failed}}`.
- **Database design:** No schema change.

---

## E7 · Success, download and email (MVP1 "g")
**Goal:** the user gets their files immediately and has a record by email.

### MVP1-E7-01 · Success page — M
- **AC1:** On return from Stripe, the page polls the order status (up to 30 seconds) and shows "Confirming payment…" until the webhook marks it paid.
- **AC2:** Once paid, the "Download JSON" and "Download CSV" buttons work.
- **AC3:** If confirmation takes over 30 seconds, it says "We'll email you when it's ready", and the email still arrives.
- **API design:** No new endpoints. The page polls `GET /api/v1/orders/{orderId}` and then uses the download endpoints.
- **Database design:** No schema change.

### MVP1-E7-02 · Secure downloads — S
- **AC1:** Each download checks on the server that the user owns the document and the order is paid, then redirects to a presigned GET URL valid for 5 minutes, with the right filename.
- **AC2:** `delivery.downloaded` is audited.
- **API design:** Uses `GET …/outputs/{format}/download` (E5-03), which becomes `302` once the order is paid.
- **Database design:** No schema change.

### MVP1-E7-03 · Email delivery — M
- **AC1:** When the order is paid (triggered by the webhook, not the browser), an email is sent via Resend within 60 seconds. It contains the document name, amount paid and a link to `/documents/{id}/success`, not a raw S3 link.
- **AC2:** A send failure retries 3 times with backoff and records `deliveries.status`. A permanent failure shows "Email couldn't be sent" on the success page.
- **AC3:** The email passes SPF/DKIM for the sending domain (Resend domain verification for 01scale.com), with plain-text and HTML versions.
- **API design:**
  - `GET /api/v1/orders/{orderId}/deliveries` (signed in) — Delivery attempts for an order (email status). → `200 {data: [{channel, status: queued|sent|failed, attempts, sent_at}]}`.
- **Database design:** `deliveries` (id, order_id → orders, channel `email`, status `queued|sent|failed`, attempts, provider_message_id, last_error, sent_at, created_at).

---

## Definition of done for MVP1
- All stories pass their AC; E3 and E4 evals meet `EVALS.md` MVP1 thresholds on the holdout set.
- The demo script in PRD §15 runs end to end on a phone in under 3 minutes.
- README roadmap updated, release `mvp1` tagged, demo clip on the 01scale.com card.
