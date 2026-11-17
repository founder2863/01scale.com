# MVP2 — Epics and issues

Source: `docs/prd/MVP2-PRD.md`. Evals: `docs/evals/EVALS.md`.
Same conventions as MVP1: one issue per story, AC in Given / When / Then, sizes S / M / L. Every story names the **Service** that owns it and carries an **API design** and a **Database design**; see `docs/architecture/`.

---

## E8 · Passwordless identity, built by hand (MVP2 "a")
**Goal:** replace Cognito with our own provider. Libraries allowed: `@node-rs/argon2`, `jose`, `@simplewebauthn/*`, Node `crypto`, Resend. No auth vendors or auth frameworks.

### MVP2-E8-01 · Identity schema and session service — M
- **AC1:** New tables: `auth_identities` (user_id, type email|passkey, identifier), `sessions` (id, user_id, token_hash, created_at, last_seen_at, expires_at, absolute_expires_at, ip_hash, user_agent), `login_tokens` (id, email, token_hash, purpose, expires_at, used_at), `passkeys` (credential_id, user_id, public_key, counter, transports, name, created_at, last_used_at) and `recovery_codes` (user_id, code_hash, used_at).
- **AC2:** Session tokens are 32 random bytes from `crypto.randomBytes`; only the SHA-256 hash is stored. The cookie is `__Host-session`, HttpOnly, Secure, SameSite=Lax.
- **AC3:** Sessions use a 7-day sliding expiry, capped at 30 days, and both are enforced on the server.
- **AC4:** The OIDC client from MVP1 is replaced behind the same `getCurrentUser()` interface, with no changes to page code.
- **Service:** Identity
- **API design:** No new endpoints. `GET /session`, `POST /token` and `GET /jwks` keep their contract, so no other service or app changes. `GET /auth/login` and `/auth/callback` are removed in E8-08.
- **Database design:** New in `identity`: `auth_identities`, `login_tokens`, `passkeys`, `recovery_codes` as listed in AC1. `identity.sessions` (from MVP1-E1-03) gains last_seen_at, absolute_expires_at, ip_hash, user_agent, reauthenticated_at. `identity.users.cognito_sub` becomes nullable.

### MVP2-E8-02 · Magic link sign-in and sign-up — M
As Priya, I want to sign in by clicking a link in my email.
- **AC1:** Given I enter an email, then the response is always "Check your email", whether or not an account exists, and takes about the same time either way.
- **AC2:** A token of 32 random bytes is created and only its hash stored, with a 15-minute expiry and single use. The link goes to `/auth/confirm?token=…`.
- **AC3:** The confirm page needs a deliberate "Sign in" click (POST), so email link scanners can't use the token. The token is checked (hash match, not expired, not used), marked used, and a session is created.
- **AC4:** An unknown email creates a new user on first confirmation (sign-up and sign-in are one flow).
- **AC5:** Rate limits: 5 requests per email per hour and 20 per IP per hour, after which the user sees a generic message. `auth.magic_link_requested` and `auth.signin` are audited.
- **Service:** Identity
- **API design:**
  - `POST /api/identity/v1/auth/magic-links` (public) — Request a sign-in email. Always answers the same way. Body `{email, return_to?}` → `202 {message: "Check your email"}` whether or not the account exists, in constant time. Errors: `429` (generic).
  - `POST /api/identity/v1/auth/magic-links/confirm` (public) — Exchange a magic-link token for a session (deliberate POST). Body `{token}` → `200 {user, return_to}` with the session cookie set. Errors: `400` invalid, expired or used token (one message for all three).
- **Database design:** Uses `identity.login_tokens` (purpose `magic_link`). `identity.rate_limits` (key, window_start, count; primary key (key, window_start)) backs the per-email and per-IP limits.

### MVP2-E8-03 · Email one-time code fallback — S
- **AC1:** The same email also has a 6-digit code, valid 10 minutes, stored as a hash.
- **AC2:** A code allows at most 5 tries, then it's invalidated. The comparison is constant-time.
- **AC3:** A code-entry form on the sign-in page supports paste and the phone's one-time-code autofill.
- **Service:** Identity
- **API design:**
  - `POST /api/identity/v1/auth/email-codes/verify` (public) — Sign in with the 6-digit code from the same email. Body `{email, code}` → `200 {user}` with the session cookie set. Errors: `400` wrong or expired code, `429` after 5 tries.
- **Database design:** `identity.login_tokens` adds code_hash, attempts (purpose `email_code`).

### MVP2-E8-04 · Passkeys: register and sign in — L
- **AC1:** After sign-in, I'm offered "Add a passkey". Registration uses `@simplewebauthn/server` with the relying party ID `01scale.com` and requires user verification.
- **AC2:** "Sign in with passkey" works without typing an email, using browser autofill where supported.
- **AC3:** The signature counter and backup flags are checked and stored. A replayed or invalid assertion is rejected and audited.
- **AC4:** I can name, list and remove passkeys on `/account/security`. Removing one requires re-authentication within the last 5 minutes.
- **AC5:** Tested on iOS Safari, Android Chrome and desktop Chrome, with results recorded in the PR.
- **Service:** Identity
- **API design:**
  - `POST /api/identity/v1/passkeys/registration-options` (signed in) — WebAuthn options to register a new passkey. → `200` PublicKeyCredentialCreationOptions; the challenge is stored server-side for 5 minutes.
  - `POST /api/identity/v1/passkeys` (signed in) — Verify the registration and save the passkey. Body `{name, response}` → `201 {passkey, recovery_codes?}` (codes only with the first passkey). Errors: `400` verification failed.
  - `GET /api/identity/v1/passkeys` (signed in) — List my passkeys. → `200 {data: [{id, name, created_at, last_used_at, backed_up}]}`.
  - `PATCH /api/identity/v1/passkeys/{passkeyId}` (signed in) — Rename a passkey. Body `{name}` → `200 {passkey}`.
  - `DELETE /api/identity/v1/passkeys/{passkeyId}` (signed in) — Remove a passkey (needs recent re-authentication). → `204`. Errors: `403` with `code: reauthentication_required`.
  - `POST /api/identity/v1/auth/passkeys/authentication-options` (public) — WebAuthn options to sign in with a passkey (no email needed). → `200` PublicKeyCredentialRequestOptions with an empty allow-list (discoverable credentials).
  - `POST /api/identity/v1/auth/passkeys/verify` (public) — Verify a passkey assertion and create a session. Body `{response}` → `200 {user}` with the session cookie set. Errors: `400` invalid or replayed assertion (audited).
- **Database design:** Uses `identity.passkeys`; adds backed_up boolean, backup_eligible boolean. `identity.webauthn_challenges` (id, user_id null, challenge, purpose, expires_at).

### MVP2-E8-05 · Recovery codes — S
- **AC1:** When the first passkey is registered, 10 single-use recovery codes are shown once and stored hashed with argon2.
- **AC2:** A recovery code signs me in, is marked used, and prompts me to add a new passkey.
- **AC3:** I can regenerate codes, which invalidates the old set; this requires re-authentication.
- **Service:** Identity
- **API design:**
  - `POST /api/identity/v1/recovery-codes` (signed in) — Regenerate recovery codes; the old set stops working. → `201 {codes[10]}`, shown once. Needs recent re-authentication.
  - `POST /api/identity/v1/auth/recovery-codes/verify` (public) — Sign in with a single-use recovery code. Body `{email, code}` → `200 {user, prompt: "add_passkey"}`. Errors: `400`, `429`.
- **Database design:** Uses `identity.recovery_codes`; a regenerate deletes the user's old rows in the same transaction.

### MVP2-E8-06 · Session management page — S
- **AC1:** `/account/security` lists active sessions with device, approximate location from IP if available, and last active time, with the current one marked.
- **AC2:** I can revoke any session or "Sign out everywhere else". A revoked session is rejected on its next request.
- **Service:** Identity
- **API design:**
  - `GET /api/identity/v1/sessions` (signed in) — List my active sessions with device and last active time. → `200 {data: [{id, device, approx_location?, last_seen_at, current}]}`.
  - `DELETE /api/identity/v1/sessions/{sessionId}` (signed in) — Revoke one session. → `204`.
  - `DELETE /api/identity/v1/sessions` (signed in) — Sign out everywhere else. → `200 {revoked}`; the current session is kept.
- **Database design:** No schema change; reads `identity.sessions`.

### MVP2-E8-07 · Re-authentication for sensitive actions — S
- **AC1:** Changing email, removing a passkey or payment method, deleting the account and regenerating recovery codes all require proof (passkey or email code) within the last 5 minutes.
- **AC2:** Changing email sends confirmation to the new address and a notice to the old one.
- **Service:** Identity
- **API design:**
  - `POST /api/identity/v1/auth/reauthentication` (signed in) — Start re-authentication for a sensitive action. Body `{method: passkey|email_code}` → `200` WebAuthn options, or `202` after sending a code.
  - `POST /api/identity/v1/auth/reauthentication/verify` (signed in) — Finish re-authentication; valid for 5 minutes. Body `{response}` or `{code}` → `200 {reauthenticated_until}`. The next access token carries `reauth_at`, which other services check.
  - `POST /api/identity/v1/me/email-change` (signed in) — Ask to change my email (confirmation goes to the new address). Body `{new_email}` → `202`. Needs recent re-authentication. A notice goes to the old address.
  - `POST /api/identity/v1/me/email-change/confirm` (signed in) — Confirm the new email address. Body `{token}` → `200 {user}`.
- **Database design:** `identity.sessions.reauthenticated_at`. `identity.email_changes` (id, user_id, new_email, token_hash, expires_at, confirmed_at).

### MVP2-E8-08 · Cognito migration and shutdown — M
- **AC1:** Given an MVP1 user signs in with a magic link to their verified email, then they're matched to their existing `users` row by email and keep all their documents and orders.
- **AC2:** A migration report shows migrated vs not-yet-migrated users.
- **AC3:** After 30 days, Cognito sign-in is turned off, its environment variables are removed, and a decision record `docs/decisions/E8.md` explains the build-vs-buy and migration choices.
- **Service:** Identity
- **API design:**
  - `GET /api/identity/v1/admin/migration-report` (admin) — Users migrated from Cognito vs not yet migrated. → `200 {migrated, pending, cutoff_at}`.
- **Database design:** `identity.users` adds migrated_at. After cutoff, a migration drops `cognito_sub`.

### MVP2-E8-09 · Auth security hardening — M
- **AC1:** CSRF protection on all state-changing routes (SameSite plus an origin check).
- **AC2:** Every auth event is audited: requested, succeeded, failed, locked, passkey added/removed, session revoked.
- **AC3:** An OWASP ASVS v4 chapter 2 and 3 checklist (authentication, sessions) is completed in `docs/security/asvs-auth.md`, with each item marked pass, fail or n/a.
- **Service:** Identity and service template
- **API design:** No new endpoints. The gateway checks the `Origin` header on cookie-authenticated writes; API-key requests are exempt from CSRF checks because they carry no ambient credentials.
- **Database design:** No schema change.

### MVP2-E8-10 · Account security on our own screens — S
Decided by Nikhil on 17 Nov 2026 (issue #26): in MVP1, "Change password" uses Cognito's hosted forgot-password page; our own screens come with hand-built identity.
As a user, I want to manage how I sign in on 01scale's own account page, without being sent to another site.
- **AC1:** `/account/security` replaces MVP1's "Change password" button. MVP2 sign-in is passwordless, so there is no password to change: the page lists my sign-in methods (my email for magic links and codes, and my passkeys), and I can add a passkey, remove one (with re-authentication, `MVP2-E8-07`) or change my email.
- **AC2:** No step sends me to an outside page. Every action is an Identity endpoint with its UI component in `packages/ui-identity`.
- **AC3:** An MVP1 user who signed in with a password and has not yet set up a passkey sees a prompt to add one.
- **Service:** Identity
- **API design:** No new endpoints: composes `GET /api/identity/v1/passkeys` and `DELETE …/passkeys/{passkeyId}` (`MVP2-E8-04`), `POST /api/identity/v1/me/email-change` (`MVP2-E8-07`) and `GET /api/identity/v1/sessions` (`MVP2-E8-06`). Removes `POST /api/identity/v1/me/password-change` (MVP1), with a deprecation note in the changelog.
- **Database design:** No schema change.

---

## E9 · Multi-document support (MVP2 "b") — `llm`
**Goal:** process batches in parallel with a visible, recoverable pipeline.

### MVP2-E9-01 · Batch upload — M
- **AC1:** I can select or drop up to 10 files at once. Each is checked individually (type, size, pages), and rejected ones don't block the others.
- **AC2:** A `batches` row groups the documents, and each document has its own upload progress.
- **Service:** DocFlow app (files through Upload)
- **API design:**
  - `POST /api/docflow/v1/batches` (signed in) — Create a batch of up to 10 documents; each file is checked on its own. Body `{files: [{file_name, mime, size}]}` → `201 {batch, documents: [{document, upload} | {file_name, rejected_reason}]}`. Supports `Idempotency-Key`.
  - `POST /api/docflow/v1/batches/{batchId}/process` (signed in) — Start extraction for the batch once the uploads are confirmed. → `202 {batch}`. Calls Extraction `POST /job-groups`. Idempotent. Errors: `409` if no file is ready.
- **Database design:** `docflow.batches` (id, owner_id, job_group_id, status `uploading|processing|needs_review|reviewed|paid|failed`, created_at). `docflow.documents` adds batch_id → batches null, excluded boolean default false.

### MVP2-E9-02 · LangGraph orchestrator on Lambda — L
- **AC1:** A Python LangGraph graph `batch_pipeline` (nodes: plan → extract (fan-out) → validate → judge (E10) → aggregate) is deployed on AWS Lambda as the Extraction service's worker and triggered by the service's API through a queue (SQS). The Extraction API contract does not change.
- **AC2:** At most 3 documents run at once. Each document's state is saved after each node, so a retry resumes rather than restarts.
- **AC3:** One document failing doesn't fail the batch: that document is marked `failed` with a retry action, and the rest continue.
- **AC4:** Progress is written to Extraction's own schema. The job-group status endpoint shows per-job step and status, and DocFlow's batch page reads it.
- **AC5:** The decision record explains why there's a separate Lambda service rather than an in-app job.
- **Service:** LLM Extraction (Python on AWS Lambda)
- **API design:**
  - `POST /api/extraction/v1/job-groups` (signed in) — Run several extraction jobs as one group with a concurrency limit. Body `{jobs: [{file_id, schema, reference?}], max_concurrency: 3}` → `202 {group, jobs[]}`. One job failing does not fail the group.
  - `GET /api/extraction/v1/job-groups/{groupId}` (signed in) — Group status with each job's current step. → `200 {group, jobs: [{id, file_id, node, status}], summary: {extracted, failed, running}}`.
  - The Lambda pipeline is part of the Extraction service and writes to Extraction's own schema. DocFlow follows progress through `GET /job-groups/{groupId}` and the `extraction.job.*` events.
- **Database design:** `extraction.job_groups` (id, owner_id, max_concurrency, status, created_at); `extraction.jobs` adds group_id. `extraction.pipeline_runs` (id, job_id, node, status, state jsonb, attempt, updated_at) stores per-node checkpoints so a retry resumes.

### MVP2-E9-03 · Batch status page — S
- **AC1:** `/batches/{id}` shows each document as a card with its status and step, updating live via polling.
- **AC2:** A summary line reads "8 extracted · 1 needs review · 1 failed".
- **Evals:** MD-1 batch completeness, MD-2 batch latency, MD-3 accuracy in batch vs alone.
- **Service:** DocFlow app
- **API design:**
  - `GET /api/docflow/v1/batches` (signed in) — List my batches. Query `cursor`, `limit` → `200 {data: [Batch], next_cursor}`.
  - `GET /api/docflow/v1/batches/{batchId}` (signed in) — Batch status with each document's step and status. → `200 {batch, documents: [{id, file_name, step, status}], summary: {extracted, needs_review, failed}}`.
- **Database design:** No schema change.

### MVP2-E9-04 · Keep original documents beyond 30 days — S
Decided by Nikhil on 17 Nov 2026 (ARCHITECTURE.md §12.8): in MVP1, originals are deleted after 30 days; keeping them longer is for MVP2.
As a user, I want to see the original invoice beside its results months later, so I can check a value against the document.
- **AC1:** An app can ask Upload to keep a file until the owner deletes it or their account (`retention: until_deleted`), instead of the default 30 days.
- **AC2:** DocFlow keeps the originals of documents whose review is complete; files never completed still expire after 30 days.
- **AC3:** The S3 lifecycle rule applies only to files tagged for expiry, so kept files are not removed. Storage cost per user is shown on the admin page.
- **AC4:** Deleting a document or the account deletes its original at once, as today.
- **Service:** Upload (provider), then DocFlow
- **API design:** `PATCH /api/upload/v1/files/{fileId}` (signed in) — change a file's retention. Body `{retention: "30_days"|"until_deleted"}` → `200 {file}`.
- **Database design:** `upload.files.expires_at` becomes nullable: empty means kept until deleted.

---

## E10 · LLM as judge on extraction (MVP2 "c") — `llm`
**Goal:** a second, independent check that catches the extractor's mistakes.

### MVP2-E10-01 · Judge node — L
- **AC1:** For each extracted field, the judge gets the document, the field name and its value (not the extractor's reasoning) and returns `{verdict: correct|incorrect|unsure, reason, evidence_quote}`.
- **AC2:** It uses prompt `prompts/judge-field/v1.md` and a model set separately from the extractor's.
- **AC3:** Calls are batched (several fields per call, grouped by page) to keep the added time to 30% or less.
- **Service:** LLM Extraction
- **API design:** No new endpoints; the judge is a pipeline node inside Extraction.
- **Database design:** `extraction.field_judgements` (id, field_id → fields, verdict `correct|incorrect|unsure`, reason, evidence_quote, model, prompt_version, created_at).

### MVP2-E10-02 · Combined confidence and routing — M
- **AC1:** Final confidence = a documented formula of model confidence, rule checks and judge verdict (`incorrect` caps it at 0.2, `unsure` at 0.6). The formula is versioned.
- **AC2:** Review routing uses the combined score. The UI shows the judge's reason next to flagged fields.
- **Evals:** JDG-1 judge agreement, JDG-2 routing recall with judge, JDG-3 flag rate, JDG-4 bias checks, JDG-5 added latency.
- **Service:** LLM Extraction
- **API design:** No new endpoints. `Field` gains `judge: {verdict, reason, evidence_quote}` and `confidence_version`; DocFlow passes them on when it creates the review task.
- **Database design:** `extraction.fields` adds confidence_version; `confidence` now holds the combined score. `review.fields` adds judge_verdict, judge_reason (copied in when the task is created).

### MVP2-E10-03 · Judge vs human dashboard — S
- **AC1:** `/admin/quality` shows, for the last 30 days: judge agreement with human decisions, the confusion matrix and the fields the judge most often gets wrong.
- **AC2:** Cases where the judge and the human disagree can be exported as eval candidates.
- **Service:** Human Review
- **API design:**
  - `GET /api/review/v1/admin/quality` (admin) — Judge vs human: agreement, confusion matrix, weakest fields (30 days). Query `days` → `200 {agreement_rate, confusion_matrix, worst_fields[]}`.
  - `POST /api/review/v1/admin/quality/export` (admin) — Export judge/human disagreements as eval candidates. → `201 {created}` rows in `review.eval_candidates`.
  - Review can compare judge and human because each review field stores the judge verdict it was created with.
- **Database design:** No new tables; aggregates `review.fields.judge_verdict` against `review.field_changes`.

---

## E11 · Metadata enrichment and chat correction (MVP2 "d") — `llm`
**Goal:** add useful, cited context from the web and let users fix data in plain language, safely.

### MVP2-E11-01 · Research agent — L
- **AC1:** For each document, the agent searches the web (Claude web search tool) using only `vendor_name`, `vendor_address` and `vendor_tax_id` (an allow-list).
- **AC2:** It returns `vendor_website`, `vendor_address_normalized`, `vendor_category` and `vendor_registered` (yes/no/unknown). Each has `source_urls[]` and `retrieved_at`, and a value without a source is dropped.
- **AC3:** Amounts, bill-to details and line items are never included in queries, enforced in code and covered by a unit test.
- **Evals:** ENR-1 citation coverage, ENR-2 accuracy, ENR-3 PII leakage, ENR-4 abstention.
- **Service:** LLM Extraction
- **API design:**
  - `GET /api/extraction/v1/jobs/{jobId}/enrichment` (signed in) — Web-sourced vendor metadata with citations for a job. → `200 {data: [{name, value, source_urls[], retrieved_at}]}`.
- **Database design:** `extraction.enrichments` (id, job_id → jobs, name, value jsonb, source_urls text[] not empty, retrieved_at).

### MVP2-E11-02 · Enrichment review UI — S
- **AC1:** Enrichment appears in a separate "Metadata" panel with source links. Each value can be accepted or rejected.
- **AC2:** Only accepted values go into the output JSON `metadata.enrichment`.
- **Service:** Human Review
- **API design:** No new endpoints. DocFlow adds enrichment values to the review task as fields of `kind: enrichment` (with `source_urls`); accept or reject uses `PATCH /api/review/v1/tasks/{taskId}/fields/{fieldId}` (MVP1-E4-02).
- **Database design:** `review.fields.kind` gains `enrichment`; adds source_urls text[]. An accepted enrichment has status `accepted`.

### MVP2-E11-03 · Chat correction agent — L
As Priya, I want to type "line 3 quantity should be 12" and have it fixed.
- **AC1:** A chat panel on the review page sends messages to an agent whose only write tools are `propose_field_update(field, new_value, reason)` and `propose_line_item_update(index, field, new_value, reason)`.
- **AC2:** Proposed changes appear as a diff (old → new) with Apply and Reject buttons. Nothing changes without Apply.
- **AC3:** Applied changes are audited with `source: chat`, rule checks run again, and each can be undone.
- **AC4:** The agent refuses requests outside its scope (e.g. "email this to my boss") and says why.
- **Evals:** CHAT-1 correct application, CHAT-2 no unrequested changes, CHAT-3 scope refusal, CHAT-4 ambiguity handling.
- **Service:** Human Review
- **API design:**
  - `GET /api/review/v1/tasks/{taskId}/chat/messages` (signed in) — The correction chat history for a task. → `200 {data: [Message]}`.
  - `POST /api/review/v1/tasks/{taskId}/chat/messages` (signed in) — Ask the correction agent to fix data in plain language. Body `{text}` → `201 {message, proposals: [{id, field, old_value, new_value, reason}]}`. Nothing changes until a proposal is applied.
  - `POST /api/review/v1/tasks/{taskId}/proposals/{proposalId}/apply` (signed in) — Apply a proposed change. → `200 {field}`; audited with `source: chat`. Errors: `409` if the field changed since the proposal.
  - `POST /api/review/v1/tasks/{taskId}/proposals/{proposalId}/reject` (signed in) — Reject a proposed change. → `200 {proposal}`.
  - `POST /api/review/v1/tasks/{taskId}/proposals/{proposalId}/undo` (signed in) — Undo an applied change. → `200 {field}`. Errors: `409` if the field was edited again afterwards.
- **Database design:** `review.chat_messages` (id, task_id, owner_id, role `user|assistant`, text, created_at). `review.field_proposals` (id, task_id, message_id, field_id, old_value jsonb, new_value jsonb, reason, status `proposed|applied|rejected|undone`, applied_change_id → field_changes).

---

## E12 · Multi-document review and outputs (MVP2 "e")
### MVP2-E12-01 · Tabbed review — M
- **AC1:** One tab per document, each with a badge showing flagged fields left. "Next flagged" jumps across tabs.
- **AC2:** "Complete batch review" stays disabled until all documents are resolved; a document can be left out of the batch if it's unwanted.
- **Service:** DocFlow app
- **API design:**
  - `GET /api/docflow/v1/batches/{batchId}/review` (signed in) — Review state across a batch: flagged fields left per document. → `200 {documents: [{id, file_name, review_task_id, flagged_remaining, excluded}], next_flagged: {document_id, field_id}?, can_complete}`.
  - `PATCH /api/docflow/v1/batches/{batchId}/documents/{documentId}` (signed in) — Leave a document out of the batch (or put it back). Body `{excluded: boolean}` → `200 {document}`.
  - `POST /api/docflow/v1/batches/{batchId}/complete-review` (signed in) — Complete the batch review and build the batch outputs. → `200 {batch}`. Errors: `409` with `unresolved_documents[]`.
- **Database design:** No new tables; uses `docflow.documents.excluded` and `docflow.batches.status`.

### MVP2-E12-02 · Batch outputs — M
- **AC1:** Outputs are per-document JSON, `batch.json` (an array with a batch metadata block), `batch.csv` (with a `document_id` column) and `batch.zip` (one CSV per document plus the JSON files).
- **AC2:** The JSON and CSV preview has a tab per document plus a "Combined" tab.
- **AC3:** CSV injection protection and the encoding rules from MVP1-E5-02 also apply here.
- **Service:** DocFlow app
- **API design:**
  - `GET /api/docflow/v1/batches/{batchId}/outputs` (signed in) — The outputs available for a batch. → `200 {version, locked, formats: ["json", "csv", "zip"]}`.
  - `GET /api/docflow/v1/batches/{batchId}/outputs/{format}/preview` (signed in) — Preview the combined JSON or CSV. `format = json|csv` → `200` inline content.
  - `GET /api/docflow/v1/batches/{batchId}/outputs/{format}/download` (signed in) — Download batch.json, batch.csv or batch.zip. → `302` to an Upload `download-url`. Errors: `402` until paid.
- **Database design:** No tables: like single documents, batch results (JSON, CSV and the zip) are built on demand from each document's Review values and never stored (ARCHITECTURE.md §12.8).

---

## E13 · Payments v2 (MVP2 "f")
**Goal:** saved cards, default method and history, without card data touching our servers.

### MVP2-E13-01 · Stripe Customer per user — S
- **AC1:** A Stripe Customer is created the first time a user pays or adds a card, and its ID is stored in the Payment service against the user's ID.
- **Service:** Payment
- **API design:** No endpoints.
- **Database design:** `payment.customers` (owner_id primary key, stripe_customer_id unique, created_at). The Stripe customer lives in Payment's schema, not on Identity's user.

### MVP2-E13-02 · Save a card — M
- **AC1:** "Add card" on `/account/payment-methods` uses a SetupIntent with Stripe Elements. The card number never reaches our servers (PCI SAQ A scope).
- **AC2:** At checkout, a "Save this card" checkbox is shown (`setup_future_usage`).
- **AC3:** Webhooks `payment_method.attached` and `detached` keep the local list in sync.
- **Service:** Payment
- **API design:**
  - `POST /api/payment/v1/payment-methods/setup-intents` (signed in) — Start saving a card (Stripe SetupIntent). → `201 {client_secret}` for Stripe Elements; the card number never reaches our servers.
  - `payment_method.attached` and `detached` arrive on `POST /api/payment/v1/webhooks/stripe` (MVP1-E6-02).
- **Database design:** `payment.payment_methods` (id, owner_id, stripe_payment_method_id unique, brand, last4, exp_month, exp_year, is_default, created_at). No card number or CVC is ever stored.

### MVP2-E13-03 · Manage payment methods — M
- **AC1:** I can list cards (brand, last 4, expiry), set the default and remove a card. Removal requires re-authentication (E8-07).
- **AC2:** An expired card is shown as expired and can't be the default.
- **Service:** Payment
- **API design:**
  - `GET /api/payment/v1/payment-methods` (signed in) — List my saved cards. → `200 {data: [{id, brand, last4, exp_month, exp_year, is_default, expired}]}`.
  - `PATCH /api/payment/v1/payment-methods/{paymentMethodId}` (signed in) — Make a card the default. Body `{is_default: true}` → `200 {payment_method}`. Errors: `409` if the card is expired.
  - `DELETE /api/payment/v1/payment-methods/{paymentMethodId}` (signed in) — Remove a saved card (needs recent re-authentication). → `204`. Errors: `403` with `code: reauthentication_required` unless the token's `reauth_at` is within 5 minutes.
- **Database design:** Partial unique index on `payment.payment_methods(owner_id)` where is_default allows one default per user.

### MVP2-E13-04 · One-tap pay with default card — M
- **AC1:** For a batch, "Pay $X with Visa •• 4242" creates a PaymentIntent with the default card.
- **AC2:** If 3-D Secure is required, the challenge appears in the page and payment completes afterwards (tested with Stripe's 3-D Secure test cards).
- **AC3:** The amount is the number of documents × the unit price, calculated on the server, never taken from the browser.
- **Service:** Payment; composed by the DocFlow app
- **API design:**
  - `POST /api/payment/v1/payments` (service) — Charge a saved card. Called by an app's server, which sets the amount. Body `{user_id, reference, description, amount, currency, payment_method_id?}` + `Idempotency-Key` → `201 {payment, requires_action, client_secret?}`. Emits `payment.payment.succeeded|failed`.
  - `POST /api/docflow/v1/batches/{batchId}/pay` (signed in) — Pay for a batch with my default card in one tap. → `201 {payment_id, requires_action, client_secret?}`. DocFlow computes documents × unit price and calls Payment `POST /payments`.
- **Database design:** `payment.payments` (id, owner_id, app, reference, description, stripe_payment_intent_id unique, payment_method_id, amount, currency, status `requires_action|processing|succeeded|failed|refunded`, receipt_url, created_at). MVP1 `payment.orders` remain for Checkout. `docflow.batches` adds payment_id.

### MVP2-E13-05 · Payment history — S
- **AC1:** `/account/payments` lists date, batch or document, amount, status and a Stripe receipt link, newest first, paginated.
- **AC2:** Refunded or failed payments show their status clearly.
- **Service:** Payment
- **API design:**
  - `GET /api/payment/v1/payments` (signed in) — Payment history, newest first. Query `cursor`, `limit` → `200 {data: [{id, created_at, reference, description, amount, currency, status, receipt_url}], next_cursor}`.
- **Database design:** No schema change; index `payment.payments(owner_id, created_at desc)`.

### MVP2-E13-06 · Free plan and upgrade to paid — M
Decided by Nikhil on 17 Nov 2026 (PR #64): MVP1 limits every user to 10 requests a minute that change something and 60 reads a minute (10 a minute in total with an API key), so the demo cannot be used in batch; MVP2 adds a freemium model with paid upgrades.
As a user who has outgrown the free plan, I want to upgrade to a paid plan so I get higher limits without a new account.
- **AC1:** Every user starts on the Free plan, with the MVP1 limits (10 changes and 60 reads a minute; 10 a minute with an API key). Paid plans raise them and allow batch use. The plans and their limits are configuration, not code.
- **AC2:** `/account/plan` shows my plan, my usage against its limits, and the paid plans with their prices. Upgrading goes through Stripe Checkout in subscription mode; downgrading or cancelling takes effect at the end of the paid period.
- **AC3:** When I reach a limit, the answer says which limit and offers the upgrade, instead of only `429`.
- **AC4:** The gateway applies the limits of my plan, read from my access token, so no service needs to know about plans.
- **AC5:** A failed renewal returns me to the Free plan after Stripe's retries, and I am emailed through Delivery.
- **Service:** Payment (subscriptions), Identity (plan in the token), Gateway (limits per plan)
- **API design:**
  - `GET /api/payment/v1/plans` (public) — The plans with prices and limits. → `200 {data: [Plan]}`.
  - `GET /api/payment/v1/subscription` (signed in) — My plan, status and period end. → `200 {subscription}`.
  - `POST /api/payment/v1/subscription/checkout` (signed in, session only) — Start an upgrade. Body `{plan}` → `201 {checkout_url}`. A person always completes payment.
  - `POST /api/payment/v1/subscription/cancel` (signed in, session only) — Cancel at the end of the period. → `200 {subscription}`.
  - Payment announces `payment.subscription.changed`; Identity puts `plan` in the user's access tokens.
- **Database design:** `payment.subscriptions` (id, owner_id unique, plan, status `active|past_due|cancelled`, stripe_subscription_id unique, current_period_end, created_at). `identity.users` adds `plan`, kept in step from the event.

---

## E14 · Notifications: email, SMS, push (MVP2 "g")
### MVP2-E14-01 · Notification preferences — S
- **AC1:** `/account/notifications` has toggles per channel (email on by default; SMS and push off) and per event (batch extracted, review needed, payment succeeded, files ready).
- **Service:** Delivery
- **API design:**
  - `GET /api/delivery/v1/notification-preferences` (signed in) — My notification settings per channel and event. → `200 {channels: {email, sms, push}, events: {…}}`.
  - `PUT /api/delivery/v1/notification-preferences` (signed in) — Replace my notification settings. Body as above → `200`. Errors: `409` enabling SMS without a verified phone (read from the access token's `phone_verified` claim).
- **Database design:** `delivery.notification_preferences` (owner_id primary key, email boolean default true, sms boolean default false, push boolean default false, events jsonb, updated_at).

### MVP2-E14-02 · Phone verification and SMS — M
- **AC1:** Adding a phone number sends a 6-digit code using the hand-built code service from E8-03. The number is saved only after verification, in E.164 format.
- **AC2:** SMS goes through Twilio (or AWS SNS, recorded in the decision log), with at most 10 messages per user per day.
- **AC3:** Replying STOP opts the user out and is reflected in their preferences. The SMS says "Reply STOP to opt out".
- **AC4:** SMS never contains file contents or links that work without signing in.
- **Service:** Identity (phone) and Delivery (SMS)
- **API design:**
  - `POST /api/identity/v1/me/phone` (signed in) — Add a phone number; sends a 6-digit code. Body `{phone}` (E.164) → `202`. The code is sent through Delivery `POST /notifications`. Errors: `422`, `429`.
  - `POST /api/identity/v1/me/phone/verify` (signed in) — Verify the phone number. Body `{code}` → `200 {phone, verified_at}`. Errors: `400`, `429` after 5 tries.
  - `DELETE /api/identity/v1/me/phone` (signed in) — Remove my phone number. → `204`. Emits `identity.user.phone_removed`; Delivery turns SMS off.
  - `POST /api/delivery/v1/webhooks/sms` (service) — Inbound SMS webhook: handles STOP opt-outs. Verifies the provider signature → `200`.
- **Database design:** `identity.users` adds phone_e164, phone_verified_at. Codes reuse `identity.login_tokens` (purpose `phone_verify`). `delivery.notification_preferences` adds sms_opted_out_at.

### MVP2-E14-03 · Web push — M
- **AC1:** A service worker and VAPID keys (`web-push` library) power an "Enable notifications" button that asks for browser permission only when I click it.
- **AC2:** Multiple devices per user are supported. Subscriptions that come back 404 or 410 are deleted automatically.
- **AC3:** Works on desktop Chrome and Android Chrome, and on iOS when 01scale.com is added to the home screen (documented with the steps).
- **Service:** Delivery
- **API design:**
  - `GET /api/delivery/v1/push/public-key` (public) — The VAPID public key for web push. → `200 {public_key}`.
  - `POST /api/delivery/v1/push-subscriptions` (signed in) — Register this device for push notifications. Body `{endpoint, keys: {p256dh, auth}, device_name?}` → `201 {subscription}`. Idempotent on `endpoint`.
  - `DELETE /api/delivery/v1/push-subscriptions/{subscriptionId}` (signed in) — Remove a device. → `204`.
- **Database design:** `delivery.push_subscriptions` (id, owner_id, endpoint unique, p256dh, auth, device_name, created_at, last_success_at).

### MVP2-E14-04 · Notification dispatcher and log — M
- **AC1:** One `notify(userId, event, payload)` function sends to every enabled channel. Events are triggered by the server (webhooks or pipeline), never the browser.
- **AC2:** Each attempt is logged per channel (sent, failed, skipped because of preferences) and shown on `/account/notifications`.
- **AC3:** Failures retry up to 3 times. If one channel fails, the others still send.
- **Service:** Delivery
- **API design:**
  - `POST /api/delivery/v1/notifications` (service) — Notify a user about an event on every channel they have enabled. Called by an app's server. Body `{user_id, event, payload, reference}` + `Idempotency-Key` → `202 {notification}`. Replaces direct use of `POST /messages` by apps.
  - `GET /api/delivery/v1/notifications` (signed in) — My notification log: each attempt per channel. Query `cursor`, `limit` → `200 {data: [{event, channel, status: sent|failed|skipped, attempts, created_at}], next_cursor}`.
- **Database design:** `delivery.notifications` (id, owner_id, app, reference, event, channel `email|sms|push`, status `sent|failed|skipped`, attempts, last_error, created_at). MVP1 `delivery.messages` rows are migrated into it.

---

## E15 · Platform gateway (MVP2 "h")
**Goal:** move the platform's protections from hosting settings into the gateway service itself.

### MVP2-E15-01 · Rate limiting built into the gateway — M
Decided by Nikhil on 17 Nov 2026 (issue #21): MVP1 uses Vercel firewall rules; MVP2 builds rate limiting into the gateway service.
As the owner, I want rate limits that are part of the platform's own code, so they are versioned, tested and the same wherever the gateway runs.
- **AC1:** The gateway limits requests per IP (300 a minute), per user (10 changes and 60 reads a minute to begin with, decided on #64, and higher on paid plans, `MVP2-E13-06`) and per API key, with tighter limits on Identity's sign-in endpoints. Values are configuration, not code.
- **AC2:** Over a limit, the answer is `429 rate_limited` with `Retry-After`, and every response carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset`.
- **AC3:** Counters are shared by every running copy of the gateway, so a limit holds across instances.
- **AC4:** The Vercel firewall rules from MVP1 are removed once the gateway's limits are live, and `docs/infra/` says so.
- **AC5:** A test proves a burst over the limit is refused and the window resets.
- **Service:** Gateway
- **API design:** No new endpoints. Adds the `RateLimit-*` response headers and `429 rate_limited` to every route.
- **Database design:** No tables: the gateway holds no data. Counters live in a shared key-value store (for example Upstash Redis); the store is chosen in the story, with its trade-offs in the decision log.

---

## Definition of done for MVP2
- All AC pass; MVP2 evals meet thresholds on the holdout set; the ASVS auth checklist is complete.
- No Cognito dependency left in code or environment variables.
- Demo: passkey sign-in → batch upload of 3 invoices → judge-flagged review → chat fix → enrichment accept → one-tap pay → push + SMS + email notifications.
