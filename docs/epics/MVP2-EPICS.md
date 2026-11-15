# MVP2 — Epics and issues

Source: `docs/prd/MVP2-PRD.md`. Evals: `docs/evals/EVALS.md`.
Same conventions as MVP1: one issue per story, AC in Given / When / Then, sizes S / M / L. Every story carries an **API design** and a **Database design**; shared rules are in `docs/architecture/API-DESIGN.md` and `docs/architecture/DATABASE-DESIGN.md`.

---

## E8 · Passwordless identity, built by hand (MVP2 "a")
**Goal:** replace Cognito with our own provider. Libraries allowed: `@node-rs/argon2`, `jose`, `@simplewebauthn/*`, Node `crypto`, Resend. No auth vendors or auth frameworks.

### MVP2-E8-01 · Identity schema and session service — M
- **AC1:** New tables: `auth_identities` (user_id, type email|passkey, identifier), `sessions` (id, user_id, token_hash, created_at, last_seen_at, expires_at, absolute_expires_at, ip_hash, user_agent), `login_tokens` (id, email, token_hash, purpose, expires_at, used_at), `passkeys` (credential_id, user_id, public_key, counter, transports, name, created_at, last_used_at) and `recovery_codes` (user_id, code_hash, used_at).
- **AC2:** Session tokens are 32 random bytes from `crypto.randomBytes`; only the SHA-256 hash is stored. The cookie is `__Host-session`, HttpOnly, Secure, SameSite=Lax.
- **AC3:** Sessions use a 7-day sliding expiry, capped at 30 days, and both are enforced on the server.
- **AC4:** The OIDC client from MVP1 is replaced behind the same `getCurrentUser()` interface, with no changes to page code.
- **API design:** No new endpoints. `GET /api/v1/session` keeps its MVP1 response shape; `GET /api/v1/auth/login` and `/auth/callback` are removed in E8-08.
- **Database design:** New: `auth_identities`, `login_tokens`, `passkeys`, `recovery_codes` as listed in AC1. `sessions` (from MVP1-E1-03) gains last_seen_at, absolute_expires_at, ip_hash, user_agent, reauthenticated_at. `users.cognito_sub` becomes nullable.

### MVP2-E8-02 · Magic link sign-in and sign-up — M
As Priya, I want to sign in by clicking a link in my email.
- **AC1:** Given I enter an email, then the response is always "Check your email", whether or not an account exists, and takes about the same time either way.
- **AC2:** A token of 32 random bytes is created and only its hash stored, with a 15-minute expiry and single use. The link goes to `/auth/confirm?token=…`.
- **AC3:** The confirm page needs a deliberate "Sign in" click (POST), so email link scanners can't use the token. The token is checked (hash match, not expired, not used), marked used, and a session is created.
- **AC4:** An unknown email creates a new user on first confirmation (sign-up and sign-in are one flow).
- **AC5:** Rate limits: 5 requests per email per hour and 20 per IP per hour, after which the user sees a generic message. `auth.magic_link_requested` and `auth.signin` are audited.
- **API design:**
  - `POST /api/v1/auth/magic-links` (public) — Request a sign-in email. Always answers the same way. Body `{email, return_to?}` → `202 {message: "Check your email"}` whether or not the account exists, in constant time. Errors: `429` (generic).
  - `POST /api/v1/auth/magic-links/confirm` (public) — Exchange a magic-link token for a session (deliberate POST). Body `{token}` → `200 {user, return_to}` with the session cookie set. Errors: `400` invalid, expired or used token (one message for all three).
- **Database design:** Uses `login_tokens` (purpose `magic_link`). `rate_limits` (key, window_start, count; primary key (key, window_start)) backs the per-email and per-IP limits.

### MVP2-E8-03 · Email one-time code fallback — S
- **AC1:** The same email also has a 6-digit code, valid 10 minutes, stored as a hash.
- **AC2:** A code allows at most 5 tries, then it's invalidated. The comparison is constant-time.
- **AC3:** A code-entry form on the sign-in page supports paste and the phone's one-time-code autofill.
- **API design:**
  - `POST /api/v1/auth/email-codes/verify` (public) — Sign in with the 6-digit code from the same email. Body `{email, code}` → `200 {user}` with the session cookie set. Errors: `400` wrong or expired code, `429` after 5 tries.
- **Database design:** `login_tokens` adds code_hash, attempts (purpose `email_code`).

### MVP2-E8-04 · Passkeys: register and sign in — L
- **AC1:** After sign-in, I'm offered "Add a passkey". Registration uses `@simplewebauthn/server` with the relying party ID `01scale.com` and requires user verification.
- **AC2:** "Sign in with passkey" works without typing an email, using browser autofill where supported.
- **AC3:** The signature counter and backup flags are checked and stored. A replayed or invalid assertion is rejected and audited.
- **AC4:** I can name, list and remove passkeys on `/account/security`. Removing one requires re-authentication within the last 5 minutes.
- **AC5:** Tested on iOS Safari, Android Chrome and desktop Chrome, with results recorded in the PR.
- **API design:**
  - `POST /api/v1/passkeys/registration-options` (signed in) — WebAuthn options to register a new passkey. → `200` PublicKeyCredentialCreationOptions; the challenge is stored server-side for 5 minutes.
  - `POST /api/v1/passkeys` (signed in) — Verify the registration and save the passkey. Body `{name, response}` → `201 {passkey, recovery_codes?}` (codes only with the first passkey). Errors: `400` verification failed.
  - `GET /api/v1/passkeys` (signed in) — List my passkeys. → `200 {data: [{id, name, created_at, last_used_at, backed_up}]}`.
  - `PATCH /api/v1/passkeys/{passkeyId}` (signed in) — Rename a passkey. Body `{name}` → `200 {passkey}`.
  - `DELETE /api/v1/passkeys/{passkeyId}` (signed in) — Remove a passkey (needs recent re-authentication). → `204`. Errors: `403` with `code: reauthentication_required`.
  - `POST /api/v1/auth/passkeys/authentication-options` (public) — WebAuthn options to sign in with a passkey (no email needed). → `200` PublicKeyCredentialRequestOptions with an empty allow-list (discoverable credentials).
  - `POST /api/v1/auth/passkeys/verify` (public) — Verify a passkey assertion and create a session. Body `{response}` → `200 {user}` with the session cookie set. Errors: `400` invalid or replayed assertion (audited).
- **Database design:** Uses `passkeys`; adds backed_up boolean, backup_eligible boolean. `webauthn_challenges` (id, user_id null, challenge, purpose, expires_at).

### MVP2-E8-05 · Recovery codes — S
- **AC1:** When the first passkey is registered, 10 single-use recovery codes are shown once and stored hashed with argon2.
- **AC2:** A recovery code signs me in, is marked used, and prompts me to add a new passkey.
- **AC3:** I can regenerate codes, which invalidates the old set; this requires re-authentication.
- **API design:**
  - `POST /api/v1/recovery-codes` (signed in) — Regenerate recovery codes; the old set stops working. → `201 {codes[10]}`, shown once. Needs recent re-authentication.
  - `POST /api/v1/auth/recovery-codes/verify` (public) — Sign in with a single-use recovery code. Body `{email, code}` → `200 {user, prompt: "add_passkey"}`. Errors: `400`, `429`.
- **Database design:** Uses `recovery_codes`; a regenerate deletes the user's old rows in the same transaction.

### MVP2-E8-06 · Session management page — S
- **AC1:** `/account/security` lists active sessions with device, approximate location from IP if available, and last active time, with the current one marked.
- **AC2:** I can revoke any session or "Sign out everywhere else". A revoked session is rejected on its next request.
- **API design:**
  - `GET /api/v1/sessions` (signed in) — List my active sessions with device and last active time. → `200 {data: [{id, device, approx_location?, last_seen_at, current}]}`.
  - `DELETE /api/v1/sessions/{sessionId}` (signed in) — Revoke one session. → `204`.
  - `DELETE /api/v1/sessions` (signed in) — Sign out everywhere else. → `200 {revoked}`; the current session is kept.
- **Database design:** No schema change; reads `sessions`.

### MVP2-E8-07 · Re-authentication for sensitive actions — S
- **AC1:** Changing email, removing a passkey or payment method, deleting the account and regenerating recovery codes all require proof (passkey or email code) within the last 5 minutes.
- **AC2:** Changing email sends confirmation to the new address and a notice to the old one.
- **API design:**
  - `POST /api/v1/auth/reauthentication` (signed in) — Start re-authentication for a sensitive action. Body `{method: passkey|email_code}` → `200` WebAuthn options, or `202` after sending a code.
  - `POST /api/v1/auth/reauthentication/verify` (signed in) — Finish re-authentication; valid for 5 minutes. Body `{response}` or `{code}` → `200 {reauthenticated_until}`.
  - `POST /api/v1/me/email-change` (signed in) — Ask to change my email (confirmation goes to the new address). Body `{new_email}` → `202`. Needs recent re-authentication. A notice goes to the old address.
  - `POST /api/v1/me/email-change/confirm` (signed in) — Confirm the new email address. Body `{token}` → `200 {user}`.
- **Database design:** `sessions.reauthenticated_at`. `email_changes` (id, user_id, new_email, token_hash, expires_at, confirmed_at).

### MVP2-E8-08 · Cognito migration and shutdown — M
- **AC1:** Given an MVP1 user signs in with a magic link to their verified email, then they're matched to their existing `users` row by email and keep all their documents and orders.
- **AC2:** A migration report shows migrated vs not-yet-migrated users.
- **AC3:** After 30 days, Cognito sign-in is turned off, its environment variables are removed, and a decision record `docs/decisions/E8.md` explains the build-vs-buy and migration choices.
- **API design:**
  - `GET /api/v1/admin/migration-report` (admin) — Users migrated from Cognito vs not yet migrated. → `200 {migrated, pending, cutoff_at}`.
- **Database design:** `users` adds migrated_at. After cutoff, a migration drops `users.cognito_sub`.

### MVP2-E8-09 · Auth security hardening — M
- **AC1:** CSRF protection on all state-changing routes (SameSite plus an origin check).
- **AC2:** Every auth event is audited: requested, succeeded, failed, locked, passkey added/removed, session revoked.
- **AC3:** An OWASP ASVS v4 chapter 2 and 3 checklist (authentication, sessions) is completed in `docs/security/asvs-auth.md`, with each item marked pass, fail or n/a.
- **API design:** No new endpoints. Every state-changing route checks the `Origin` header when authenticated by cookie; API-key requests are exempt from CSRF checks because they carry no ambient credentials.
- **Database design:** No schema change.

---

## E9 · Multi-document support (MVP2 "b") — `llm`
**Goal:** process batches in parallel with a visible, recoverable pipeline.

### MVP2-E9-01 · Batch upload — M
- **AC1:** I can select or drop up to 10 files at once. Each is checked individually (type, size, pages), and rejected ones don't block the others.
- **AC2:** A `batches` row groups the documents, and each document has its own upload progress.
- **API design:**
  - `POST /api/v1/batches` (signed in) — Create a batch of up to 10 documents; each file is checked on its own. Body `{files: [{file_name, mime, size}]}` → `201 {batch, documents: [{document, upload} | {file_name, rejected_reason}]}`. Supports `Idempotency-Key`.
  - `POST /api/v1/batches/{batchId}/process` (signed in) — Start the pipeline once the uploads are confirmed. → `202 {batch}`; queues one message on SQS. Idempotent. Errors: `409` if no document is `uploaded`.
- **Database design:** `batches` (id, user_id → users, status `uploading|processing|needs_review|reviewed|paid|failed`, created_at). `documents` adds batch_id → batches null, excluded boolean default false.

### MVP2-E9-02 · LangGraph orchestrator on Lambda — L
- **AC1:** A Python LangGraph graph `batch_pipeline` (nodes: plan → extract (fan-out) → validate → judge (E10) → aggregate) is deployed on AWS Lambda and triggered from the app through a queue (SQS).
- **AC2:** At most 3 documents run at once. Each document's state is saved after each node, so a retry resumes rather than restarts.
- **AC3:** One document failing doesn't fail the batch: that document is marked `failed` with a retry action, and the rest continue.
- **AC4:** Progress events update the database. The batch status endpoint shows per-document step and status.
- **AC5:** The decision record explains why there's a separate Lambda service rather than an in-app job.
- **API design:**
  - `POST /api/v1/internal/pipeline-events` (service) — Progress events from the Lambda pipeline. HMAC-signed body `{event_id, batch_id, document_id, node, status, payload}` → `200`. Idempotent on `event_id`. Errors: `401` bad signature.
  - The Lambda pipeline writes progress only through this endpoint; it has no database credentials. A failed document is retried with `POST /api/v1/documents/{documentId}/extraction` (MVP1-E3-01).
- **Database design:** `pipeline_runs` (id, batch_id, document_id, node, status, state jsonb, attempt, updated_at) stores per-node checkpoints so a retry resumes. `pipeline_events` (event_id primary key, received_at) gives idempotency.

### MVP2-E9-03 · Batch status page — S
- **AC1:** `/batches/{id}` shows each document as a card with its status and step, updating live via polling.
- **AC2:** A summary line reads "8 extracted · 1 needs review · 1 failed".
- **Evals:** MD-1 batch completeness, MD-2 batch latency, MD-3 accuracy in batch vs alone.
- **API design:**
  - `GET /api/v1/batches` (signed in) — List my batches. Query `cursor`, `limit` → `200 {data: [Batch], next_cursor}`.
  - `GET /api/v1/batches/{batchId}` (signed in) — Batch status with each document's step and status. → `200 {batch, documents: [{id, file_name, step, status}], summary: {extracted, needs_review, failed}}`.
- **Database design:** No schema change.

---

## E10 · LLM as judge on extraction (MVP2 "c") — `llm`
**Goal:** a second, independent check that catches the extractor's mistakes.

### MVP2-E10-01 · Judge node — L
- **AC1:** For each extracted field, the judge gets the document, the field name and its value (not the extractor's reasoning) and returns `{verdict: correct|incorrect|unsure, reason, evidence_quote}`.
- **AC2:** It uses prompt `prompts/judge-field/v1.md` and a model set separately from the extractor's.
- **AC3:** Calls are batched (several fields per call, grouped by page) to keep the added time to 30% or less.
- **API design:** No new endpoints; the judge is a pipeline node.
- **Database design:** `field_judgements` (id, field_id → fields, verdict `correct|incorrect|unsure`, reason, evidence_quote, model, prompt_version, created_at).

### MVP2-E10-02 · Combined confidence and routing — M
- **AC1:** Final confidence = a documented formula of model confidence, rule checks and judge verdict (`incorrect` caps it at 0.2, `unsure` at 0.6). The formula is versioned.
- **AC2:** Review routing uses the combined score. The UI shows the judge's reason next to flagged fields.
- **Evals:** JDG-1 judge agreement, JDG-2 routing recall with judge, JDG-3 flag rate, JDG-4 bias checks, JDG-5 added latency.
- **API design:** No new endpoints. `Field` gains `judge: {verdict, reason, evidence_quote}` and `confidence_version`.
- **Database design:** `fields` adds confidence_version; `confidence` now holds the combined score.

### MVP2-E10-03 · Judge vs human dashboard — S
- **AC1:** `/admin/quality` shows, for the last 30 days: judge agreement with human decisions, the confusion matrix and the fields the judge most often gets wrong.
- **AC2:** Cases where the judge and the human disagree can be exported as eval candidates.
- **API design:**
  - `GET /api/v1/admin/quality` (admin) — Judge vs human: agreement, confusion matrix, weakest fields (30 days). Query `days` → `200 {agreement_rate, confusion_matrix, worst_fields[]}`.
  - `POST /api/v1/admin/quality/export` (admin) — Export judge/human disagreements as eval candidates. → `201 {created}` rows in `eval_candidates`.
- **Database design:** No new tables; aggregates `field_judgements` against `field_changes`.

---

## E11 · Metadata enrichment and chat correction (MVP2 "d") — `llm`
**Goal:** add useful, cited context from the web and let users fix data in plain language, safely.

### MVP2-E11-01 · Research agent — L
- **AC1:** For each document, the agent searches the web (Claude web search tool) using only `vendor_name`, `vendor_address` and `vendor_tax_id` (an allow-list).
- **AC2:** It returns `vendor_website`, `vendor_address_normalized`, `vendor_category` and `vendor_registered` (yes/no/unknown). Each has `source_urls[]` and `retrieved_at`, and a value without a source is dropped.
- **AC3:** Amounts, bill-to details and line items are never included in queries, enforced in code and covered by a unit test.
- **Evals:** ENR-1 citation coverage, ENR-2 accuracy, ENR-3 PII leakage, ENR-4 abstention.
- **API design:** No new endpoints; the research agent is a pipeline node. Results are read in E11-02.
- **Database design:** `enrichments` (id, document_id → documents, name, value jsonb, source_urls text[] not empty, retrieved_at, decision `pending|accepted|rejected`, decided_at).

### MVP2-E11-02 · Enrichment review UI — S
- **AC1:** Enrichment appears in a separate "Metadata" panel with source links. Each value can be accepted or rejected.
- **AC2:** Only accepted values go into the output JSON `metadata.enrichment`.
- **API design:**
  - `GET /api/v1/documents/{documentId}/enrichment` (signed in) — Web-sourced vendor metadata with citations. → `200 {data: [{id, name, value, source_urls[], retrieved_at, decision}]}`.
  - `PATCH /api/v1/documents/{documentId}/enrichment/{enrichmentId}` (signed in) — Accept or reject one enrichment value. Body `{decision: accepted|rejected}` → `200 {enrichment}`.
- **Database design:** No new tables; sets `enrichments.decision`.

### MVP2-E11-03 · Chat correction agent — L
As Priya, I want to type "line 3 quantity should be 12" and have it fixed.
- **AC1:** A chat panel on the review page sends messages to an agent whose only write tools are `propose_field_update(field, new_value, reason)` and `propose_line_item_update(index, field, new_value, reason)`.
- **AC2:** Proposed changes appear as a diff (old → new) with Apply and Reject buttons. Nothing changes without Apply.
- **AC3:** Applied changes are audited with `source: chat`, rule checks run again, and each can be undone.
- **AC4:** The agent refuses requests outside its scope (e.g. "email this to my boss") and says why.
- **Evals:** CHAT-1 correct application, CHAT-2 no unrequested changes, CHAT-3 scope refusal, CHAT-4 ambiguity handling.
- **API design:**
  - `GET /api/v1/documents/{documentId}/chat/messages` (signed in) — The correction chat history for a document. → `200 {data: [Message]}`.
  - `POST /api/v1/documents/{documentId}/chat/messages` (signed in) — Ask the correction agent to fix data in plain language. Body `{text}` → `201 {message, proposals: [{id, field, old_value, new_value, reason}]}`. Nothing changes until a proposal is applied.
  - `POST /api/v1/documents/{documentId}/proposals/{proposalId}/apply` (signed in) — Apply a proposed change. → `200 {field, checks}`; audited with `source: chat`. Errors: `409` if the field changed since the proposal.
  - `POST /api/v1/documents/{documentId}/proposals/{proposalId}/reject` (signed in) — Reject a proposed change. → `200 {proposal}`.
  - `POST /api/v1/documents/{documentId}/proposals/{proposalId}/undo` (signed in) — Undo an applied change. → `200 {field}`. Errors: `409` if the field was edited again afterwards.
- **Database design:** `chat_messages` (id, document_id, user_id, role `user|assistant`, text, created_at). `field_proposals` (id, document_id, message_id, field_id, old_value jsonb, new_value jsonb, reason, status `proposed|applied|rejected|undone`, applied_change_id → field_changes).

---

## E12 · Multi-document review and outputs (MVP2 "e")
### MVP2-E12-01 · Tabbed review — M
- **AC1:** One tab per document, each with a badge showing flagged fields left. "Next flagged" jumps across tabs.
- **AC2:** "Complete batch review" stays disabled until all documents are resolved; a document can be left out of the batch if it's unwanted.
- **API design:**
  - `GET /api/v1/batches/{batchId}/review` (signed in) — Review state across a batch: flagged fields left per document. → `200 {documents: [{id, file_name, flagged_remaining, excluded}], next_flagged: {document_id, field_id}?, can_complete}`.
  - `PATCH /api/v1/batches/{batchId}/documents/{documentId}` (signed in) — Leave a document out of the batch (or put it back). Body `{excluded: boolean}` → `200 {document}`.
  - `POST /api/v1/batches/{batchId}/review/complete` (signed in) — Complete the batch review. → `200 {batch}`. Errors: `409` with `unresolved_documents[]`.
- **Database design:** No new tables; uses `documents.excluded` and `batches.status`.

### MVP2-E12-02 · Batch outputs — M
- **AC1:** Outputs are per-document JSON, `batch.json` (an array with a batch metadata block), `batch.csv` (with a `document_id` column) and `batch.zip` (one CSV per document plus the JSON files).
- **AC2:** The JSON and CSV preview has a tab per document plus a "Combined" tab.
- **AC3:** CSV injection protection and the encoding rules from MVP1-E5-02 also apply here.
- **API design:**
  - `GET /api/v1/batches/{batchId}/outputs` (signed in) — The outputs available for a batch. → `200 {version, locked, formats: ["json", "csv", "zip"]}`.
  - `GET /api/v1/batches/{batchId}/outputs/{format}/preview` (signed in) — Preview the combined JSON or CSV. `format = json|csv` → `200` inline content.
  - `GET /api/v1/batches/{batchId}/outputs/{format}/download` (signed in) — Download batch.json, batch.csv or batch.zip. → `302` to a presigned URL. Errors: `402` until paid.
- **Database design:** `outputs` adds batch_id null, zip_s3_key; a batch output row has `document_id` null.

---

## E13 · Payments v2 (MVP2 "f")
**Goal:** saved cards, default method and history, without card data touching our servers.

### MVP2-E13-01 · Stripe Customer per user — S
- **AC1:** A Stripe Customer is created the first time a user pays or adds a card, and its ID is stored on `users`.
- **API design:** No endpoints.
- **Database design:** `users` adds stripe_customer_id unique.

### MVP2-E13-02 · Save a card — M
- **AC1:** "Add card" on `/account/payment-methods` uses a SetupIntent with Stripe Elements. The card number never reaches our servers (PCI SAQ A scope).
- **AC2:** At checkout, a "Save this card" checkbox is shown (`setup_future_usage`).
- **AC3:** Webhooks `payment_method.attached` and `detached` keep the local list in sync.
- **API design:**
  - `POST /api/v1/payment-methods/setup-intents` (signed in) — Start saving a card (Stripe SetupIntent). → `201 {client_secret}` for Stripe Elements; the card number never reaches our servers.
  - `payment_method.attached` and `detached` arrive on `POST /api/v1/webhooks/stripe` (MVP1-E6-02).
- **Database design:** `payment_methods` (id, user_id → users, stripe_payment_method_id unique, brand, last4, exp_month, exp_year, is_default, created_at). No card number or CVC is ever stored.

### MVP2-E13-03 · Manage payment methods — M
- **AC1:** I can list cards (brand, last 4, expiry), set the default and remove a card. Removal requires re-authentication (E8-07).
- **AC2:** An expired card is shown as expired and can't be the default.
- **API design:**
  - `GET /api/v1/payment-methods` (signed in) — List my saved cards. → `200 {data: [{id, brand, last4, exp_month, exp_year, is_default, expired}]}`.
  - `PATCH /api/v1/payment-methods/{paymentMethodId}` (signed in) — Make a card the default. Body `{is_default: true}` → `200 {payment_method}`. Errors: `409` if the card is expired.
  - `DELETE /api/v1/payment-methods/{paymentMethodId}` (signed in) — Remove a saved card (needs recent re-authentication). → `204`. Errors: `403` with `code: reauthentication_required`.
- **Database design:** Partial unique index on `payment_methods(user_id)` where is_default allows one default per user.

### MVP2-E13-04 · One-tap pay with default card — M
- **AC1:** For a batch, "Pay $X with Visa •• 4242" creates a PaymentIntent with the default card.
- **AC2:** If 3-D Secure is required, the challenge appears in the page and payment completes afterwards (tested with Stripe's 3-D Secure test cards).
- **AC3:** The amount is the number of documents × the unit price, calculated on the server, never taken from the browser.
- **API design:**
  - `POST /api/v1/payments` (signed in) — Pay for a batch or document with a saved card. Body `{batch_id | document_id, payment_method_id?}` + `Idempotency-Key` → `201 {payment, requires_action, client_secret?}`. The amount is computed on the server.
- **Database design:** `payments` (id, user_id, batch_id null, document_id null, stripe_payment_intent_id unique, payment_method_id, amount, currency, status `requires_action|processing|succeeded|failed|refunded`, receipt_url, created_at). MVP1 `orders` remain for single-document Checkout.

### MVP2-E13-05 · Payment history — S
- **AC1:** `/account/payments` lists date, batch or document, amount, status and a Stripe receipt link, newest first, paginated.
- **AC2:** Refunded or failed payments show their status clearly.
- **API design:**
  - `GET /api/v1/payments` (signed in) — Payment history, newest first. Query `cursor`, `limit` → `200 {data: [{id, created_at, batch_id?, document_id?, amount, currency, status, receipt_url}], next_cursor}`.
- **Database design:** No schema change; index `payments(user_id, created_at desc)`.

---

## E14 · Notifications: email, SMS, push (MVP2 "g")
### MVP2-E14-01 · Notification preferences — S
- **AC1:** `/account/notifications` has toggles per channel (email on by default; SMS and push off) and per event (batch extracted, review needed, payment succeeded, files ready).
- **API design:**
  - `GET /api/v1/notification-preferences` (signed in) — My notification settings per channel and event. → `200 {channels: {email, sms, push}, events: {batch_extracted, review_needed, payment_succeeded, files_ready}}`.
  - `PUT /api/v1/notification-preferences` (signed in) — Replace my notification settings. Body as above → `200`. Errors: `409` enabling SMS without a verified phone.
- **Database design:** `notification_preferences` (user_id primary key, email boolean default true, sms boolean default false, push boolean default false, events jsonb, updated_at).

### MVP2-E14-02 · Phone verification and SMS — M
- **AC1:** Adding a phone number sends a 6-digit code using the hand-built code service from E8-03. The number is saved only after verification, in E.164 format.
- **AC2:** SMS goes through Twilio (or AWS SNS, recorded in the decision log), with at most 10 messages per user per day.
- **AC3:** Replying STOP opts the user out and is reflected in their preferences. The SMS says "Reply STOP to opt out".
- **AC4:** SMS never contains file contents or links that work without signing in.
- **API design:**
  - `POST /api/v1/me/phone` (signed in) — Add a phone number; sends a 6-digit code. Body `{phone}` (E.164) → `202`. Errors: `422`, `429`.
  - `POST /api/v1/me/phone/verify` (signed in) — Verify the phone number. Body `{code}` → `200 {phone, verified_at}`. Errors: `400`, `429` after 5 tries.
  - `DELETE /api/v1/me/phone` (signed in) — Remove my phone number and turn SMS off. → `204`.
  - `POST /api/v1/webhooks/sms` (service) — Inbound SMS webhook: handles STOP opt-outs. Verifies the provider signature → `200`.
- **Database design:** `users` adds phone_e164, phone_verified_at, sms_opted_out_at. Codes reuse `login_tokens` (purpose `phone_verify`).

### MVP2-E14-03 · Web push — M
- **AC1:** A service worker and VAPID keys (`web-push` library) power an "Enable notifications" button that asks for browser permission only when I click it.
- **AC2:** Multiple devices per user are supported. Subscriptions that come back 404 or 410 are deleted automatically.
- **AC3:** Works on desktop Chrome and Android Chrome, and on iOS when 01scale.com is added to the home screen (documented with the steps).
- **API design:**
  - `GET /api/v1/push/public-key` (public) — The VAPID public key for web push. → `200 {public_key}`.
  - `POST /api/v1/push-subscriptions` (signed in) — Register this device for push notifications. Body `{endpoint, keys: {p256dh, auth}, device_name?}` → `201 {subscription}`. Idempotent on `endpoint`.
  - `DELETE /api/v1/push-subscriptions/{subscriptionId}` (signed in) — Remove a device. → `204`.
- **Database design:** `push_subscriptions` (id, user_id → users, endpoint unique, p256dh, auth, device_name, created_at, last_success_at).

### MVP2-E14-04 · Notification dispatcher and log — M
- **AC1:** One `notify(userId, event, payload)` function sends to every enabled channel. Events are triggered by the server (webhooks or pipeline), never the browser.
- **AC2:** Each attempt is logged per channel (sent, failed, skipped because of preferences) and shown on `/account/notifications`.
- **AC3:** Failures retry up to 3 times. If one channel fails, the others still send.
- **API design:**
  - `GET /api/v1/notifications` (signed in) — My notification log: each attempt per channel. Query `cursor`, `limit` → `200 {data: [{event, channel, status: sent|failed|skipped, attempts, created_at}], next_cursor}`.
- **Database design:** `notifications` (id, user_id, event, channel `email|sms|push`, status `sent|failed|skipped`, attempts, last_error, created_at). MVP1 `deliveries` rows are migrated into it.

---

## Definition of done for MVP2
- All AC pass; MVP2 evals meet thresholds on the holdout set; the ASVS auth checklist is complete.
- No Cognito dependency left in code or environment variables.
- Demo: passkey sign-in → batch upload of 3 invoices → judge-flagged review → chat fix → enrichment accept → one-tap pay → push + SMS + email notifications.
