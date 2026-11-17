# Human Review service — data model

> **Version 1 · A person checks flagged fields.** Status: designed, not built. Stories: `MVP1-E4-01`, `MVP1-E4-02`, `MVP1-E4-03`, `MVP1-E4-04`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Task | `review.tasks` | A set of values one person checks together. | Belongs to one user by ID. Has many fields. |
| Field | `review.fields` | One value under review, with its evidence and decision. | Belongs to one task. Has many changes. |
| Change | `review.field_changes` | One decision on one field. | Belongs to one field. |
| Eval candidate | `review.eval_candidates` | A correction that could become a test case. | Belongs to one task; deleted with it. |
| Processed event | `review.inbound_events` | A platform event already acted on. | Stands alone. |

## Life of each record

| Record | Life |
|---|---|
| Task | `open` when created → `completed` when the person finishes → kept until the owner deletes their account. Fields can still be corrected after completion. |
| Field | `pending` → `accepted`, `edited` or `not_present`, and can change between those at any time, also after completion. Each change adds a history row. |
| Eval candidate | `candidate` when a correction is made → `approved` or `rejected` by an admin → deleted with its task or the owner's account. |

## `review.tasks`

One row per set of values a person checks together, usually one document's fields.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The task's ID. |
| `owner_id` | `uuid` | No |  |  | The user who checks it, from the access token. A plain ID. |
| `reference` | `text` | No |  | 1 to 200 characters | The caller's own label, returned in events. Opaque to Review. |
| `status` | `text` | No | 'open' | `open` or `completed` | Whether the person has finished. Values can still be corrected after completion. |
| `checks_overridden` | `boolean` | No | false |  | True when the person confirmed values that still fail a rule check, as printed on the document. |
| `created_at` | `timestamptz` | No | now() |  | When the task was created. |
| `completed_at` | `timestamptz` | Yes |  | Set exactly when completed | When the person finished. |
| `completed_by` | `uuid` | Yes |  | Set exactly when completed | Who finished it. The owner in version 1; kept separate for later shared reviews. |

## `review.fields`

Review's own copy of each value under review, with the evidence and the person's decision. The service that extracted it keeps its own original, untouched.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The field's ID within Review. |
| `task_id` | `uuid` | No |  | Foreign key to `review.tasks`, delete cascades | The task it belongs to. |
| `name` | `text` | No |  | 1 to 64 characters; unique with `line_index` in a task | The field's name, used as its label. |
| `line_index` | `smallint` | Yes |  | 0 or more | Which line item, for repeated fields. |
| `type` | `text` | No |  | `text`, `date`, `decimal` or `currency` | How an edit is checked. |
| `original_value` | `jsonb` | Yes |  | A JSON string, or empty | The value as it arrived. Never changes. |
| `value` | `jsonb` | Yes |  | A JSON string, or empty for not present | The value now, after any decision. |
| `confidence` | `numeric(3,2)` | No |  | 0 to 1 | How sure the system was; orders the queue. |
| `source_page` | `smallint` | Yes |  | 1 or more | The page of the evidence. |
| `source_quote` | `text` | Yes |  | 1 to 500 characters | The evidence, shown beside the value. |
| `flagged` | `boolean` | No |  | True exactly when there is a reason | Whether a decision is required. |
| `flag_reasons` | `text[]` | No | '{}' |  | Why it needs checking. |
| `status` | `text` | No | 'pending' | `pending`, `accepted`, `edited` or `not_present` | The person's decision so far. |
| `updated_by` | `uuid` | Yes |  | Set once decided | Who made the last decision. |
| `updated_at` | `timestamptz` | Yes |  | Set once decided | When. |

## `review.field_changes`

The full history of decisions on a field: one row per change, never edited. Any change can be traced, and undone by applying the old value again.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The change's ID. |
| `field_id` | `uuid` | No |  | Foreign key to `review.fields`, delete cascades | The field changed. |
| `action` | `text` | No |  | `accept`, `edit` or `not_present` | What the person decided. |
| `old_value` | `jsonb` | Yes |  |  | The value before. |
| `new_value` | `jsonb` | Yes |  |  | The value after. |
| `source` | `text` | No | 'review' | `review` in version 1 (`chat` arrives in MVP2) | Where the change came from. |
| `changed_by` | `uuid` | No |  |  | Who made it. |
| `created_at` | `timestamptz` | No | now() |  | When. |

## `review.eval_candidates`

One row per value a person corrected, so the owner can see the model's real mistakes. It never leaves this database: reports show only counts (privacy rule on #41).

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The candidate's ID. |
| `task_id` | `uuid` | No |  | Foreign key to `review.tasks`, delete cascades | The task it came from; deleted with it, so nothing outlives the owner's account. |
| `reference` | `text` | No |  | 1 to 200 characters | The task's reference, which ties the ground truth to its document. |
| `field_name` | `text` | No |  | 1 to 64 characters | Which field. |
| `line_index` | `smallint` | Yes |  | 0 or more | Which line item. |
| `model_value` | `jsonb` | Yes |  |  | What the system had. |
| `human_value` | `jsonb` | Yes |  | Different from `model_value` | What the person corrected it to. |
| `status` | `text` | No | 'candidate' | `candidate`, `approved` or `rejected` | Whether the admin judged it a real model mistake. |
| `decided_by` | `uuid` | Yes |  | Set once approved or rejected | The admin who decided. |
| `decided_at` | `timestamptz` | Yes |  | Set once approved or rejected | When. |
| `created_at` | `timestamptz` | No | now() |  | When the correction was made. |

## `review.inbound_events`

One row per platform event Review has acted on, so a repeat has no effect.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID. |
| `type` | `text` | No |  | 1 to 100 characters | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When Review processed it. |

## Other tables in this schema

The service template also gives Review `audit_events`, `idempotency_keys` and `outbound_events`. Review writes `review.task_created`, `review.field_updated` and `review.task_completed` to `audit_events`, uses `idempotency_keys` for `POST /tasks`, and announces `review.task.completed`.

## Business rules

- Review owns its copy of every value. It never reads another service's data, and never changes the original it was sent.
- `original_value` never changes; `value` holds the decision. The difference between them is what a person corrected.
- Every decision writes a history row in the same transaction; history rows are never edited.
- A task can be completed only when no flagged field is `pending`. After completion its values can still be corrected; every change is recorded, and the latest values are the final document.
- A correction (a final value different from the original) creates exactly one eval candidate per field, updated if the person changes it again.
- Candidates never leave this database. Reports built from them show counts and rates only, with groups under 5 hidden.
- Deleting a user's account deletes their tasks, fields, history and eval candidates, approved ones included.

## What is deliberately not stored

- The document itself: only the quotes sent with each field.
- Document rules: re-checking values is the LLM Extraction service's job.
- Exports of corrections: there are none. Only counts and rates leave this service (privacy rule on #41).
