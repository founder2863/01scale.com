# DocFlow service — schema

> **Version 1 · The app that connects the services.** Status: in design. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

The SQL for the DocFlow app's tables, in the `docflow` schema. No service can read them. What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.

```sql
-- DocFlow app, version 1. Schema: docflow.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists docflow;

create table docflow.documents (
  id               uuid        primary key,
  owner_id         uuid        not null,
  file_name        text        not null,
  status           text        not null default 'pending_upload',
  file_id          uuid        not null,
  job_id           uuid,
  review_task_id   uuid,
  order_id         uuid,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint documents_file_name_check check (length(file_name) between 1 and 255),
  constraint documents_status_check check (status in ('pending_upload', 'uploaded', 'rejected',
    'extracting', 'extraction_failed', 'needs_review', 'reviewed', 'paid')),
  constraint documents_parts_check check (
    (status not in ('extracting', 'extraction_failed', 'needs_review', 'reviewed', 'paid') or job_id is not null)
    and (status not in ('needs_review', 'reviewed', 'paid') or review_task_id is not null)
    and (status <> 'paid' or order_id is not null)
  ),
  constraint documents_rejected_check check ((status = 'rejected') = (rejection_reason is not null))
);

create index documents_owner_idx on docflow.documents (owner_id, created_at desc);

create table docflow.outputs (
  id             uuid        primary key,
  document_id    uuid        not null,
  version        smallint    not null,
  json_file_id   uuid        not null,
  csv_file_id    uuid        not null,
  schema_version text        not null,
  created_at     timestamptz not null default now(),

  constraint outputs_document_id_fkey foreign key (document_id)
    references docflow.documents (id) on delete cascade,
  constraint outputs_document_version_key unique (document_id, version),
  constraint outputs_version_check check (version >= 1 and schema_version in ('invoice-v1'))
);

create table docflow.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

grant usage on schema docflow to docflow_service;
grant select, insert, update, delete on docflow.documents, docflow.outputs to docflow_service;
grant select, insert on docflow.inbound_events, docflow.audit_events to docflow_service;
```

## Constraints at the schema level

- A document's status always has the parts it needs (a job once extracting, a task once in review, an order once paid).
- One output per version per document.

## `docflow.documents`

**Constraints and indexes**

- `documents_pkey`: primary key (`id`)
- `documents_status_check`: only the eight statuses
- `documents_parts_check`: a job exists from `extracting` on; a review task from `needs_review` on; an order when `paid`
- `documents_rejected_check`: `rejection_reason` exactly when `rejected`
- `documents_owner_idx`: index on (`owner_id`, `created_at` desc), for the documents list

**Sample data**

| `id` | `owner_id` | `file_name` | `status` | `file_id` | `job_id` | `review_task_id` | `order_id` | `rejection_reason` | `created_at` | `updated_at` |
|---|---|---|---|---|---|---|---|---|---|---|
| `0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `acme-invoice-0042.pdf` | `paid` | `0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b` | `0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b` | `0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b` | `0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f` | (empty) | `2026-11-17 09:14:07+00` | `2026-11-17 09:17:03+00` |
| `0193b160-aaaa-7bbb-8ccc-dddddddddddd` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `scan.jpg` | `rejected` | `0193b0c9-5f22-7a08-9e44-1a2b3c4d5e6f` | (empty) | (empty) | (empty) | `type_mismatch` | `2026-11-17 09:16:40+00` | `2026-11-17 09:16:44+00` |

## `docflow.outputs`

**Constraints and indexes**

- `outputs_pkey`: primary key (`id`)
- `outputs_document_id_fkey`: foreign key to `docflow.documents`, delete cascades
- `outputs_document_version_key`: unique (`document_id`, `version`)

**Sample data**

| `id` | `document_id` | `version` | `json_file_id` | `csv_file_id` | `schema_version` | `created_at` |
|---|---|---|---|---|---|---|
| `0193b0f6-0000-7000-8000-000000000001` | `0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c` | `1` | `0193b0f5-1111-7222-8333-444455556666` | `0193b0f5-1111-7222-8333-444455556667` | `invoice-v1` | `2026-11-17 09:16:03+00` |

## `docflow.inbound_events`

**Constraints and indexes**

- `inbound_events_pkey`: primary key (`event_id`)

**Sample data**

| `event_id` | `type` | `created_at` |
|---|---|---|
| `0193b121-0000-7000-8000-00000000aaaa` | `payment.order.paid` | `2026-11-17 09:17:03+00` |

## Common queries

**The documents list**

```sql
select * from docflow.documents
where owner_id = $1
order by created_at desc
limit $2;
```
