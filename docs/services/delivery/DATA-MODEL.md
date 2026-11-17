# Delivery service — data model

> **Version 1 · Email through Resend.** Status: in design. Stories: `MVP1-E7-01`, `MVP1-E7-02`, `MVP1-E7-03`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Message | `delivery.messages` | One email asked for, and whether it was sent. | Belongs to one user and one app, by ID and name. |
| Processed event | `delivery.inbound_events` | A platform event already acted on. | Stands alone. |

## Life of each record

| Record | Life |
|---|---|
| Message | `queued` → `sent`, or `failed` after the last retry, or `cancelled` if the account is deleted first. |

## `delivery.messages`

One row per email asked for. It records what was sent and whether it arrived at Resend; never the address or the content.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The message's ID. |
| `owner_id` | `uuid` | No |  |  | The user it is for. A plain ID; the address is looked up at send time, never stored. |
| `app` | `text` | No |  | 1 to 50 characters, from the app's service token | Which app asked. |
| `reference` | `text` | No |  | 1 to 200 characters | The app's label. |
| `idempotency_key` | `text` | No |  | 1 to 255 characters; unique per app | The key that stops a second send. |
| `channel` | `text` | No | 'email' | `email` in version 1 | How it is sent. SMS and push arrive in MVP2. |
| `template` | `text` | No |  | `order_paid` in version 1 | Which email. |
| `status` | `text` | No | 'queued' | `queued`, `sent`, `failed` or `cancelled` | Where the message is. |
| `attempts` | `smallint` | No | 0 | 0 to 4 | Sends tried: the first and up to 3 retries. |
| `provider_message_id` | `text` | Yes |  | Set exactly when sent | Resend's ID, to trace a message with Resend. |
| `last_error` | `text` | Yes |  | Set when failed | The provider's reason, without any personal data. |
| `sent_at` | `timestamptz` | Yes |  | Set exactly when sent | When Resend accepted it. |
| `created_at` | `timestamptz` | No | now() |  | When it was asked for. |

## `delivery.inbound_events`

One row per platform event Delivery has acted on.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID. |
| `type` | `text` | No |  | 1 to 100 characters | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When Delivery processed it. |

## Other tables in this schema

The service template also gives Delivery `audit_events`, `idempotency_keys` and `outbound_events`.

## Business rules

- An email is triggered only by a server-side event, never by a browser.
- The same event never sends two emails.
- No email ever contains a link straight to a file.
- Addresses are never stored in Delivery.

## What is deliberately not stored

- Email addresses: looked up at send time.
- The email's content: rebuilt from the template if ever needed.
- File links: emails link to pages on 01scale.com, never to files.
