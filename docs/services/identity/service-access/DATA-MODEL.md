# Service access service — data model

> **Version 1 · Identity, third part.** Status: in design. Stories: `MVP1-E1-03`, `MVP1-E0-07`, `MVP1-E0-09`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Client | `identity.service_clients` | A service or app that may get tokens. | Stands alone; named in tokens as `app` and `act.sub`. |

## Life of each record

| Record | Life |
|---|---|
| Client | Added by a migration → secret rotated by a migration → revoked (kept, so audit events can name it). |

## `identity.service_clients`

One row per service or app allowed to get tokens, with what it may do as itself and for users.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `text` | No |  | Primary key. 1 to 50 lowercase letters, digits or hyphens | The client's name, such as `docflow`; used as `client_id` and `app`. |
| `secret_hash` | `text` | No |  | 64 hex characters; unique | SHA-256 of the client secret. The secret is 32 random bytes, so a fast hash is enough. |
| `scopes` | `text[]` | No | '{}' | Each `<service>:<right>` | What the client may do as itself. |
| `act_scopes` | `text[]` | No | '{}' | Each `<service>:<right>`; never `identity:*` | What it may do for a user. Empty: it may not act for users. |
| `created_at` | `timestamptz` | No | now() |  | When it was registered. |
| `rotated_at` | `timestamptz` | Yes |  |  | When the secret was last changed. |
| `revoked_at` | `timestamptz` | Yes |  |  | When it was turned off; it then gets no tokens. |

## Other tables in this schema

Failed sign-ins are recorded in Login's `identity.audit_events`.

## Business rules

- A delegated token is issued only for an existing user.
- Every token lasts 5 minutes; none is stored.

## What is deliberately not stored

- Client secrets: only their hashes.
- Issued tokens: they are signed and short-lived, so none is stored.
