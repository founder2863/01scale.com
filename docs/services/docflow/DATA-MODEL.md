# DocFlow service — data model

> **Version 1 · The app that connects the services.** Status: designed, not built. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Document | `docflow.documents` | One invoice going through the process. | Points at one file, one latest job, one review task and one order in their services, by ID only. |
| Output version | `docflow.outputs` | One built set of results. | Belongs to one document; its files are in Upload. |
| Processed event | `docflow.inbound_events` | A service event already acted on. | Stands alone. |

## Life of each record

| Record | Life |
|---|---|
| Document | `pending_upload` → `uploaded` → `extracting` → `needs_review` → `reviewed` → `paid`; or `rejected` after upload, or `extraction_failed` (back to `extracting` on retry). |

## `docflow.documents`

The process record: one row per invoice, holding only the IDs of its parts in each service and where the process is.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The document's ID; `docflow:{id}` is the reference sent to services. |
| `owner_id` | `uuid` | No |  |  | The user. |
| `file_name` | `text` | No |  | 1 to 255 characters | Shown in lists, copied from the upload request. |
| `status` | `text` | No | 'pending_upload' | `pending_upload`, `uploaded`, `rejected`, `extracting`, `extraction_failed`, `needs_review`, `reviewed`, `paid` | Where the process is. |
| `file_id` | `uuid` | No |  |  | Upload's file. |
| `job_id` | `uuid` | Yes |  |  | Extraction's latest job. |
| `review_task_id` | `uuid` | Yes |  |  | Review's task. |
| `order_id` | `uuid` | Yes |  |  | Payment's open or paid order. |
| `rejection_reason` | `text` | Yes |  | Set exactly when rejected | Upload's reason. |
| `created_at` | `timestamptz` | No | now() |  | When the document was started. |
| `updated_at` | `timestamptz` | No | now() |  | When its status last changed. |

## `docflow.outputs`

One row per version of a document's results: the IDs of the JSON and CSV files stored in Upload.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The output version's ID. |
| `document_id` | `uuid` | No |  | Foreign key to `docflow.documents`, delete cascades | Whose results. |
| `version` | `smallint` | No |  | 1 or more; unique per document | Which version; increases when outputs are rebuilt. |
| `json_file_id` | `uuid` | No |  |  | Upload's file holding `result.json`. |
| `csv_file_id` | `uuid` | No |  |  | Upload's file holding `result.csv`. |
| `schema_version` | `text` | No |  | `invoice-v1` | The JSON Schema the JSON was validated against. |
| `created_at` | `timestamptz` | No | now() |  | When it was built. |

## `docflow.inbound_events`

One row per service event DocFlow has acted on.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID. |
| `type` | `text` | No |  | 1 to 100 characters | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When. |

## Other tables in this schema

The service template also gives DocFlow `audit_events`, `idempotency_keys` and `outbound_events`.

## Business rules

- DocFlow stores IDs of other services' records, never their data.
- Every document is reviewed, even when nothing is flagged.
- Results are built only from a completed review.

## What is deliberately not stored

- Field values: they live in Extraction and Review; the results files live in Upload.
- Prices: only in configuration and on Payment's order.
