-- Generated from the design. Do not edit by hand; see SCHEMA.md.
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
