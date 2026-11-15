# MVP1 — Epics and issues

Source: `docs/prd/MVP1-PRD.md`. Evals: `docs/evals/EVALS.md`.
Each story becomes one GitHub issue: `[ID] Title`. Size: S ≈ half a day, M ≈ 1–2 days, L ≈ 3+ days.
Acceptance criteria (AC) use Given / When / Then. A story is done when all its AC pass, tests exist for its logic, and its evals (if any) meet thresholds.

---

## E0 · Foundation
**Goal:** the plumbing every later epic relies on.

### MVP1-E0-01 · Database and migrations — S
As a developer, I want Neon Postgres with Drizzle migrations so the schema evolves safely.
- **AC1:** Given `DATABASE_URL` is set, when the app deploys on Vercel, then pending migrations run before the new version serves traffic.
- **AC2:** Given a test run, when tests use the database, then they run against PGlite with the same migrations and need no network.
- **AC3:** The initial migration creates `users`, `documents`, `extraction_jobs`, `fields`, `orders`, `deliveries` and `audit_events` as in PRD §11.

### MVP1-E0-02 · Audit log — S
As the owner, I want every important event recorded so I can trace what happened.
- **AC1:** A single `audit(actorId, action, target, metadata)` helper writes to `audit_events`.
- **AC2:** The metadata is checked against an allow-list: document contents, tokens and full card or phone numbers are rejected by a unit test.
- **AC3:** Actions are a fixed list (`auth.*`, `document.*`, `review.*`, `order.*`, `delivery.*`).

### MVP1-E0-03 · CI — S
- **AC1:** On every PR, lint, typecheck and unit tests run in GitHub Actions, and the PR can't merge if they fail.
- **AC2:** Given a PR with the label `evals`, the eval workflow runs and posts its summary as a PR comment.

### MVP1-E0-04 · Eval harness skeleton — M
As the owner, I want `npm run eval` so the quality of LLM output is measured, not guessed.
- **AC1:** `npm run eval -- --set dev` runs every case in `evals/datasets/invoices/dev`, compares the output with ground truth and writes `evals/reports/<date>-<prompt-version>.md`.
- **AC2:** The report shows each metric from `EVALS.md` §MVP1 with pass/fail against its threshold, plus cost and latency.
- **AC3:** The command exits non-zero if any MVP1 threshold fails, or if a metric drops more than 2 points from the saved baseline.
- **AC4:** With `--record`, model responses are saved as fixtures, so later runs can use `--replay` without API calls.

---

## E1 · Accounts with AWS Cognito (MVP1 "a")
**Goal:** users can create and manage an account securely, through OIDC so the provider can be swapped in MVP2.

### MVP1-E1-01 · Cognito user pool setup — S
- **AC1:** The user pool uses email as the username, requires a verified email and has a password policy of at least 12 characters with a mix of character types.
- **AC2:** Managed login is enabled and branded with the 01scale name, using an app client with the authorization code flow + PKCE and callback/logout URLs for production and localhost.
- **AC3:** The configuration is documented in `docs/infra/cognito.md`, with screenshots or CLI commands, so it can be rebuilt.

### MVP1-E1-02 · Sign up with email verification — M
As a new user, I want to sign up with my email and password so I can use DocFlow.
- **AC1:** Given I'm signed out, when I choose "Sign up", then I'm taken to Cognito managed login's sign-up screen.
- **AC2:** Given I submit a valid email and password, when Cognito sends a verification code and I enter it, then I land on `/documents` signed in.
- **AC3:** Given I haven't verified my email, then I can't reach any protected page.
- **AC4:** On the first sign-in, a `users` row is created with `cognito_sub` and email, and `auth.signup` is audited.

### MVP1-E1-03 · Sign in and sign out — M
- **AC1:** Sign-in uses the OIDC authorization code flow with PKCE and `state`/`nonce` checks via `openid-client`; a mismatch is rejected.
- **AC2:** After sign-in, the app creates its own session cookie (HttpOnly, Secure, SameSite=Lax). Cognito tokens stay on the server and never reach browser JavaScript.
- **AC3:** Sign-out clears the app session and calls Cognito's logout endpoint, so the next sign-in shows the login form.
- **AC4:** `auth.signin` and `auth.signout` are audited.

### MVP1-E1-04 · Forgot and reset password — S
- **AC1:** Given I choose "Forgot password", when I enter my email, then Cognito sends a reset code. The page says the same thing whether or not the account exists.
- **AC2:** Given a valid code and a new password that meets the policy, then I can sign in with the new password, and my old app sessions are invalidated.

### MVP1-E1-05 · Account page — M
As a user, I want to see and manage my account.
- **AC1:** `/account` shows my email, when I joined, how many documents I've processed and my orders.
- **AC2:** "Change password" goes through Cognito's flow, and I come back to `/account` with a success message.
- **AC3:** "Delete account" requires typing `DELETE`. It then deletes the Cognito user, my S3 objects and my database rows (orders are kept, anonymized, for records) and signs me out. `auth.account_deleted` is audited.

### MVP1-E1-06 · Route protection — S
- **AC1:** Middleware redirects signed-out users from `/documents`, `/review`, `/pay`, `/success` and `/account` to sign-in, and returns them to the page they asked for afterwards.
- **AC2:** API routes return 401 without a valid session and 404 (not 403) for other users' resources, so IDs can't be probed.

---

## E2 · Document upload to S3 (MVP1 "b")
**Goal:** files go from the browser straight to a private S3 bucket, safely.

### MVP1-E2-01 · S3 bucket and IAM — S
- **AC1:** The bucket has Block Public Access on, encryption on (SSE-S3), versioning off and a lifecycle rule that deletes objects after 30 days.
- **AC2:** CORS allows PUT and GET only from `https://01scale.com` and localhost.
- **AC3:** The app's IAM credentials allow only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` and `s3:HeadObject` on this bucket, documented in `docs/infra/s3.md`.

### MVP1-E2-02 · Presigned upload URL — M
- **AC1:** `POST /api/uploads` with `{fileName, mime, size}` returns a presigned PUT URL valid for 5 minutes, with key `users/{userId}/{docId}/original.{ext}`.
- **AC2:** Requests for file types other than PDF/PNG/JPG, or over 10 MB, are rejected with a clear message before any URL is issued.
- **AC3:** A `documents` row is created with status `pending_upload`.

### MVP1-E2-03 · Upload confirmation and checks — S
- **AC1:** `POST /api/uploads/{docId}/complete` confirms the object exists (HeadObject) and its size matches.
- **AC2:** The file's first bytes are checked to confirm the real type. A mismatch, or a PDF over 10 pages, marks the document `rejected` and deletes the object.
- **AC3:** If it passes, the status becomes `uploaded`, extraction is queued (E3) and `document.uploaded` is audited.

### MVP1-E2-04 · Upload page UI — M
As Priya, I want to drag and drop or pick a file on my phone and see progress.
- **AC1:** Drag and drop on desktop and the file picker on mobile both work, including the camera option on phones.
- **AC2:** A progress bar shows upload percentage. On failure I see a retry button and a plain-language error.
- **AC3:** After upload, I'm taken to the document's extraction page automatically.

### MVP1-E2-05 · Documents list — S
- **AC1:** `/documents` lists my documents with name, date, status chip (Uploaded / Extracting / Needs review / Ready to pay / Paid) and a link to the next action.
- **AC2:** Empty state: "Upload your first invoice", with a sample invoice a hiring manager can use.

---

## E3 · Extraction with Claude (MVP1 "c") — `llm`
**Goal:** accurate structured data, with confidence and evidence for every field.

### MVP1-E3-01 · Extraction job lifecycle — M
- **AC1:** A job moves through `queued → processing → extracted | failed`. Each change is stored and visible through `GET /api/documents/{id}/status`.
- **AC2:** Temporary failures (rate limit, timeout, overload) retry up to 2 times with backoff; after that the job is `failed` with a user-friendly message and a "Retry" button.
- **AC3:** Jobs are idempotent: calling extract twice for the same document doesn't create two jobs or bill twice.

### MVP1-E3-02 · Claude extraction call — L
- **AC1:** The document (PDF or image) is sent to Claude as a document or image input along with the versioned prompt `prompts/extract-invoice/v1.md`.
- **AC2:** The output is forced into the invoice v1 schema (PRD §9) with a tool/JSON schema. Every field includes `value`, `confidence`, `source_page` and `source_quote`.
- **AC3:** The model ID and prompt version are read from configuration and saved on the job.
- **AC4:** The response is validated with zod. A schema failure triggers one repair attempt and then fails the job; invalid JSON is never stored.
- **Evals:** EXT-1 schema validity, EXT-2 header field accuracy, EXT-3 line item F1, EXT-4 hallucination rate, EXT-7 latency, EXT-8 cost (see `EVALS.md`).

### MVP1-E3-03 · Rule checks and final confidence — M
- **AC1:** The arithmetic, date, currency, required-field and source-quote checks (PRD §10) run on every extraction.
- **AC2:** Final confidence = the lower of model confidence and rule result (a failed check sets 0.3). Fields under the threshold (default 0.85) or failing a check are marked `flagged`.
- **AC3:** Each flagged field stores the reason ("Total ≠ subtotal + tax", "Quote not found in document").
- **AC4:** Unit tests cover every rule check, including rounding and missing-tax cases.
- **Evals:** EXT-5 routing recall, EXT-6 flag rate.

### MVP1-E3-04 · Extraction page — M
- **AC1:** While processing, the page shows status steps and polls every 2 seconds, without a full-page reload.
- **AC2:** When done, the document preview (rendered PDF page or image) is on the left and the fields on the right, with confidence badges (green ≥ 0.85, amber 0.6–0.85, red < 0.6) and flagged fields highlighted.
- **AC3:** Tapping a field shows its source quote and page. On desktop, the preview jumps to that page.
- **AC4:** A "Review N flagged fields" button goes to E4. If nothing is flagged, "Continue to results" goes to E5.

### MVP1-E3-05 · Cost and latency logging — S
- **AC1:** Each job stores tokens in and out, estimated cost in USD and duration.
- **AC2:** An admin-only page `/admin/jobs` shows the last 100 jobs with these numbers and the failure rate.

---

## E4 · Human review of low-confidence fields (MVP1 "d")
**Goal:** a person checks only what the system is unsure about, quickly, with evidence beside each field.

### MVP1-E4-01 · Review queue — M
- **AC1:** `/documents/{id}/review` lists flagged fields first, ordered by lowest confidence, each with its reason, current value and source quote.
- **AC2:** A counter shows "N of M resolved". Unflagged fields are available under "Show all fields".

### MVP1-E4-02 · Accept, edit or mark not present — M
- **AC1:** Per field, I can accept, edit (with input checks: dates, numbers, currency code) or mark "Not on document".
- **AC2:** Every change stores the original value, the new value, who changed it and when, and audits `review.field_updated`.
- **AC3:** On desktop: Enter accepts, E edits, ↓ moves to the next field. On mobile: large tap targets.

### MVP1-E4-03 · Complete review — S
- **AC1:** "Complete review" stays disabled until every flagged field is resolved.
- **AC2:** On completion, the rule checks run again on the corrected data. If any still fail, I see which ones and can either fix them or confirm "Values are correct as on the document".
- **AC3:** The document status becomes `reviewed`, and I'm taken to results (E5).

### MVP1-E4-04 · Corrections feed the eval set — S
- **AC1:** Each human correction is saved as a candidate eval case (document reference, field, model value, human value) in `eval_candidates`.
- **AC2:** An admin export produces new ground-truth files for `evals/datasets/` after manual approval. Customer documents are never added automatically.

---

## E5 · JSON review, metadata and CSV (MVP1 "e")
**Goal:** clean, trustworthy outputs the user can preview before paying.

### MVP1-E5-01 · Final JSON with metadata — M
- **AC1:** The JSON has `data` (the invoice v1 schema with final values) and `metadata`: `document_id`, `file_name`, `pages`, `model`, `prompt_version`, `extracted_at`, `reviewed_at`, `reviewed_by`, `fields_flagged`, `fields_corrected`, and per-field `confidence` and `corrected` flags.
- **AC2:** The output is validated against a published JSON Schema in `schemas/invoice-v1.json`.
- **AC3:** The JSON preview has syntax highlighting and folding, and works on mobile.

### MVP1-E5-02 · CSV export — S
- **AC1:** One row per line item, with invoice-level columns repeated on each row; the header order is documented.
- **AC2:** Quoting follows RFC 4180, with UTF-8 encoding and a BOM so Excel opens it correctly.
- **AC3:** Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` (CSV injection protection), with a unit test.
- **AC4:** An invoice with no line items gives one row with empty line columns.

### MVP1-E5-03 · Locked preview — S
- **AC1:** Before payment, I can see a full preview of both outputs on screen, but download buttons show "Pay to download".
- **AC2:** The download endpoints return 402 until the order is paid, enforced on the server.

### MVP1-E5-04 · Store outputs — S
- **AC1:** On review completion, `result.json` and `result.csv` are written to `users/{userId}/{docId}/outputs/`.
- **AC2:** If the user later edits fields, the outputs are regenerated and the version increments.

---

## E6 · Payment (MVP1 "f")
**Goal:** a reliable, secure one-time payment per document.

### MVP1-E6-01 · Checkout session — M
- **AC1:** "Pay $5.00" creates a Stripe Checkout session in test mode with `metadata.order_id`, and success/cancel URLs back to the app.
- **AC2:** An `orders` row is created with status `pending`. Clicking twice reuses the open session instead of creating a duplicate order.
- **AC3:** A banner says "Test mode — use card 4242 4242 4242 4242, any future date, any CVC".

### MVP1-E6-02 · Webhook — M
- **AC1:** `POST /api/webhooks/stripe` verifies the Stripe signature and rejects invalid ones with 400.
- **AC2:** On `checkout.session.completed`, the order becomes `paid`, and `order.paid` is audited.
- **AC3:** The handler is idempotent: an event ID already processed returns 200 without changing anything again.
- **AC4:** Also handles `checkout.session.expired` (order becomes `expired`) and async payment failure (order becomes `failed`).

### MVP1-E6-03 · Payment page and states — S
- **AC1:** `/documents/{id}/pay` shows an order summary: document name, number of fields, price.
- **AC2:** Cancel returns here with "Payment cancelled — you haven't been charged" and a retry button.
- **AC3:** A document that's already paid skips straight to success (E7).

---

## E7 · Success, download and email (MVP1 "g")
**Goal:** the user gets their files immediately and has a record by email.

### MVP1-E7-01 · Success page — M
- **AC1:** On return from Stripe, the page polls the order status (up to 30 seconds) and shows "Confirming payment…" until the webhook marks it paid.
- **AC2:** Once paid, the "Download JSON" and "Download CSV" buttons work.
- **AC3:** If confirmation takes over 30 seconds, it says "We'll email you when it's ready", and the email still arrives.

### MVP1-E7-02 · Secure downloads — S
- **AC1:** Each download checks on the server that the user owns the document and the order is paid, then redirects to a presigned GET URL valid for 5 minutes, with the right filename.
- **AC2:** `delivery.downloaded` is audited.

### MVP1-E7-03 · Email delivery — M
- **AC1:** When the order is paid (triggered by the webhook, not the browser), an email is sent via Resend within 60 seconds. It contains the document name, amount paid and a link to `/documents/{id}/success`, not a raw S3 link.
- **AC2:** A send failure retries 3 times with backoff and records `deliveries.status`. A permanent failure shows "Email couldn't be sent" on the success page.
- **AC3:** The email passes SPF/DKIM for the sending domain (Resend domain verification for 01scale.com), with plain-text and HTML versions.

---

## Definition of done for MVP1
- All stories pass their AC; E3 and E4 evals meet `EVALS.md` MVP1 thresholds on the holdout set.
- The demo script in PRD §15 runs end to end on a phone in under 3 minutes.
- README roadmap updated, release `mvp1` tagged, demo clip on the 01scale.com card.
