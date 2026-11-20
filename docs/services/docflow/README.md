# DocFlow service — developer guide

> **Version 1 · The app that connects the services.** Status: designed, not built. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/json-and-csv-output`.

## What this service is

DocFlow is the first app built from the 01scale platform services. It turns an uploaded invoice into reviewed JSON and CSV, by calling Upload, LLM Extraction, Human Review, Payment and Delivery in order.

It is deliberately thin. It keeps one record per invoice (which file, job, review and order belong together, and where the process is) and builds the invoice-specific results. Everything else is a service it calls.

This page covers DocFlow's own parts: the documents list, the JSON and CSV outputs, checkout, the success page and the downloads.

## Why it exists

| Reason | In plain terms |
|---|---|
| The process lives in one place | The order of steps is written once, in the app, so the services stay unaware of invoices and of each other. |
| The next app is a copy, not a rewrite | Procure-to-Pay would be another thin app calling the same services in a different order. |
| Results people can trust | The JSON is validated against a published schema and carries what was corrected and how sure the system was; the CSV opens cleanly in Excel and cannot run formulas. |

## What is in this version

**In scope**

- The documents list with status and next action
- Starting each service at the right moment, and reacting to their events
- Building `result.json` (with metadata) and `result.csv`, stored through Upload
- Locked preview; downloads only after payment, checked on the server
- Checkout at $5.00 and the success page
- Asking Delivery to email when paid

**Not in this version**

- Batches of documents: `MVP2-E9`, `MVP2-E12`
- Paying with a saved card: `MVP2-E13`
- Anything a service does: it is designed in that service

## How DocFlow connects the services

| Step | Who | What happens |
|---|---|---|
| 1 | DocFlow | Creates the document and Upload's file; after the upload, starts Extraction. |
| 2 | Extraction | Tells DocFlow the job finished (`extraction.job.completed`). |
| 3 | DocFlow | Sends the fields to Review as a task. |
| 4 | DocFlow | When the person completes review: re-checks values with Extraction, completes the Review task, builds the JSON and CSV and stores them through Upload. |
| 5 | DocFlow | At checkout, asks Payment for an order at $5.00. |
| 6 | Payment | Tells DocFlow the order is paid (`payment.order.paid`). |
| 7 | DocFlow | Marks the document paid, asks Delivery for the email, and unlocks downloads. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Process record | DocFlow's one row per invoice: the IDs of its parts in each service, and its status. |
| Reference | `docflow:{document_id}`: how DocFlow labels its jobs, tasks, orders and messages in the services. |
| CSV injection | A cell starting with `=`, `+`, `-` or `@` can run as a formula in a spreadsheet; such cells are prefixed with `'`. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. The CSV's columns

One row per line item, invoice columns repeated on each row: `document_id`, `vendor_name`, `vendor_address`, `vendor_tax_id`, `invoice_number`, `invoice_date`, `due_date`, `bill_to_name`, `bill_to_address`, `currency`, `subtotal`, `tax_total`, `total`, `payment_terms`, `line_number`, `line_description`, `line_quantity`, `line_unit_price`, `line_amount`. An invoice with no line items gives one row with the line columns empty.

```text
document_id,vendor_name,…,line_number,line_description,line_quantity,line_unit_price,line_amount
```

### 2. Unlock only when paid

Every download checks the order on the server.

```ts
const { order } = await payment.get(`/orders/${doc.order_id}`);
if (order.status !== "paid") return problem(402, "payment_required");
```

## Endpoints at a glance

Base address: `https://01scale.com/api/docflow/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `POST` | `/documents` | Signed in | `docflow:write` | Start a document |
| `POST` | `/documents/{documentId}/upload-complete` | Signed in | `docflow:write` | Confirm the upload and start extraction |
| `GET` | `/documents` | Signed in | `docflow:read` | List my documents |
| `GET` | `/documents/{documentId}` | Signed in | `docflow:read` | Get one document |
| `POST` | `/documents/{documentId}/retry-extraction` | Signed in | `docflow:write` | Retry a failed extraction |
| `POST` | `/documents/{documentId}/complete-review` | Signed in | `docflow:write` | Finish review and build the outputs |
| `GET` | `/documents/{documentId}/outputs` | Signed in | `docflow:read` | Which outputs exist |
| `GET` | `/documents/{documentId}/outputs/{format}/preview` | Signed in | `docflow:read` | Preview the JSON or CSV |
| `GET` | `/documents/{documentId}/outputs/{format}/download` | Signed in | `docflow:read` | Download the JSON or CSV |
| `POST` | `/documents/{documentId}/checkout` | Signed in | `docflow:write` | Start payment |
| `GET` | `/stats` | Signed in | `docflow:read` | My DocFlow totals |
| `POST` | `/webhooks/{service}` | Service | None: HMAC signature | Receive service events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `DOCFLOW_DATABASE_URL` | Neon connection string for the `docflow_service` role | Yes |
| `DOCFLOW_PRICE_CENTS` | `500` | No |
| `DOCFLOW_CLIENT_SECRET` | DocFlow's client secret for Identity's `POST /token`, to get delegated tokens (Service access) | Yes |
| `EVENT_ROUTES` | Not needed: DocFlow emits no events. It is the target of `docflow:` routes in every service. | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64 | Yes |

## Open questions

- `MVP1-E5-04` stores outputs under `users/{userId}/{docId}/outputs/`. Through Upload, every key is `users/{owner}/{fileId}/original.{ext}`, built from IDs; the story's path cannot be kept without breaking that rule. I propose changing the story.
- `MVP1-E5-04` AC2 rebuilds outputs 'if the user later edits fields', but Human Review locks values when a review completes. Either reviews can be reopened, or AC2 belongs with the chat corrections of MVP2.
- Where the JSON Schema `schemas/invoice-v1.json` is published (a file in the repository, or also served at an address) is not decided.
