# Service template service — schema

> **Version 1 · `packages/service-kit` and `services/_template`.** Status: in design. Stories: `MVP1-E0-01`, `MVP1-E0-02`, `MVP1-E0-03`, `MVP1-E0-05`, `MVP1-E0-07`.

The tables every service gets, shown in a schema named `template`. What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.

```sql
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
```

## Constraints at the schema level

- Audit rows cannot be changed or deleted by the service's role.
- One idempotency record per user and key; one outbox row per event and subscriber.
- Each role reaches only its own schema.

## `template.audit_events`

**Constraints and indexes**

- `audit_events_pkey`: primary key (`id`)
- `audit_events_actor_type_check`: the four actor types
- `audit_events_action_check`: an allowed prefix
- `audit_events_actor_idx`: index on (`actor_id`, `created_at` desc)

**Sample data**

| `id` | `actor_id` | `actor_type` | `action` | `target_type` | `target_id` | `metadata` | `request_id` | `created_at` |
|---|---|---|---|---|---|---|---|---|
| `0193b122-0000-7000-8000-000000000001` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `user` | `order.created` | `order` | `0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f` | `{"amount":500,"currency":"usd"}` | `req_0193b11f` | `2026-11-17 09:16:30+00` |

## `template.idempotency_keys`

**Constraints and indexes**

- `idempotency_keys_pkey`: primary key (`owner_id`, `key`)
- `idempotency_keys_key_check`, `idempotency_keys_method_check`, `idempotency_keys_request_hash_check`, `idempotency_keys_status_check`

**Sample data**

| `owner_id` | `key` | `method` | `path` | `request_hash` | `response_status` | `response_body` | `created_at` |
|---|---|---|---|---|---|---|---|
| `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | `6f1c2a9e-upload-1` | `POST` | `/api/upload/v1/files` | `a3f1c9e27b4d6058e1c2b3a4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708` | `201` | `{"file":{"id":"0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"}}` | `2026-11-17 09:14:07+00` |

## `template.outbound_events`

**Constraints and indexes**

- `outbound_events_pkey`: primary key (`id`)
- `outbound_events_event_subscriber_key`: unique (`event_id`, `subscriber`)
- `outbound_events_status_check`, `outbound_events_attempts_check`, `outbound_events_subscriber_check`, `outbound_events_next_attempt_check`
- `outbound_events_due_idx`: partial index on `next_attempt_at` where `pending`, for the delivery job

**Sample data**

| `id` | `event_id` | `type` | `payload` | `subscriber` | `status` | `attempts` | `next_attempt_at` | `created_at` |
|---|---|---|---|---|---|---|---|---|
| `0193b301-0000-7000-8000-000000000001` | `0193b300-0000-7000-8000-000000000009` | `identity.user.deleted` | `{"user_id":"0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"}` | `https://01scale.com/api/upload/v1/events` | `delivered` | `1` | (empty) | `2026-11-17 11:00:00+00` |
| `0193b301-0000-7000-8000-000000000002` | `0193b300-0000-7000-8000-000000000009` | `identity.user.deleted` | `{"user_id":"0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"}` | `https://01scale.com/api/payment/v1/events` | `pending` | `2` | `2026-11-17 11:36:00+00` | `2026-11-17 11:00:00+00` |

## `template.inbound_events`

**Constraints and indexes**

- `inbound_events_pkey`: primary key (`event_id`)

**Sample data**

| `event_id` | `type` | `created_at` |
|---|---|---|
| `0193b300-0000-7000-8000-000000000009` | `identity.user.deleted` | `2026-11-17 11:00:02+00` |

## Common queries

**Events due for delivery**

```sql
select * from template.outbound_events
where status = 'pending' and next_attempt_at <= now()
order by next_attempt_at
limit 50
for update skip locked;
```
