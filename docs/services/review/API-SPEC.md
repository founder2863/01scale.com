# Human Review service — API specification

> **Version 1 · A person checks flagged fields.** Status: designed, not built. Stories: `MVP1-E4-01`, `MVP1-E4-02`, `MVP1-E4-03`, `MVP1-E4-04`.

Base address: `https://01scale.com/api/review/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/fields_unresolved",
  "title": "Fields still to check",
  "status": 409,
  "detail": "2 flagged fields are still waiting for a decision.",
  "code": "fields_unresolved",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### POST /tasks

**Create a review task.** Takes a set of fields that need a person's check and keeps its own copy of them. Review never reads another service's data: whatever it needs is sent here.

Access: **Signed in** · Scope: `review:write` · Story: `MVP1-E4-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `reference` | body | string | Yes | 1 to 200 characters. Opaque to Review. | The caller's own label, returned in events. DocFlow sends `docflow:{document_id}`. |
| `fields[]` | body | array | Yes | 1 to 500 fields. | The values to review. |
| `fields[].name` | body | string | Yes | 1 to 64 characters; unique with `line_index` within the task. | The field's name, shown as its label. |
| `fields[].line_index` | body | integer | No | 0 or more. | Which line item, for repeated fields. |
| `fields[].type` | body | string | Yes | One of `text`, `date`, `decimal`, `currency`. | How an edit is checked: a real date, a decimal number, a 3-letter currency code, or free text. This keeps Review independent of any one document type. |
| `fields[].value` | body | string or null | Yes | Null when not found on the document. Decimals as strings. | The value to check. |
| `fields[].confidence` | body | number | Yes | 0 to 1. | How sure the system was; orders the queue. |
| `fields[].source_page, fields[].source_quote` | body | integer, string | No | Page 1 or more; quote 1 to 500 characters. | The evidence shown beside the value. |
| `fields[].flagged, fields[].flag_reasons` | body | boolean, string[] | Yes | Flagged exactly when there is at least one reason. | Whether a person must decide on this field, and why. |
| `Idempotency-Key` | header | string | No | 1 to 255 characters. | Makes a retried request safe. |

**Behaviour**

- Validates every field, stores the task as `open` with its own copy of the fields (each `pending`), and records `review.task_created`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | The task was created | `task`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | A field is malformed; `errors[]` lists each one. |
| `422` | `duplicate_field` | Two fields share a name and line index. |
| `422` | `idempotency_key_reused` | Same key, different body. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/review/v1/tasks HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Idempotency-Key: 4d2a-review-1
Content-Type: application/json

{
  "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
  "fields": [
    {
      "name": "vendor_name",
      "type": "text",
      "value": "Acme Supplies Ltd",
      "confidence": 0.97,
      "source_page": 1,
      "source_quote": "Acme Supplies Ltd",
      "flagged": false,
      "flag_reasons": []
    },
    {
      "name": "total",
      "type": "decimal",
      "value": "1240.00",
      "confidence": 0.3,
      "source_page": 2,
      "source_quote": "TOTAL DUE  $1,240.00",
      "flagged": true,
      "flag_reasons": [
        "Total \u2260 subtotal + tax (1,150.00 + 80.00 = 1,230.00)"
      ]
    }
  ]
}
```

**Sample response**

```json
{
  "task": {
    "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "status": "open",
    "resolved": 0,
    "total": 2,
    "flagged": 1,
    "can_complete": false,
    "checks_overridden": false,
    "created_at": "2026-11-17T09:14:43Z",
    "completed_at": null
  }
}
```

### GET /tasks/{taskId}

**Get the review queue.** The task and its fields: flagged fields first, lowest confidence first. Unflagged fields only when asked.

Access: **Signed in** · Scope: `review:read` · Story: `MVP1-E4-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `taskId` | path | uuid | Yes | A UUID. | The task. |
| `all` | query | boolean | No | `true` adds the unflagged fields after the flagged ones. | For 'Show all fields'. |

**Behaviour**

- Read only. `resolved` counts flagged fields no longer `pending`; `can_complete` is true when none is pending.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The task is the caller's | `task` and `fields[]`: `id`, `name`, `line_index`, `type`, `original_value`, `value`, `confidence`, `source_page`, `source_quote`, `flagged`, `flag_reasons[]`, `status` (`pending`, `accepted`, `edited`, `not_present`). |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `task_not_found` | No such task, or it belongs to another user. The same answer in both cases. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/review/v1/tasks/0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "task": {
    "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "status": "open",
    "resolved": 1,
    "total": 3,
    "flagged": 2,
    "can_complete": false,
    "checks_overridden": false,
    "created_at": "2026-11-17T09:14:43Z",
    "completed_at": null
  },
  "fields": [
    {
      "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a30",
      "name": "total",
      "line_index": null,
      "type": "decimal",
      "original_value": "1240.00",
      "value": "1240.00",
      "confidence": 0.3,
      "source_page": 2,
      "source_quote": "TOTAL DUE  $1,240.00",
      "flagged": true,
      "flag_reasons": [
        "Total \u2260 subtotal + tax (1,150.00 + 80.00 = 1,230.00)"
      ],
      "status": "pending"
    },
    {
      "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a31",
      "name": "vendor_tax_id",
      "line_index": null,
      "type": "text",
      "original_value": null,
      "value": null,
      "confidence": 0.62,
      "source_page": null,
      "source_quote": null,
      "flagged": true,
      "flag_reasons": [
        "Low confidence (0.62)"
      ],
      "status": "not_present"
    }
  ]
}
```

### PATCH /tasks/{taskId}/fields/{fieldId}

**Accept, edit or mark a field as not on the document.** Records a person's decision on one field. Any field can be changed again until the task is completed.

Access: **Signed in** · Scope: `review:write` · Story: `MVP1-E4-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `taskId, fieldId` | path | uuid | Yes | A field of an open task of the caller's. | The field. |
| `action` | body | string | Yes | `accept`, `edit` or `not_present`. | What the person decided. |
| `value` | body | string | With `edit` only | Checked by the field's type: `date` a real date as `YYYY-MM-DD`; `decimal` digits with at most 4 decimals; `currency` an ISO 4217 code; `text` 1 to 500 characters. | The corrected value. |

**Behaviour**

- `accept` keeps the value; `edit` replaces it; `not_present` empties it.
- Writes the old and new value, the action, who and when to the field's history, and records `review.field_updated`.
- When the new value differs from the original, saves an eval candidate (`MVP1-E4-04`).

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The decision was recorded | `field`, and the task's new `resolved` and `can_complete`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `task_not_found` | No such task, or it belongs to another user. The same answer in both cases. |
| `422` | `invalid_date` | `value` is not a real date. |
| `422` | `invalid_decimal` | `value` is not a decimal number. |
| `422` | `invalid_currency` | `value` is not an ISO 4217 currency code. |
| `422` | `validation_failed` | `action` is unknown, or `value` is missing or sent when not allowed. |
| `409` | `task_completed` | The task is completed; its values are locked. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
PATCH /api/review/v1/tasks/0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b/fields/0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a30 HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "action": "edit",
  "value": "1230.00"
}
```

**Sample response**

```json
{
  "field": {
    "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a30",
    "name": "total",
    "line_index": null,
    "type": "decimal",
    "original_value": "1240.00",
    "value": "1230.00",
    "confidence": 0.3,
    "source_page": 2,
    "source_quote": "TOTAL DUE  $1,240.00",
    "flagged": true,
    "flag_reasons": [
      "Total \u2260 subtotal + tax (1,150.00 + 80.00 = 1,230.00)"
    ],
    "status": "edited"
  },
  "task": {
    "resolved": 2,
    "can_complete": true
  }
}
```

### POST /tasks/{taskId}/complete

**Complete the review.** Locks the values and returns them. Allowed once every flagged field is decided. Re-checking the corrected values against the document's rules is the app's step before this, using the LLM Extraction service.

Access: **Signed in** · Scope: `review:write` · Story: `MVP1-E4-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `taskId` | path | uuid | Yes | An open task of the caller's. | The task. |
| `checks_overridden` | body | boolean | No | Default false. | True when the person confirmed 'Values are correct as on the document' although a rule check still fails. |

**Behaviour**

- Sets the task `completed`, with who and when, and whether checks were overridden.
- Records `review.task_completed` and announces `review.task.completed` with `{task_id, reference}`.
- Completing an already completed task returns it again, unchanged.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The task is completed | `task` and `final_values`: each field's name, line index and final value. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `task_not_found` | No such task, or it belongs to another user. The same answer in both cases. |
| `409` | `fields_unresolved` | Flagged fields are still pending; `unresolved_fields[]` lists them. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/review/v1/tasks/0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b/complete HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "checks_overridden": false
}
```

**Sample response**

```json
{
  "task": {
    "id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "status": "completed",
    "resolved": 2,
    "total": 3,
    "flagged": 2,
    "can_complete": true,
    "checks_overridden": false,
    "created_at": "2026-11-17T09:14:43Z",
    "completed_at": "2026-11-17T09:16:02Z"
  },
  "final_values": [
    {
      "name": "vendor_name",
      "line_index": null,
      "value": "Acme Supplies Ltd"
    },
    {
      "name": "total",
      "line_index": null,
      "value": "1230.00"
    },
    {
      "name": "vendor_tax_id",
      "line_index": null,
      "value": null
    }
  ]
}
```

### GET /admin/eval-candidates

**Corrections that could become eval cases.** Every value a person corrected, with what the model said, waiting for the owner to approve it as ground truth.

Access: **Admin** · Scope: `is_admin` · Story: `MVP1-E4-04`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `status` | query | string | No | `candidate`, `approved`, `rejected` or `exported`. Default `candidate`. | Which ones. |
| `cursor, limit` | query | string, integer | No | As for every list; `limit` 1 to 100. | Paging. |

**Behaviour**

- Read only. Shows the field, the two values and the task's reference; no other document content.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The caller is an admin | `data[]` and `next_cursor`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `not_found` | The caller is not an admin. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/review/v1/admin/eval-candidates?status=candidate HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b101-aa00-7b01-8c02-0d03e04f05a6",
      "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
      "field_name": "total",
      "line_index": null,
      "model_value": "1240.00",
      "human_value": "1230.00",
      "status": "candidate",
      "created_at": "2026-11-17T09:15:30Z"
    }
  ],
  "next_cursor": null
}
```

### PATCH /admin/eval-candidates/{candidateId}

**Approve or reject a candidate.** The manual approval the story requires before any correction becomes ground truth.

Access: **Admin** · Scope: `is_admin` · Story: `MVP1-E4-04`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `candidateId` | path | uuid | Yes | A candidate with status `candidate`. | The candidate. |
| `status` | body | string | Yes | `approved` or `rejected`. | The decision. |

**Behaviour**

- Records the decision, who and when. An exported candidate cannot change.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Recorded | `candidate`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `not_found` | No such candidate, or the caller is not an admin. |
| `409` | `candidate_exported` | Already exported. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
PATCH /api/review/v1/admin/eval-candidates/0193b101-aa00-7b01-8c02-0d03e04f05a6 HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "status": "approved"
}
```

**Sample response**

```json
{
  "candidate": {
    "id": "0193b101-aa00-7b01-8c02-0d03e04f05a6",
    "status": "approved"
  }
}
```

### POST /admin/eval-candidates/export

**Export approved corrections as ground truth.** Produces ground-truth files for `evals/datasets/`, from approved candidates only.

Access: **Admin** · Scope: `is_admin` · Story: `MVP1-E4-04`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `candidate_ids` | body | uuid[] | Yes | 1 to 500 IDs, each `approved`. | Which candidates to export. |

**Behaviour**

- Writes one ground-truth file per document reference, with the corrected values only, and returns 5-minute links to them.
- Marks the candidates `exported`. The files hold field values, not the document; adding a document to the eval set is a separate, manual step.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Exported | `files[]`: `name` and `url`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `not_found` | The caller is not an admin. |
| `409` | `candidate_not_approved` | An ID is not `approved`; `ids[]` lists them. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/review/v1/admin/eval-candidates/export HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "candidate_ids": [
    "0193b101-aa00-7b01-8c02-0d03e04f05a6"
  ]
}
```

**Sample response**

```json
{
  "files": [
    {
      "name": "ground-truth-0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c.json",
      "url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/exports/ground-truth-....json?X-Amz-Expires=300&X-Amz-Signature=..."
    }
  ]
}
```

### POST /events

**Receive platform events.** Where other services' signed events arrive. In version 1 Review acts on one: a user's account was deleted.

Access: **Service** · Scope: None: HMAC signature · Story: `MVP1-E1-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `X-01scale-Signature` | header | string | Yes | HMAC-SHA256 of the raw body, compared in constant time. | Proves the event came from the platform. |
| `event_id, type, data` | body | uuid, string, object | Yes | Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`. | The event. |

**Behaviour**

- Deletes that user's tasks, fields and history. Eval candidates already `approved` or `exported` are kept, without the user's ID: they hold one field's values, which the owner chose to keep as test data.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Accepted, including a repeat or an ignored type | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_signature` | The signature is missing or wrong. |

**Sample request**

```http
POST /api/review/v1/events HTTP/1.1
X-01scale-Signature: sha256=8c1f...
Content-Type: application/json

{
  "event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f",
  "type": "identity.user.deleted",
  "occurred_at": "2026-11-17T10:00:00Z",
  "data": {
    "user_id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
  }
}
```

**Sample response**

```http
HTTP/1.1 200 OK
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| Re-checking corrected values (MVP1-E4-03) | The rule checks belong to the LLM Extraction service. The app calls its `POST /validations` with the corrected values before completing the task here, and passes `checks_overridden` if the person confirms values that still fail. Review itself knows no document rules. |
| Keyboard and touch (MVP1-E4-02 AC3) | A design rule of the components: Enter accepts, E edits, ↓ moves to the next field; on phones every action is a large button. |
| Events Review announces | `review.task.completed` with `{task_id, reference}`, signed and delivered with retries from the outbox. |
| DocFlow's endpoint | `POST /api/docflow/v1/documents/{documentId}/complete-review` belongs to the DocFlow app, which calls Extraction's checks and then this service. It is designed with the DocFlow app shell (`MVP1-E0-09`). |
| AI agents | Each endpoint is a tool on Review's MCP server, `POST /api/review/mcp`. An agent can propose corrections; completing a task on a user's behalf requires a user session, not an API key. |
| Health and contract | Like every service, Review serves `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`). |

## Constraints at the API level

- A task's fields arrive complete with their type, evidence and flags; Review fetches nothing from other services.
- An edit is checked by the field's type: a real date, a decimal with at most 4 places, an ISO 4217 code, or 1 to 500 characters of text.
- A completed task's values are locked: changes answer `409 task_completed`.
- A task completes only when no flagged field is `pending`.
- Another user's task answers `404 task_not_found`; admin endpoints answer `404 not_found` to anyone else.
- Only `approved` candidates can be exported.
- `POST /tasks` accepts `Idempotency-Key`; `complete` is idempotent by design.
