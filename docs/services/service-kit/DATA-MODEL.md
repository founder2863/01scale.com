# Service template service — data model

> **Version 1 · `packages/service-kit` and `services/_template`.** Status: in design. Stories: `MVP1-E0-01`, `MVP1-E0-02`, `MVP1-E0-03`, `MVP1-E0-05`, `MVP1-E0-07`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Audit event | `audit_events` | A permanent record of an important action. | Refers to actor and target by ID only. |
| Idempotency record | `idempotency_keys` | The first response to a retried request. | Per user and key. |
| Outbound event | `outbound_events` | One event for one subscriber, until delivered. | One row per subscriber of an event. |
| Inbound event | `inbound_events` | An event already handled. | Stands alone. |

## Life of each record

| Record | Life |
|---|---|
| Outbound event | `pending` → `delivered`; or after 6 attempts `failed`, which an admin can retry. |
| Idempotency record | Created by the first request; deleted after 24 hours. |

## `template.audit_events`

Every important thing that happened in the service. Append-only.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The event's ID. |
| `actor_id` | `uuid` | Yes |  |  | Who acted; empty for the system. |
| `actor_type` | `text` | No |  | `user`, `api_key`, `service`, `system` | What kind of caller acted. |
| `action` | `text` | No |  | From the fixed list: `auth.*`, `document.*`, `review.*`, `order.*`, `delivery.*` | What happened. |
| `target_type` | `text` | Yes |  |  | What kind of thing it happened to. |
| `target_id` | `uuid` | Yes |  |  | Which one. No foreign key, so the record outlives the thing. |
| `metadata` | `jsonb` | No | '{}' | Keys from an allow-list | Details; never contents, tokens or full card or phone numbers. |
| `request_id` | `text` | Yes |  |  | Links the event to logs. |
| `created_at` | `timestamptz` | No | now() |  | When. |

## `template.idempotency_keys`

The first response to each idempotent request, kept 24 hours.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `owner_id` | `uuid` | No |  | Part of the primary key | Whose request; keys are per user. |
| `key` | `text` | No |  | 1 to 255 characters; part of the primary key | The `Idempotency-Key` header. |
| `method` | `text` | No |  | `POST`, `PUT`, `PATCH`, `DELETE` | The request's method. |
| `path` | `text` | No |  |  | The request's path. |
| `request_hash` | `text` | No |  | 64 hex characters | SHA-256 of the body, to detect a reused key. |
| `response_status` | `smallint` | No |  | 100 to 599 | The first response's status. |
| `response_body` | `jsonb` | Yes |  |  | The first response's body. |
| `created_at` | `timestamptz` | No | now() |  | When; rows older than 24 hours are deleted daily. |

## `template.outbound_events`

Events waiting to be delivered, one row per subscriber, written in the same transaction as the change.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The delivery's ID. |
| `event_id` | `uuid` | No |  | Unique with `subscriber` | The event's ID, the same for every subscriber; receivers use it to process once. |
| `type` | `text` | No |  | `<service>.<thing>.<happened>` | What happened. |
| `payload` | `jsonb` | No |  |  | `data` of the event; IDs, never contents. |
| `subscriber` | `text` | No |  | An `https://` address | Where to deliver it. |
| `status` | `text` | No | 'pending' | `pending`, `delivered`, `failed` | Delivery state. |
| `attempts` | `smallint` | No | 0 | 0 to 6 | Tries so far. |
| `next_attempt_at` | `timestamptz` | Yes | now() | Set exactly while `pending` | When to try next. |
| `created_at` | `timestamptz` | No | now() |  | When the change happened. |

## `template.inbound_events`

Events from other services already handled, so each is handled once.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID. |
| `type` | `text` | No |  |  | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When it was handled. |

## Business rules

- Events are written in the change's transaction.
- Each inbound event is handled once.
- No service reads another's tables.

## What is deliberately not stored

- Request or response bodies outside idempotency records.
- Document contents or personal data in audit metadata or logs.
