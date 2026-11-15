# MVP2 — Epics and issues

Source: `docs/prd/MVP2-PRD.md`. Evals: `docs/evals/EVALS.md`.
Same conventions as MVP1: one issue per story, AC in Given / When / Then, sizes S / M / L.

---

## E8 · Passwordless identity, built by hand (MVP2 "a")
**Goal:** replace Cognito with our own provider. Libraries allowed: `@node-rs/argon2`, `jose`, `@simplewebauthn/*`, Node `crypto`, Resend. No auth vendors or auth frameworks.

### MVP2-E8-01 · Identity schema and session service — M
- **AC1:** New tables: `auth_identities` (user_id, type email|passkey, identifier), `sessions` (id, user_id, token_hash, created_at, last_seen_at, expires_at, absolute_expires_at, ip_hash, user_agent), `login_tokens` (id, email, token_hash, purpose, expires_at, used_at), `passkeys` (credential_id, user_id, public_key, counter, transports, name, created_at, last_used_at) and `recovery_codes` (user_id, code_hash, used_at).
- **AC2:** Session tokens are 32 random bytes from `crypto.randomBytes`; only the SHA-256 hash is stored. The cookie is `__Host-session`, HttpOnly, Secure, SameSite=Lax.
- **AC3:** Sessions use a 7-day sliding expiry, capped at 30 days, and both are enforced on the server.
- **AC4:** The OIDC client from MVP1 is replaced behind the same `getCurrentUser()` interface, with no changes to page code.

### MVP2-E8-02 · Magic link sign-in and sign-up — M
As Priya, I want to sign in by clicking a link in my email.
- **AC1:** Given I enter an email, then the response is always "Check your email", whether or not an account exists, and takes about the same time either way.
- **AC2:** A token of 32 random bytes is created and only its hash stored, with a 15-minute expiry and single use. The link goes to `/auth/confirm?token=…`.
- **AC3:** The confirm page needs a deliberate "Sign in" click (POST), so email link scanners can't use the token. The token is checked (hash match, not expired, not used), marked used, and a session is created.
- **AC4:** An unknown email creates a new user on first confirmation (sign-up and sign-in are one flow).
- **AC5:** Rate limits: 5 requests per email per hour and 20 per IP per hour, after which the user sees a generic message. `auth.magic_link_requested` and `auth.signin` are audited.

### MVP2-E8-03 · Email one-time code fallback — S
- **AC1:** The same email also has a 6-digit code, valid 10 minutes, stored as a hash.
- **AC2:** A code allows at most 5 tries, then it's invalidated. The comparison is constant-time.
- **AC3:** A code-entry form on the sign-in page supports paste and the phone's one-time-code autofill.

### MVP2-E8-04 · Passkeys: register and sign in — L
- **AC1:** After sign-in, I'm offered "Add a passkey". Registration uses `@simplewebauthn/server` with the relying party ID `01scale.com` and requires user verification.
- **AC2:** "Sign in with passkey" works without typing an email, using browser autofill where supported.
- **AC3:** The signature counter and backup flags are checked and stored. A replayed or invalid assertion is rejected and audited.
- **AC4:** I can name, list and remove passkeys on `/account/security`. Removing one requires re-authentication within the last 5 minutes.
- **AC5:** Tested on iOS Safari, Android Chrome and desktop Chrome, with results recorded in the PR.

### MVP2-E8-05 · Recovery codes — S
- **AC1:** When the first passkey is registered, 10 single-use recovery codes are shown once and stored hashed with argon2.
- **AC2:** A recovery code signs me in, is marked used, and prompts me to add a new passkey.
- **AC3:** I can regenerate codes, which invalidates the old set; this requires re-authentication.

### MVP2-E8-06 · Session management page — S
- **AC1:** `/account/security` lists active sessions with device, approximate location from IP if available, and last active time, with the current one marked.
- **AC2:** I can revoke any session or "Sign out everywhere else". A revoked session is rejected on its next request.

### MVP2-E8-07 · Re-authentication for sensitive actions — S
- **AC1:** Changing email, removing a passkey or payment method, deleting the account and regenerating recovery codes all require proof (passkey or email code) within the last 5 minutes.
- **AC2:** Changing email sends confirmation to the new address and a notice to the old one.

### MVP2-E8-08 · Cognito migration and shutdown — M
- **AC1:** Given an MVP1 user signs in with a magic link to their verified email, then they're matched to their existing `users` row by email and keep all their documents and orders.
- **AC2:** A migration report shows migrated vs not-yet-migrated users.
- **AC3:** After 30 days, Cognito sign-in is turned off, its environment variables are removed, and a decision record `docs/decisions/E8.md` explains the build-vs-buy and migration choices.

### MVP2-E8-09 · Auth security hardening — M
- **AC1:** CSRF protection on all state-changing routes (SameSite plus an origin check).
- **AC2:** Every auth event is audited: requested, succeeded, failed, locked, passkey added/removed, session revoked.
- **AC3:** An OWASP ASVS v4 chapter 2 and 3 checklist (authentication, sessions) is completed in `docs/security/asvs-auth.md`, with each item marked pass, fail or n/a.

---

## E9 · Multi-document support (MVP2 "b") — `llm`
**Goal:** process batches in parallel with a visible, recoverable pipeline.

### MVP2-E9-01 · Batch upload — M
- **AC1:** I can select or drop up to 10 files at once. Each is checked individually (type, size, pages), and rejected ones don't block the others.
- **AC2:** A `batches` row groups the documents, and each document has its own upload progress.

### MVP2-E9-02 · LangGraph orchestrator on Lambda — L
- **AC1:** A Python LangGraph graph `batch_pipeline` (nodes: plan → extract (fan-out) → validate → judge (E10) → aggregate) is deployed on AWS Lambda and triggered from the app through a queue (SQS).
- **AC2:** At most 3 documents run at once. Each document's state is saved after each node, so a retry resumes rather than restarts.
- **AC3:** One document failing doesn't fail the batch: that document is marked `failed` with a retry action, and the rest continue.
- **AC4:** Progress events update the database. The batch status endpoint shows per-document step and status.
- **AC5:** The decision record explains why there's a separate Lambda service rather than an in-app job.

### MVP2-E9-03 · Batch status page — S
- **AC1:** `/batches/{id}` shows each document as a card with its status and step, updating live via polling.
- **AC2:** A summary line reads "8 extracted · 1 needs review · 1 failed".
- **Evals:** MD-1 batch completeness, MD-2 batch latency, MD-3 accuracy in batch vs alone.

---

## E10 · LLM as judge on extraction (MVP2 "c") — `llm`
**Goal:** a second, independent check that catches the extractor's mistakes.

### MVP2-E10-01 · Judge node — L
- **AC1:** For each extracted field, the judge gets the document, the field name and its value (not the extractor's reasoning) and returns `{verdict: correct|incorrect|unsure, reason, evidence_quote}`.
- **AC2:** It uses prompt `prompts/judge-field/v1.md` and a model set separately from the extractor's.
- **AC3:** Calls are batched (several fields per call, grouped by page) to keep the added time to 30% or less.

### MVP2-E10-02 · Combined confidence and routing — M
- **AC1:** Final confidence = a documented formula of model confidence, rule checks and judge verdict (`incorrect` caps it at 0.2, `unsure` at 0.6). The formula is versioned.
- **AC2:** Review routing uses the combined score. The UI shows the judge's reason next to flagged fields.
- **Evals:** JDG-1 judge agreement, JDG-2 routing recall with judge, JDG-3 flag rate, JDG-4 bias checks, JDG-5 added latency.

### MVP2-E10-03 · Judge vs human dashboard — S
- **AC1:** `/admin/quality` shows, for the last 30 days: judge agreement with human decisions, the confusion matrix and the fields the judge most often gets wrong.
- **AC2:** Cases where the judge and the human disagree can be exported as eval candidates.

---

## E11 · Metadata enrichment and chat correction (MVP2 "d") — `llm`
**Goal:** add useful, cited context from the web and let users fix data in plain language, safely.

### MVP2-E11-01 · Research agent — L
- **AC1:** For each document, the agent searches the web (Claude web search tool) using only `vendor_name`, `vendor_address` and `vendor_tax_id` (an allow-list).
- **AC2:** It returns `vendor_website`, `vendor_address_normalized`, `vendor_category` and `vendor_registered` (yes/no/unknown). Each has `source_urls[]` and `retrieved_at`, and a value without a source is dropped.
- **AC3:** Amounts, bill-to details and line items are never included in queries, enforced in code and covered by a unit test.
- **Evals:** ENR-1 citation coverage, ENR-2 accuracy, ENR-3 PII leakage, ENR-4 abstention.

### MVP2-E11-02 · Enrichment review UI — S
- **AC1:** Enrichment appears in a separate "Metadata" panel with source links. Each value can be accepted or rejected.
- **AC2:** Only accepted values go into the output JSON `metadata.enrichment`.

### MVP2-E11-03 · Chat correction agent — L
As Priya, I want to type "line 3 quantity should be 12" and have it fixed.
- **AC1:** A chat panel on the review page sends messages to an agent whose only write tools are `propose_field_update(field, new_value, reason)` and `propose_line_item_update(index, field, new_value, reason)`.
- **AC2:** Proposed changes appear as a diff (old → new) with Apply and Reject buttons. Nothing changes without Apply.
- **AC3:** Applied changes are audited with `source: chat`, rule checks run again, and each can be undone.
- **AC4:** The agent refuses requests outside its scope (e.g. "email this to my boss") and says why.
- **Evals:** CHAT-1 correct application, CHAT-2 no unrequested changes, CHAT-3 scope refusal, CHAT-4 ambiguity handling.

---

## E12 · Multi-document review and outputs (MVP2 "e")
### MVP2-E12-01 · Tabbed review — M
- **AC1:** One tab per document, each with a badge showing flagged fields left. "Next flagged" jumps across tabs.
- **AC2:** "Complete batch review" stays disabled until all documents are resolved; a document can be left out of the batch if it's unwanted.

### MVP2-E12-02 · Batch outputs — M
- **AC1:** Outputs are per-document JSON, `batch.json` (an array with a batch metadata block), `batch.csv` (with a `document_id` column) and `batch.zip` (one CSV per document plus the JSON files).
- **AC2:** The JSON and CSV preview has a tab per document plus a "Combined" tab.
- **AC3:** CSV injection protection and the encoding rules from MVP1-E5-02 also apply here.

---

## E13 · Payments v2 (MVP2 "f")
**Goal:** saved cards, default method and history, without card data touching our servers.

### MVP2-E13-01 · Stripe Customer per user — S
- **AC1:** A Stripe Customer is created the first time a user pays or adds a card, and its ID is stored on `users`.

### MVP2-E13-02 · Save a card — M
- **AC1:** "Add card" on `/account/payment-methods` uses a SetupIntent with Stripe Elements. The card number never reaches our servers (PCI SAQ A scope).
- **AC2:** At checkout, a "Save this card" checkbox is shown (`setup_future_usage`).
- **AC3:** Webhooks `payment_method.attached` and `detached` keep the local list in sync.

### MVP2-E13-03 · Manage payment methods — M
- **AC1:** I can list cards (brand, last 4, expiry), set the default and remove a card. Removal requires re-authentication (E8-07).
- **AC2:** An expired card is shown as expired and can't be the default.

### MVP2-E13-04 · One-tap pay with default card — M
- **AC1:** For a batch, "Pay $X with Visa •• 4242" creates a PaymentIntent with the default card.
- **AC2:** If 3-D Secure is required, the challenge appears in the page and payment completes afterwards (tested with Stripe's 3-D Secure test cards).
- **AC3:** The amount is the number of documents × the unit price, calculated on the server, never taken from the browser.

### MVP2-E13-05 · Payment history — S
- **AC1:** `/account/payments` lists date, batch or document, amount, status and a Stripe receipt link, newest first, paginated.
- **AC2:** Refunded or failed payments show their status clearly.

---

## E14 · Notifications: email, SMS, push (MVP2 "g")
### MVP2-E14-01 · Notification preferences — S
- **AC1:** `/account/notifications` has toggles per channel (email on by default; SMS and push off) and per event (batch extracted, review needed, payment succeeded, files ready).

### MVP2-E14-02 · Phone verification and SMS — M
- **AC1:** Adding a phone number sends a 6-digit code using the hand-built code service from E8-03. The number is saved only after verification, in E.164 format.
- **AC2:** SMS goes through Twilio (or AWS SNS, recorded in the decision log), with at most 10 messages per user per day.
- **AC3:** Replying STOP opts the user out and is reflected in their preferences. The SMS says "Reply STOP to opt out".
- **AC4:** SMS never contains file contents or links that work without signing in.

### MVP2-E14-03 · Web push — M
- **AC1:** A service worker and VAPID keys (`web-push` library) power an "Enable notifications" button that asks for browser permission only when I click it.
- **AC2:** Multiple devices per user are supported. Subscriptions that come back 404 or 410 are deleted automatically.
- **AC3:** Works on desktop Chrome and Android Chrome, and on iOS when 01scale.com is added to the home screen (documented with the steps).

### MVP2-E14-04 · Notification dispatcher and log — M
- **AC1:** One `notify(userId, event, payload)` function sends to every enabled channel. Events are triggered by the server (webhooks or pipeline), never the browser.
- **AC2:** Each attempt is logged per channel (sent, failed, skipped because of preferences) and shown on `/account/notifications`.
- **AC3:** Failures retry up to 3 times. If one channel fails, the others still send.

---

## Definition of done for MVP2
- All AC pass; MVP2 evals meet thresholds on the holdout set; the ASVS auth checklist is complete.
- No Cognito dependency left in code or environment variables.
- Demo: passkey sign-in → batch upload of 3 invoices → judge-flagged review → chat fix → enrichment accept → one-tap pay → push + SMS + email notifications.
