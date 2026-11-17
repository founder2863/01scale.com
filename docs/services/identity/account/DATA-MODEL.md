# Account management service — data model

> **Version 1 · Identity, second part.** Status: in design. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| API key | `identity.api_keys` | A secret an agent uses to act for a person, within its scopes. | Belongs to one user; deleted with the user. |
| User (from Login) | `identity.users` | Deleted by `DELETE /me`. | Its sessions and API keys are deleted with it; its audit events stay, with no foreign key. |

## Life of each record

| Record | Life |
|---|---|
| API key | Created by the person → used (last use recorded) → ends when revoked, when it expires, or when the account is deleted. Revoked and expired keys stay until the account is deleted, so audit events can name them. |
| Account deletion | Cognito user deleted → user row deleted with its sessions and keys → `auth.account_deleted` kept without the email → `identity.user.deleted` sent to every service. |

## `identity.api_keys`

One row per API key a person created for an agent or script.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The key's ID; appears in access tokens as `akid` and in audit events. |
| `user_id` | `uuid` | No |  | Foreign key to `identity.users`, delete cascades | Whose key it is. |
| `name` | `text` | No |  | 1 to 100 characters | What the key is for, chosen by the person. |
| `prefix` | `text` | No |  | 8 base64url characters | The first 8 characters after `sk_01s_`, so the person can recognise the key in the list. |
| `key_hash` | `text` | No |  | 64 hex characters; unique | SHA-256 of the whole secret. A 256-bit random secret needs no slow hash: it cannot be guessed. |
| `scopes` | `text[]` | No |  | 1 or more, each from the allowed list | What the key may do. |
| `last_used_at` | `timestamptz` | Yes |  |  | Last exchange, updated at most once a minute. |
| `expires_at` | `timestamptz` | No |  | After `created_at`, at most 1 year later | When it stops working. |
| `revoked_at` | `timestamptz` | Yes |  | Not before `created_at` | When the person revoked it. |
| `created_at` | `timestamptz` | No | now() |  | When it was created. |

## Other tables in this schema

Account management also writes to Login's `identity.audit_events` and to the template's `identity.outbound_events`.

## Business rules

- A key works only if not revoked and not expired.
- A key's access token never has more than the key's scopes.
- Deleting an account deletes the Cognito user first, so a failure leaves everything as it was.
- Every service learns of a deletion through the outbox, never by being called in turn.

## What is deliberately not stored

- The API key secret: only its hash.
- The new password: it stays in Cognito.
- Anything about the person after deletion except audit events by ID.
