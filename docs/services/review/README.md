# Human Review service — developer guide

> **Version 1 · A person checks flagged fields.** Status: designed, not built. Stories: `MVP1-E4-01`, `MVP1-E4-02`, `MVP1-E4-03`, `MVP1-E4-04`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/human-review`.

## What this service is

Human Review is the platform service where a person checks the values the system is unsure about. In DocFlow it is the step between reading an invoice and producing the results.

An app sends it a set of values with their evidence and the reason each one was flagged. Review shows the uncertain ones first, records the person's decision on each (accept, correct, or not on the document) with a full history, and marks the review finished when the person is done. Values can still be corrected afterwards, and the latest values are the final document.

Every correction is also kept as a candidate model mistake, which the owner can approve inside the app. Only counts and rates are reported from them: no user's data ever leaves their account.

## Why it exists

| Reason | In plain terms |
|---|---|
| People check only what matters | Showing the flagged values first, with the evidence beside each, turns a full re-check into a few decisions. |
| Every change is accountable | Who changed what, from what, and when is recorded for every value, so the final data can always be explained. |
| Mistakes improve the model's measurement | Corrections become candidate test cases, so quality is measured against the errors people actually find. |
| Reusable for any document | Review knows field types, not invoices, so the next app can send it purchase orders or contracts unchanged. |

## What is in this version

**In scope**

- Create a review from any set of values with their evidence and flags
- A queue of flagged values first, least certain first, with 'Show all fields'
- Accept, edit (checked by type) or mark not on the document, with full history
- Complete only when every flagged value is decided; correct values later, with every change recorded
- Record when a person confirms values that still fail a rule check
- Keep corrections as candidate model mistakes; admin approval and an accuracy report of counts only

**Not in this version**

- Fixing values by describing the change in a chat: `MVP2-E11-03`
- Reviewing many documents at once in tabs: `MVP2-E12-01`
- Comparing a judge model's verdicts with people's decisions: `MVP2-E10-03`
- Assigning reviews to other people: not planned
- Re-checking values against document rules: the LLM Extraction service does that

## How a review works

| Step | Who | What happens |
|---|---|---|
| 1 | App | Sends the values, their types, evidence and flags to `POST /tasks`. In DocFlow, right after extraction. |
| 2 | Human Review | Keeps its own copy of the values and returns the task. |
| 3 | Person | Works through the queue: accept, edit or not on document. Each decision is checked, saved with its history, and a correction becomes a candidate test case. |
| 4 | App | When every flagged value is decided, re-runs the rule checks through the LLM Extraction service and shows any that still fail. |
| 5 | Human Review | On `POST /tasks/{taskId}/complete`, marks the review finished, returns the values and announces `review.task.completed`. Later corrections are recorded the same way. |
| 6 | Admin | Approves real model mistakes and reads the accuracy report, counts only. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Task | One set of values a person checks together. |
| Flagged | A value the system was unsure about, or that failed a check. Every flagged value needs a decision. |
| Field type | `text`, `date`, `decimal` or `currency`: how an edit is checked. |
| Eval candidate | A correction the admin can approve as a real model mistake. It stays in Review's database. |
| Checks overridden | The person confirmed values that still fail a rule check are correct as printed. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Send values for review

Include each value's type, evidence and flags. Review fetches nothing itself.

```ts
const { task } = await api.post("/api/review/v1/tasks", {
  reference: `myapp:${recordId}`,
  fields: extracted.map((f) => ({
    name: f.name, line_index: f.line_index, type: typeOf(f.name), value: f.value,
    confidence: f.confidence, source_page: f.source_page, source_quote: f.source_quote,
    flagged: f.flagged, flag_reasons: f.flag_reasons,
  })),
});
```

### 2. Show the queue

The component handles decisions, checks and the counter.

```tsx
import { ReviewQueue, CompleteReviewButton } from "@01scale/ui-review";

<ReviewQueue taskId={task.id} />
<CompleteReviewButton taskId={task.id} onCompleted={({ final_values }) => save(final_values)} />
```

### 3. Record a decision from code

For an agent or a script.

```ts
await api.patch(`/api/review/v1/tasks/${taskId}/fields/${fieldId}`, {
  action: "edit", value: "1230.00",
});
```

## Endpoints at a glance

Base address: `https://01scale.com/api/review/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `POST` | `/tasks` | Signed in | `review:write` | Create a review task |
| `GET` | `/tasks/{taskId}` | Signed in | `review:read` | Get the review queue |
| `PATCH` | `/tasks/{taskId}/fields/{fieldId}` | Signed in | `review:write` | Accept, edit or mark a field as not on the document |
| `POST` | `/tasks/{taskId}/complete` | Signed in | `review:write` | Complete the review |
| `GET` | `/admin/eval-candidates` | Admin | `is_admin` | Corrections that could become eval cases |
| `PATCH` | `/admin/eval-candidates/{candidateId}` | Admin | `is_admin` | Approve or reject a candidate |
| `GET` | `/admin/accuracy` | Admin | `is_admin` | How often people correct each field |
| `POST` | `/events` | Service | None: HMAC signature | Receive platform events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `REVIEW_DATABASE_URL` | Neon connection string for the `review_service` role | Yes |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks` | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64: signs and verifies platform events | Yes |
| `EVENT_ROUTES` | From the service template: reference prefix → the app's event address (decision on #13) | No |

## Open questions

- Decided by Nikhil on 17 Nov 2026: values can be corrected after completion and after payment, and the latest values are final (#45, #40); corrections are never exported, only counted, and are deleted with the account (#41).
- The accuracy report hides groups under 5. Is that the right threshold once there are external testers?
