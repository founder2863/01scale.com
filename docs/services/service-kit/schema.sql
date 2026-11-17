-- Generated from the design. Do not edit by hand; see SCHEMA.md.
-- Service template. Every service gets these tables in its own schema;
-- they are shown here in a schema named `template`. The service's own tables come from its stories.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists template;

create table template.audit_events (
  id          uuid        primary key,
  actor_id    uuid,
  actor_type  text        not null,
  action      text        not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb       not null default '{}',
  request_id  text,
  created_at  timestamptz not null default now(),

  constraint audit_events_actor_type_check check (actor_type in ('user', 'api_key', 'service', 'system')),
  constraint audit_events_action_check check (action ~ '^(auth|document|review|order|delivery)\.[a-z_]+$')
);

create index audit_events_actor_idx on template.audit_events (actor_id, created_at desc);

create table template.idempotency_keys (
  owner_id        uuid        not null,
  key             text        not null,
  method          text        not null,
  path            text        not null,
  request_hash    text        not null,
  response_status smallint    not null,
  response_body   jsonb,
  created_at      timestamptz not null default now(),

  constraint idempotency_keys_pkey primary key (owner_id, key),
  constraint idempotency_keys_key_check check (length(key) between 1 and 255),
  constraint idempotency_keys_method_check check (method in ('POST', 'PUT', 'PATCH', 'DELETE')),
  constraint idempotency_keys_request_hash_check check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint idempotency_keys_status_check check (response_status between 100 and 599)
);

create table template.outbound_events (
  id              uuid        primary key,
  event_id        uuid        not null,
  type            text        not null,
  payload         jsonb       not null,
  subscriber      text        not null,
  status          text        not null default 'pending',
  attempts        smallint    not null default 0,
  next_attempt_at timestamptz default now(),
  created_at      timestamptz not null default now(),

  constraint outbound_events_event_subscriber_key unique (event_id, subscriber),
  constraint outbound_events_status_check check (status in ('pending', 'delivered', 'failed')),
  constraint outbound_events_attempts_check check (attempts between 0 and 6),
  constraint outbound_events_subscriber_check check (subscriber like 'https://%'),
  constraint outbound_events_next_attempt_check check ((status = 'pending') = (next_attempt_at is not null))
);

create index outbound_events_due_idx on template.outbound_events (next_attempt_at) where status = 'pending';

create table template.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

-- The service's role reaches only its own schema. Audit and inbound events are never changed.
grant usage on schema template to template_service;
grant select, insert, update, delete on template.idempotency_keys, template.outbound_events to template_service;
grant select, insert on template.audit_events, template.inbound_events to template_service;
