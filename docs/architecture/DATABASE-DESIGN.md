# Database design — 01scale

Neon Postgres, with the schema defined in Drizzle and changed only through migrations. This file holds the rules every table follows and an index of all tables. The columns, constraints and indexes for each table are in the **Database design** section of the story that introduces or changes it, in `docs/epics/`.

**Status: design only.** A table is created by the migration in its story's PR, not before.

## Conventions

| Topic | Rule |
|---|---|
| Keys | `id uuid` primary key, UUIDv7 so IDs sort by creation time and are safe to expose in URLs. |
| Names | `snake_case`, plural table names, foreign keys named `<table_singular>_id`. |
| Time | `timestamptz`, always UTC. Every table has `created_at`. |
| Status | `text` with a `CHECK` constraint listing the allowed values (easier to migrate than Postgres enums). |
| Money | Integer minor units (`amount`) plus ISO 4217 `currency`. Never floats. |
| Ownership | Every user-owned table carries `user_id` or reaches it in one join. The data-access layer always filters by owner. |
| Secrets | Tokens, codes and API keys are stored only as hashes. Card numbers are never stored. |
| Deletion | Deleting a user cascades to their data. `orders` and `payments` are kept and anonymized. |
| Idempotency | Uniqueness is enforced by the database (unique and partial unique indexes), not only by application code. |
| JSON | `jsonb` for extracted values and flexible metadata; anything queried or constrained gets its own column. |
| Audit | `audit_events` is append-only: the app role cannot update or delete it. |
| Migrations | One migration per story, forward-only, tested against PGlite in CI. |

## Tables

| Table | Purpose | Introduced in |
|---|---|---|
| `users` | One row per person. | `MVP1-E1-02` |
| `sessions` | Browser sessions; only a hash of the token is stored. | `MVP1-E1-03` |
| `api_keys` | Keys for agents and scripts; hash only. | `MVP1-E0-06` |
| `idempotency_keys` | Saved responses for retried POSTs. | `MVP1-E0-05` |
| `audit_events` | Append-only record of important events. | `MVP1-E0-02` |
| `documents` | An uploaded file and its place in the journey. | `MVP1-E2-02` |
| `extraction_jobs` | One extraction attempt, with model, cost and timing. | `MVP1-E3-01` |
| `fields` | One extracted value with confidence and evidence. | `MVP1-E3-02` |
| `field_changes` | History of every change to a field. | `MVP1-E4-02` |
| `eval_candidates` | Human corrections waiting to become eval cases. | `MVP1-E4-04` |
| `outputs` | Generated JSON and CSV files, versioned. | `MVP1-E5-04` |
| `orders` | A one-time payment for a document (Stripe Checkout). | `MVP1-E6-01` |
| `stripe_events` | Processed webhook event IDs. | `MVP1-E6-02` |
| `deliveries` | Email delivery attempts for an order. | `MVP1-E7-03` |
| `auth_identities` | How a user can sign in (email, passkey). | `MVP2-E8-01` |
| `login_tokens` | Magic links and one-time codes; hash only. | `MVP2-E8-01` |
| `passkeys` | WebAuthn credentials. | `MVP2-E8-01` |
| `recovery_codes` | Single-use recovery codes; argon2 hashes. | `MVP2-E8-01` |
| `rate_limits` | Counters for per-email and per-IP limits. | `MVP2-E8-02` |
| `webauthn_challenges` | Short-lived passkey challenges. | `MVP2-E8-04` |
| `email_changes` | Pending email address changes. | `MVP2-E8-07` |
| `batches` | A group of documents processed together. | `MVP2-E9-01` |
| `pipeline_runs` | Per-node checkpoints so a retry resumes. | `MVP2-E9-02` |
| `pipeline_events` | Processed pipeline event IDs. | `MVP2-E9-02` |
| `field_judgements` | The judge model's verdict on a field. | `MVP2-E10-01` |
| `enrichments` | Web-sourced vendor metadata with citations. | `MVP2-E11-01` |
| `chat_messages` | Correction chat history. | `MVP2-E11-03` |
| `field_proposals` | Changes proposed by the chat agent. | `MVP2-E11-03` |
| `payment_methods` | Saved cards (brand, last 4, expiry only). | `MVP2-E13-02` |
| `payments` | Payments with a saved card (PaymentIntents). | `MVP2-E13-04` |
| `notification_preferences` | Per-user channel and event settings. | `MVP2-E14-01` |
| `push_subscriptions` | Web push devices. | `MVP2-E14-03` |
| `notifications` | Every notification attempt per channel. | `MVP2-E14-04` |

## Main relationships

```
users ─┬─ sessions
       ├─ api_keys
       ├─ documents ─┬─ extraction_jobs ── fields ─┬─ field_changes
       │             │                             └─ field_judgements (MVP2)
       │             ├─ outputs
       │             ├─ enrichments (MVP2)
       │             └─ chat_messages ── field_proposals (MVP2)
       ├─ batches ── documents (MVP2)
       ├─ orders ── deliveries
       ├─ payment_methods ── payments (MVP2)
       └─ notification_preferences, push_subscriptions, notifications (MVP2)
```
