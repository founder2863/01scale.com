# PRD — DocFlow MVP1: Upload → Extract → Review → Pay → Deliver

| | |
|---|---|
| Owner | Nikhil Shrivastava |
| Status | Draft |
| Epics | `docs/epics/MVP1-EPICS.md` (E0–E7) |
| Architecture | `docs/architecture/ARCHITECTURE.md` |
| Evals | `docs/evals/EVALS.md` (MVP1 section) |

## 1. Summary
A signed-in user uploads an invoice, Claude extracts structured data with a confidence score per field, the user reviews the fields the system is unsure about, previews the final JSON and CSV, pays, and gets the files by download and email.

**How it is built.** DocFlow is the first app on the 01scale platform. Each step of the journey is an independent platform service (Identity, Upload, LLM Extraction, Human Review, Payment, Delivery) with its own UI, API and MCP tools; DocFlow connects them in order and holds only the process record and the invoice outputs. The same services are meant to be reused by later apps.

## 2. Problem
Small businesses and bookkeepers retype invoice data into spreadsheets and accounting tools by hand. Fully automatic extraction tools either make silent mistakes or demand reviewing every field. People need extraction that is right on the easy fields and honest about the hard ones.

## 3. Why this matters for the portfolio
One journey, assembled from independently released platform services, that shows: managed identity done through open standards (OIDC), secure cloud file handling (S3), LLM extraction with measured quality (evals), human-in-the-loop design, payments with webhooks, and an event-driven delivery workflow.

## 4. Users
- **Primary: "Priya", a bookkeeper** for 3–10 small clients. She processes about 50 invoices a month and wants clean CSVs for her accounting tool, and she doesn't trust tools that hide mistakes.
- **Secondary: a hiring manager** who visits 01scale.com, signs up with a test account and runs the full journey in under 3 minutes.

## 5. Goals and non-goals
**Goals**
1. A new user can go from sign-up to downloaded CSV in under 3 minutes for a clean, single-page invoice.
2. On the eval set, extraction accuracy meets the MVP1 thresholds in `EVALS.md`.
3. At least 90% of wrong fields are flagged for human review, so errors don't slip through silently.
4. Payment, download and email work reliably end to end in Stripe test mode.

**Non-goals (MVP1)**
- Document types other than invoices.
- More than one document per job.
- Hand-built identity (MVP2), saved cards, SMS or push.
- Integrations with accounting tools (QuickBooks, Xero).
- Real money: Stripe stays in test mode.

## 6. Scope
- **Document type:** invoices.
- **Formats:** PDF, PNG, JPG; at most 10 MB and 10 pages.
- **Language:** English. Currencies: any ISO 4217 code.
- **Price:** one fixed price per document (test mode, e.g. $5.00).

## 7. User journey
1. **Sign up / sign in** with Cognito managed login (email + password, verified email). (E1)
2. **Upload** an invoice from the Documents page; it goes straight from the browser to S3. (E2)
3. **Extraction** runs automatically; the page shows progress, then the fields beside a preview of the document. (E3)
4. **Review:** fields with low confidence or failed checks are highlighted; the user accepts, edits or marks each as "not present". (E4)
5. **Results:** final JSON (with metadata) and CSV are shown as a preview; download is locked. (E5)
6. **Pay** with Stripe Checkout. (E6)
7. **Success:** download buttons unlock, and an email with a link to the results is sent. (E7)

## 8. Functional requirements (summary — details in epics)
| Area | Requirement |
|---|---|
| A · Accounts | Sign up, email verification, sign in, sign out, forgot/reset password, account page (profile details, change password, delete account), protected routes |
| B · Upload | Presigned S3 upload with type and size checks, progress UI, document list |
| C · Extraction | Automatic job after upload, Claude call with a strict schema, per-field confidence and source quote, rule validators, status polling, cost and latency logging |
| D · Human review | Review queue of flagged fields, accept/edit/not-present, audit of every change, completion gate |
| E · JSON / CSV | Final JSON with metadata block, CSV export (safe against CSV injection), locked preview, outputs stored in S3 |
| F · Payment | Stripe Checkout, signed webhook, idempotent order updates, cancel/failure states |
| G · Delivery | Success page, entitlement-checked downloads via short-lived links, email with link to results |

## 9. Extraction schema (invoice v1)
`vendor_name`, `vendor_address`, `vendor_tax_id`, `invoice_number`, `invoice_date`, `due_date`, `bill_to_name`, `bill_to_address`, `currency`, `subtotal`, `tax_total`, `total`, `payment_terms`, `line_items[]` (`description`, `quantity`, `unit_price`, `amount`).

Every field returns: `value`, `confidence` (0–1), `source_page`, `source_quote` (exact text from the document, or null if not present).

## 10. Confidence and review policy
- **Final confidence** for a field = the lower of the model's own confidence and the rule-check result (a failed check sets it to 0.3).
- **Rule checks:**
  - Line amounts add up to the subtotal (±0.01).
  - Subtotal + tax = total (±0.01).
  - Dates parse, and the due date is on or after the invoice date.
  - The currency is a valid ISO code.
  - Required fields are present.
  - `source_quote` actually appears in the document's text.
- **Routing:** fields under **0.85** final confidence, or failing a check, go to human review. Thresholds are configurable and tuned using the eval set.
- The model's own confidence is known to be poorly calibrated, which is why rule checks cap it. MVP2 adds an LLM judge.

## 11. Data model (initial)
Summary only. Each service owns its tables in its own schema; another service's record is referenced by ID. The full design, table by table, is in each story's **Database design** and indexed in `docs/architecture/DATABASE-DESIGN.md`. The APIs are indexed in `docs/architecture/API-DESIGN.md`.

| Service | Main tables |
|---|---|
| Identity | `users`, `sessions`, `api_keys` |
| Upload | `files` |
| LLM Extraction | `jobs`, `fields` (the model's output, never edited) |
| Human Review | `tasks`, `fields` (the human's final values), `field_changes` |
| Payment | `orders`, `stripe_events` |
| Delivery | `messages` |
| DocFlow app | `documents` (the process record: file, job, review task and order IDs), `outputs` |
| Every service | `audit_events`, `idempotency_keys`, `outbound_events` |

## 12. Non-functional requirements
- **Security:**
  - S3 bucket private with Block Public Access on and server-side encryption.
  - Presigned URLs expire in ≤5 minutes; files are checked by their content, not just their extension.
  - Tokens are never stored in the browser outside HttpOnly cookies.
  - Stripe webhook signatures are verified.
  - No document contents or PII in logs.
  - Uploaded files are deleted after 30 days (S3 lifecycle rule).
- **Performance:** extraction finishes in under 60 seconds (p95) for invoices of 5 pages or fewer; pages load in under 2 seconds on 4G.
- **Cost:** LLM cost of $0.10 or less per document on average.
- **Accessibility:** works with a keyboard, has visible focus, labelled inputs and WCAG AA contrast.
- **Mobile:** the full journey works on a phone.

## 13. Success metrics
- **Funnel:** signed up → uploaded → extracted → reviewed → paid → downloaded (tracked per step).
- **Quality:** eval metrics in `EVALS.md`, plus the human correction rate per field in production.
- **Ops:** extraction failure rate under 2%, webhook-to-email time under 60 seconds (p95).

## 14. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Model invents values | Schema + `source_quote` must appear in the document text + rule checks + review routing |
| Confidence badly calibrated | Rule-check cap now, LLM judge in MVP2, calibration tracked in evals |
| Long extraction exceeds function time limits | Poll for status; documents capped at 10 pages; move to Lambda in MVP2 |
| Webhook arrives late or twice | Success page polls order status; event-ID idempotency |
| Cognito lock-in | OIDC-only integration inside the Identity service, so MVP2 swaps the provider without any other service or app changing |
| Distributed services cost more to build and run than one app | One service template, serverless hosting, one database project with a schema per service; reasoning in `ARCHITECTURE.md` §7 |
| A step fails between two services | Idempotent calls, events written with the change (outbox), retries, and a process record that can resume |
| Cost overrun | Per-job cost logging, max page cap, monthly budget alert on the Anthropic and AWS accounts |

## 15. Release plan
E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7. Each epic ends with a tagged release (`mvp1-e3`), a 60-second demo clip and an updated portfolio card.

**Demo script:** sign up → upload a sample invoice → watch extraction → fix two flagged fields → preview the JSON/CSV → pay with test card 4242 4242 4242 4242 → download → show the email.

## 16. Open questions
- Price point to display (test mode) — $5 placeholder.
- One CSV with invoice fields repeated per line item, or two CSVs (header + lines)? Default: one CSV; revisit with user feedback.
