# LLM Extraction service — data model

> **Version 1 · One Claude call per document.** Status: in design. Stories: `MVP1-E3-01`, `MVP1-E3-02`, `MVP1-E3-03`, `MVP1-E3-04`, `MVP1-E3-05`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Job | `extraction.jobs` | One attempt to read one file into fields. | Belongs to one user and one file, both by ID only. Has many fields. |
| Field | `extraction.fields` | One value read from the document, with its confidence and evidence. | Belongs to one job; deleted with it. |
| Processed event | `extraction.inbound_events` | A platform event already acted on. | Stands alone. |
| Prompt | (file `prompts/extract-invoice/v1.md`) | The versioned instructions sent to the model. | Named on each job by `prompt_version`. A changed prompt is a new version with its own eval report. |

## Life of each record

| Record | Life |
|---|---|
| Job | `queued` when asked for → `processing` when the background work starts → `extracted` when its fields are saved, or `failed` after the last retry. A job left `queued` for a minute is picked up by the sweep. |
| Field | Created with all its job's fields in one step → never changed → deleted only with its job or its owner's account. |
| The document's content | Fetched through a 5-minute Upload link into memory for the model call, then dropped. Never written to disk or to the database. |

## `extraction.jobs`

One row per attempt to read one file. A retry is a new job, so the history of attempts is kept.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The job's ID. Other services store it as `job_id`. |
| `owner_id` | `uuid` | No |  |  | The user whose file it is, from the access token. A plain ID. |
| `file_id` | `uuid` | No |  |  | The file in the Upload service. A plain ID: Upload's tables are not reachable from here. |
| `schema` | `text` | No |  | `invoice-v1` in version 1 | Which fields were extracted, and so which prompt and rules applied. |
| `reference` | `text` | Yes |  | 1 to 200 characters | The caller's own label, returned in events. Opaque to Extraction. |
| `status` | `text` | No | 'queued' | One of `queued`, `processing`, `extracted`, `failed` | Where the job is. |
| `step` | `text` | Yes |  | One of `fetching_file`, `reading_document`, `checking_rules`, `saving` | The step running now, or the step that failed. Empty while queued and after success. |
| `attempt` | `smallint` | No | 1 | 1 to 3 | Which try this is within the job: the first, or one of the 2 retries after a temporary failure. |
| `model` | `text` | No |  | 1 to 100 characters | The Claude model used, from configuration at the time (`MVP1-E3-02` AC3). |
| `prompt_version` | `text` | No |  | Like `extract-invoice/v1` | The versioned prompt used, so a result can always be traced to its prompt. |
| `pages` | `smallint` | Yes |  | 1 to 10 | Pages sent to the model, from Upload. |
| `fields_total` | `smallint` | Yes |  | 0 or more; set when extracted | How many fields were saved. |
| `fields_flagged` | `smallint` | Yes |  | 0 to `fields_total` | How many need a person's check. |
| `tokens_in` | `integer` | Yes |  | 0 or more | Tokens sent to the model, across the attempt and any repair (`MVP1-E3-05`). |
| `tokens_out` | `integer` | Yes |  | 0 or more | Tokens the model returned. |
| `cost_usd` | `numeric(10,6)` | Yes |  | 0 or more | Estimated model cost of this job, from the tokens and the model's price per token in configuration. Six decimals because one job costs fractions of a cent. |
| `duration_ms` | `integer` | Yes |  | 0 or more | Time from start of processing to the end, in milliseconds. |
| `error_code` | `text` | Yes |  | One of `file_unavailable`, `document_unreadable`, `model_unavailable`, `output_invalid`, `timed_out`; set exactly when failed | Why the job failed, as a stable code. |
| `error_message` | `text` | Yes |  | Set exactly when failed | The plain-language message a person sees. |
| `created_at` | `timestamptz` | No | now() |  | When the job was asked for. |
| `started_at` | `timestamptz` | Yes |  | Not before `created_at` | When processing began. |
| `finished_at` | `timestamptz` | Yes |  | Set exactly when extracted or failed; not before `started_at` | When the job ended. |

## `extraction.fields`

One row per value read from a document: a header field, or one field of one line item. Never edited after it is saved: this is what the model said, and corrections live in the Human Review service.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The field's ID. |
| `job_id` | `uuid` | No |  | Foreign key to `extraction.jobs`, delete cascades | The job that read it. |
| `name` | `text` | No |  | A field of the job's schema, for example `total` or `amount` | Which field this is. |
| `line_index` | `smallint` | Yes |  | 0 or more for line-item fields (`description`, `quantity`, `unit_price`, `amount`); empty for header fields | Which line item, counting from 0. |
| `value` | `jsonb` | Yes |  | A JSON string, or empty when the document does not contain the field | The value read. Amounts and quantities are decimal strings, dates `YYYY-MM-DD`, currency a 3-letter code. |
| `model_confidence` | `numeric(3,2)` | No |  | 0 to 1 | How sure the model said it was. |
| `confidence` | `numeric(3,2)` | No |  | 0 to 1, never above `model_confidence` | The final confidence after rule checks: the lower of the two. |
| `source_page` | `smallint` | Yes |  | 1 to the job's page count; empty when there is no value | The page the value was read from. |
| `source_quote` | `text` | Yes |  | 1 to 500 characters; empty when there is no value | The exact text on the page the value came from: the evidence a person checks. |
| `flagged` | `boolean` | No | false | True exactly when there is at least one reason | Whether a person needs to check it. |
| `flag_reasons` | `text[]` | No | '{}' | Plain-language reasons | Why it was flagged, for example 'Total ≠ subtotal + tax' or 'Low confidence (0.62)'. |
| `created_at` | `timestamptz` | No | now() |  | When it was saved. |

## `extraction.inbound_events`

One row per platform event Extraction has acted on, so a repeated delivery has no effect.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID, from the sender. |
| `type` | `text` | No |  | 1 to 100 characters | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When Extraction processed it. |

## Other tables in this schema

The service template also gives Extraction `audit_events`, `idempotency_keys` and `outbound_events`. Extraction writes `job.created`, `job.completed` and `job.failed` to `audit_events`, and announces `extraction.job.completed` and `extraction.job.failed` through `outbound_events`. `POST /jobs` needs no idempotency key: a second call for the same file returns the running job.

## Business rules

- A job only ever reads a file its owner can read: the file is fetched through Upload with the owner's own access token.
- At most one job per file and schema is `queued` or `processing` at a time, so the same document is never read or billed twice at once.
- A job only moves forward: `queued` → `processing` → `extracted` or `failed`. A failed job is never restarted; a retry is a new job.
- Fields are written once, all together, when a job succeeds, and never changed. A failed job has no fields.
- A field's final confidence is never higher than the model's own, and a field is flagged exactly when it has a reason.
- Every value that is present has a page and a quote, so a person can always see where it came from.
- Amounts are kept as decimal strings, never floating-point numbers.
- Deleting a user's account deletes their fields, which hold document content. Their jobs are kept with IDs, counts, tokens and cost only, for the cost records.
- Each job records the model and prompt version it used, so any result can be traced and re-run.

## What is deliberately not stored

- The document itself: it stays in the Upload service.
- The model's raw answer: only the validated fields are saved, so invalid output is never kept.
- The prompt text on each job: only its version; the text lives in `prompts/`.
- Document content in logs: logs carry IDs, counts and timings only.
