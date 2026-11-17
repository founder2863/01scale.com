"""Design of the Human Review service, version 1 (a person checks flagged fields).

Data only: scripts/site/render.py turns MODULE into docs/services/review/*.md and
app/products/review.ts. Run `npm run site:data` after any change.
Stories: MVP1-E4-01 to MVP1-E4-04. DocFlow's complete-review endpoint in
MVP1-E4-03 is designed with the DocFlow app shell, MVP1-E0-09.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "review"
COMPLETE = False

BASE = "/api/review/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"   # a user, from Identity
T1 = "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b"   # a review task
RF1 = "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a30"  # review field: total
RF2 = "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a31"  # review field: vendor_tax_id
RF3 = "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a32"  # review field: vendor_name
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"   # DocFlow's document, as a reference
FIELD_TYPES = "`text`, `date`, `decimal`, `currency`"

TASK_OPEN = {"id": T1, "reference": f"docflow:{D1}", "status": "open", "resolved": 1, "total": 3, "flagged": 2, "can_complete": False, "checks_overridden": False, "created_at": "2026-11-17T09:14:43Z", "completed_at": None}
F_TOTAL = {"id": RF1, "name": "total", "line_index": None, "type": "decimal", "original_value": "1240.00", "value": "1240.00", "confidence": 0.3, "source_page": 2, "source_quote": "TOTAL DUE  $1,240.00", "flagged": True, "flag_reasons": ["Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)"], "status": "pending"}
F_TAX = {"id": RF2, "name": "vendor_tax_id", "line_index": None, "type": "text", "original_value": None, "value": None, "confidence": 0.62, "source_page": None, "source_quote": None, "flagged": True, "flag_reasons": ["Low confidence (0.62)"], "status": "not_present"}

NOT_FOUND = error("404", "task_not_found", "No such task, or it belongs to another user. The same answer in both cases.")
NOT_AUTH = error("401", "not_authenticated", "No valid access token.")

ENDPOINTS = [
    endpoint(
        "create-task", "POST", f"{BASE}/tasks", "Signed in", "MVP1-E4-01",
        "Create a review task",
        "Takes a set of fields that need a person's check and keeps its own copy of them. Review never reads another service's data: whatever it needs is sent here.",
        [
            param("reference", "body", "string", "Yes", "1 to 200 characters. Opaque to Review.", "The caller's own label, returned in events. DocFlow sends `docflow:{document_id}`."),
            param("fields[]", "body", "array", "Yes", "1 to 500 fields.", "The values to review."),
            param("fields[].name", "body", "string", "Yes", "1 to 64 characters; unique with `line_index` within the task.", "The field's name, shown as its label."),
            param("fields[].line_index", "body", "integer", "No", "0 or more.", "Which line item, for repeated fields."),
            param("fields[].type", "body", "string", "Yes", f"One of {FIELD_TYPES}.", "How an edit is checked: a real date, a decimal number, a 3-letter currency code, or free text. This keeps Review independent of any one document type."),
            param("fields[].value", "body", "string or null", "Yes", "Null when not found on the document. Decimals as strings.", "The value to check."),
            param("fields[].confidence", "body", "number", "Yes", "0 to 1.", "How sure the system was; orders the queue."),
            param("fields[].source_page, fields[].source_quote", "body", "integer, string", "No", "Page 1 or more; quote 1 to 500 characters.", "The evidence shown beside the value."),
            param("fields[].flagged, fields[].flag_reasons", "body", "boolean, string[]", "Yes", "Flagged exactly when there is at least one reason.", "Whether a person must decide on this field, and why."),
            param("Idempotency-Key", "header", "string", "No", "1 to 255 characters.", "Makes a retried request safe."),
        ],
        ["Validates every field, stores the task as `open` with its own copy of the fields (each `pending`), and records `review.task_created`."],
        [response("201", "The task was created", "`task`.")],
        [error("422", "validation_failed", "A field is malformed; `errors[]` lists each one."), error("422", "duplicate_field", "Two fields share a name and line index."), error("422", "idempotency_key_reused", "Same key, different body."), NOT_AUTH],
        "POST /api/review/v1/tasks HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nIdempotency-Key: 4d2a-review-1\nContent-Type: application/json\n\n"
        + json.dumps({"reference": f"docflow:{D1}", "fields": [
            {"name": "vendor_name", "type": "text", "value": "Acme Supplies Ltd", "confidence": 0.97, "source_page": 1, "source_quote": "Acme Supplies Ltd", "flagged": False, "flag_reasons": []},
            {"name": "total", "type": "decimal", "value": "1240.00", "confidence": 0.3, "source_page": 2, "source_quote": "TOTAL DUE  $1,240.00", "flagged": True, "flag_reasons": ["Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)"]},
        ]}, indent=2),
        json.dumps({"task": {**TASK_OPEN, "resolved": 0, "total": 2, "flagged": 1}}, indent=2),
    ),
    endpoint(
        "get-task", "GET", f"{BASE}/tasks/{{taskId}}", "Signed in", "MVP1-E4-01",
        "Get the review queue",
        "The task and its fields: flagged fields first, lowest confidence first. Unflagged fields only when asked.",
        [
            param("taskId", "path", "uuid", "Yes", "A UUID.", "The task."),
            param("all", "query", "boolean", "No", "`true` adds the unflagged fields after the flagged ones.", "For 'Show all fields'."),
        ],
        ["Read only. `resolved` counts flagged fields no longer `pending`; `can_complete` is true when none is pending."],
        [response("200", "The task is the caller's", "`task` and `fields[]`: `id`, `name`, `line_index`, `type`, `original_value`, `value`, `confidence`, `source_page`, `source_quote`, `flagged`, `flag_reasons[]`, `status` (`pending`, `accepted`, `edited`, `not_present`).")],
        [NOT_FOUND, NOT_AUTH],
        f"GET /api/review/v1/tasks/{T1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"task": TASK_OPEN, "fields": [F_TOTAL, F_TAX]}, indent=2),
    ),
    endpoint(
        "update-field", "PATCH", f"{BASE}/tasks/{{taskId}}/fields/{{fieldId}}", "Signed in", "MVP1-E4-02",
        "Accept, edit or mark a field as not on the document",
        "Records a person's decision on one field. Any field can be changed again until the task is completed.",
        [
            param("taskId, fieldId", "path", "uuid", "Yes", "A field of an open task of the caller's.", "The field."),
            param("action", "body", "string", "Yes", "`accept`, `edit` or `not_present`.", "What the person decided."),
            param("value", "body", "string", "With `edit` only", "Checked by the field's type: `date` a real date as `YYYY-MM-DD`; `decimal` digits with at most 4 decimals; `currency` an ISO 4217 code; `text` 1 to 500 characters.", "The corrected value."),
        ],
        [
            "`accept` keeps the value; `edit` replaces it; `not_present` empties it.",
            "Writes the old and new value, the action, who and when to the field's history, and records `review.field_updated`.",
            "When the new value differs from the original, saves an eval candidate (`MVP1-E4-04`).",
        ],
        [response("200", "The decision was recorded", "`field`, and the task's new `resolved` and `can_complete`.")],
        [
            NOT_FOUND,
            error("422", "invalid_date", "`value` is not a real date."),
            error("422", "invalid_decimal", "`value` is not a decimal number."),
            error("422", "invalid_currency", "`value` is not an ISO 4217 currency code."),
            error("422", "validation_failed", "`action` is unknown, or `value` is missing or sent when not allowed."),
            error("409", "task_completed", "The task is completed; its values are locked."),
            NOT_AUTH,
        ],
        f"PATCH /api/review/v1/tasks/{T1}/fields/{RF1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"action": "edit", "value": "1230.00"}, indent=2),
        json.dumps({"field": {**F_TOTAL, "value": "1230.00", "status": "edited"}, "task": {"resolved": 2, "can_complete": True}}, indent=2),
    ),
    endpoint(
        "complete-task", "POST", f"{BASE}/tasks/{{taskId}}/complete", "Signed in", "MVP1-E4-03",
        "Complete the review",
        "Locks the values and returns them. Allowed once every flagged field is decided. Re-checking the corrected values against the document's rules is the app's step before this, using the LLM Extraction service.",
        [
            param("taskId", "path", "uuid", "Yes", "An open task of the caller's.", "The task."),
            param("checks_overridden", "body", "boolean", "No", "Default false.", "True when the person confirmed 'Values are correct as on the document' although a rule check still fails."),
        ],
        [
            "Sets the task `completed`, with who and when, and whether checks were overridden.",
            "Records `review.task_completed` and announces `review.task.completed` with `{task_id, reference}`.",
            "Completing an already completed task returns it again, unchanged.",
        ],
        [response("200", "The task is completed", "`task` and `final_values`: each field's name, line index and final value.")],
        [NOT_FOUND, error("409", "fields_unresolved", "Flagged fields are still pending; `unresolved_fields[]` lists them."), NOT_AUTH],
        f"POST /api/review/v1/tasks/{T1}/complete HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"checks_overridden": False}, indent=2),
        json.dumps({"task": {**TASK_OPEN, "status": "completed", "resolved": 2, "can_complete": True, "completed_at": "2026-11-17T09:16:02Z"},
                    "final_values": [{"name": "vendor_name", "line_index": None, "value": "Acme Supplies Ltd"}, {"name": "total", "line_index": None, "value": "1230.00"}, {"name": "vendor_tax_id", "line_index": None, "value": None}]}, indent=2),
    ),
    endpoint(
        "list-candidates", "GET", f"{BASE}/admin/eval-candidates", "Admin", "MVP1-E4-04",
        "Corrections that could become eval cases",
        "Every value a person corrected, with what the model said, waiting for the owner to approve it as ground truth.",
        [
            param("status", "query", "string", "No", "`candidate`, `approved`, `rejected` or `exported`. Default `candidate`.", "Which ones."),
            param("cursor, limit", "query", "string, integer", "No", "As for every list; `limit` 1 to 100.", "Paging."),
        ],
        ["Read only. Shows the field, the two values and the task's reference; no other document content."],
        [response("200", "The caller is an admin", "`data[]` and `next_cursor`.")],
        [error("404", "not_found", "The caller is not an admin."), NOT_AUTH],
        f"GET /api/review/v1/admin/eval-candidates?status=candidate HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [{"id": "0193b101-aa00-7b01-8c02-0d03e04f05a6", "reference": f"docflow:{D1}", "field_name": "total", "line_index": None, "model_value": "1240.00", "human_value": "1230.00", "status": "candidate", "created_at": "2026-11-17T09:15:30Z"}], "next_cursor": None}, indent=2),
    ),
    endpoint(
        "decide-candidate", "PATCH", f"{BASE}/admin/eval-candidates/{{candidateId}}", "Admin", "MVP1-E4-04",
        "Approve or reject a candidate",
        "The manual approval the story requires before any correction becomes ground truth.",
        [param("candidateId", "path", "uuid", "Yes", "A candidate with status `candidate`.", "The candidate."), param("status", "body", "string", "Yes", "`approved` or `rejected`.", "The decision.")],
        ["Records the decision, who and when. An exported candidate cannot change."],
        [response("200", "Recorded", "`candidate`.")],
        [error("404", "not_found", "No such candidate, or the caller is not an admin."), error("409", "candidate_exported", "Already exported."), NOT_AUTH],
        "PATCH /api/review/v1/admin/eval-candidates/0193b101-aa00-7b01-8c02-0d03e04f05a6 HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"status": "approved"}, indent=2),
        json.dumps({"candidate": {"id": "0193b101-aa00-7b01-8c02-0d03e04f05a6", "status": "approved"}}, indent=2),
    ),
    endpoint(
        "export-candidates", "POST", f"{BASE}/admin/eval-candidates/export", "Admin", "MVP1-E4-04",
        "Export approved corrections as ground truth",
        "Produces ground-truth files for `evals/datasets/`, from approved candidates only.",
        [param("candidate_ids", "body", "uuid[]", "Yes", "1 to 500 IDs, each `approved`.", "Which candidates to export.")],
        [
            "Writes one ground-truth file per document reference, with the corrected values only, and returns 5-minute links to them.",
            "Marks the candidates `exported`. The files hold field values, not the document; adding a document to the eval set is a separate, manual step.",
        ],
        [response("200", "Exported", "`files[]`: `name` and `url`.")],
        [error("404", "not_found", "The caller is not an admin."), error("409", "candidate_not_approved", "An ID is not `approved`; `ids[]` lists them."), NOT_AUTH],
        "POST /api/review/v1/admin/eval-candidates/export HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"candidate_ids": ["0193b101-aa00-7b01-8c02-0d03e04f05a6"]}, indent=2),
        json.dumps({"files": [{"name": f"ground-truth-{D1}.json", "url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/exports/ground-truth-....json?X-Amz-Expires=300&X-Amz-Signature=..."}]}, indent=2),
    ),
    endpoint(
        "events", "POST", f"{BASE}/events", "Service", "MVP1-E1-05",
        "Receive platform events",
        "Where other services' signed events arrive. In version 1 Review acts on one: a user's account was deleted.",
        [
            param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body, compared in constant time.", "Proves the event came from the platform."),
            param("event_id, type, data", "body", "uuid, string, object", "Yes", "Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`.", "The event."),
        ],
        ["Deletes that user's tasks, fields and history. Eval candidates already `approved` or `exported` are kept, without the user's ID: they hold one field's values, which the owner chose to keep as test data."],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/review/v1/events HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n"
        + json.dumps({"event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "type": "identity.user.deleted", "occurred_at": "2026-11-17T10:00:00Z", "data": {"user_id": U1}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
]

# ------------------------------------------------------------------ data model
TASKS = {"name": "review.tasks", "purpose": "One row per set of values a person checks together, usually one document's fields.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The task's ID."),
    column("owner_id", "uuid", "No", "", "", "The user who checks it, from the access token. A plain ID."),
    column("reference", "text", "No", "", "1 to 200 characters", "The caller's own label, returned in events. Opaque to Review."),
    column("status", "text", "No", "'open'", "`open` or `completed`", "Whether values can still change."),
    column("checks_overridden", "boolean", "No", "false", "", "True when the person confirmed values that still fail a rule check, as printed on the document."),
    column("created_at", "timestamptz", "No", "now()", "", "When the task was created."),
    column("completed_at", "timestamptz", "Yes", "", "Set exactly when completed", "When the person finished."),
    column("completed_by", "uuid", "Yes", "", "Set exactly when completed", "Who finished it. The owner in version 1; kept separate for later shared reviews."),
], "constraints": [], "sampleCols": [], "sampleRows": []}

RFIELDS = {"name": "review.fields", "purpose": "Review's own copy of each value under review, with the evidence and the person's decision. The service that extracted it keeps its own original, untouched.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The field's ID within Review."),
    column("task_id", "uuid", "No", "", "Foreign key to `review.tasks`, delete cascades", "The task it belongs to."),
    column("name", "text", "No", "", "1 to 64 characters; unique with `line_index` in a task", "The field's name, used as its label."),
    column("line_index", "smallint", "Yes", "", "0 or more", "Which line item, for repeated fields."),
    column("type", "text", "No", "", "`text`, `date`, `decimal` or `currency`", "How an edit is checked."),
    column("original_value", "jsonb", "Yes", "", "A JSON string, or empty", "The value as it arrived. Never changes."),
    column("value", "jsonb", "Yes", "", "A JSON string, or empty for not present", "The value now, after any decision."),
    column("confidence", "numeric(3,2)", "No", "", "0 to 1", "How sure the system was; orders the queue."),
    column("source_page", "smallint", "Yes", "", "1 or more", "The page of the evidence."),
    column("source_quote", "text", "Yes", "", "1 to 500 characters", "The evidence, shown beside the value."),
    column("flagged", "boolean", "No", "", "True exactly when there is a reason", "Whether a decision is required."),
    column("flag_reasons", "text[]", "No", "'{}'", "", "Why it needs checking."),
    column("status", "text", "No", "'pending'", "`pending`, `accepted`, `edited` or `not_present`", "The person's decision so far."),
    column("updated_by", "uuid", "Yes", "", "Set once decided", "Who made the last decision."),
    column("updated_at", "timestamptz", "Yes", "", "Set once decided", "When."),
], "constraints": [], "sampleCols": [], "sampleRows": []}

CHANGES = {"name": "review.field_changes", "purpose": "The full history of decisions on a field: one row per change, never edited. Any change can be traced, and undone by applying the old value again.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The change's ID."),
    column("field_id", "uuid", "No", "", "Foreign key to `review.fields`, delete cascades", "The field changed."),
    column("action", "text", "No", "", "`accept`, `edit` or `not_present`", "What the person decided."),
    column("old_value", "jsonb", "Yes", "", "", "The value before."),
    column("new_value", "jsonb", "Yes", "", "", "The value after."),
    column("source", "text", "No", "'review'", "`review` in version 1 (`chat` arrives in MVP2)", "Where the change came from."),
    column("changed_by", "uuid", "No", "", "", "Who made it."),
    column("created_at", "timestamptz", "No", "now()", "", "When."),
], "constraints": [], "sampleCols": [], "sampleRows": []}

CANDIDATES = {"name": "review.eval_candidates", "purpose": "One row per value a person corrected, kept so the owner can turn real mistakes into test cases. Never added to the eval set without approval.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The candidate's ID."),
    column("task_id", "uuid", "Yes", "", "Empty after the owner's account is deleted", "The task it came from; no foreign key, so an approved candidate can outlive it."),
    column("reference", "text", "No", "", "1 to 200 characters", "The task's reference, which ties the ground truth to its document."),
    column("field_name", "text", "No", "", "1 to 64 characters", "Which field."),
    column("line_index", "smallint", "Yes", "", "0 or more", "Which line item."),
    column("model_value", "jsonb", "Yes", "", "", "What the system had."),
    column("human_value", "jsonb", "Yes", "", "Different from `model_value`", "What the person corrected it to."),
    column("status", "text", "No", "'candidate'", "`candidate`, `approved`, `rejected` or `exported`", "Where it is in the approval."),
    column("decided_by", "uuid", "Yes", "", "Set once approved or rejected", "The admin who decided."),
    column("decided_at", "timestamptz", "Yes", "", "Set once approved or rejected", "When."),
    column("created_at", "timestamptz", "No", "now()", "", "When the correction was made."),
], "constraints": [], "sampleCols": [], "sampleRows": []}

INBOUND = {"name": "review.inbound_events", "purpose": "One row per platform event Review has acted on, so a repeat has no effect.", "columns": [
    column("event_id", "uuid", "No", "", "Primary key", "The event's ID."),
    column("type", "text", "No", "", "1 to 100 characters", "What happened."),
    column("created_at", "timestamptz", "No", "now()", "", "When Review processed it."),
], "constraints": [], "sampleCols": [], "sampleRows": []}

DATA_MODEL_RULES = [
    "Review owns its copy of every value. It never reads another service's data, and never changes the original it was sent.",
    "`original_value` never changes; `value` holds the decision. The difference between them is what a person corrected.",
    "Every decision writes a history row in the same transaction; history rows are never edited.",
    "A task can be completed only when no flagged field is `pending`, and once completed its values never change.",
    "A correction (a final value different from the original) creates exactly one eval candidate per field, updated if the person changes it again before completing.",
    "A candidate becomes ground truth only after an admin approves it; only approved candidates are exported.",
    "Deleting a user's account deletes their tasks, fields and history. Approved or exported candidates stay, without the task's ID.",
]

DATA_MODEL = {
    "entities": [
        {"name": "Task", "table": "`review.tasks`", "what": "A set of values one person checks together.", "relations": "Belongs to one user by ID. Has many fields."},
        {"name": "Field", "table": "`review.fields`", "what": "One value under review, with its evidence and decision.", "relations": "Belongs to one task. Has many changes."},
        {"name": "Change", "table": "`review.field_changes`", "what": "One decision on one field.", "relations": "Belongs to one field."},
        {"name": "Eval candidate", "table": "`review.eval_candidates`", "what": "A correction that could become a test case.", "relations": "Came from a task, by ID only."},
        {"name": "Processed event", "table": "`review.inbound_events`", "what": "A platform event already acted on.", "relations": "Stands alone."},
    ],
    "lifecycles": [
        {"name": "Task", "text": "`open` when created → `completed` when the person finishes. Never reopened."},
        {"name": "Field", "text": "`pending` → `accepted`, `edited` or `not_present`, and can change between those until the task is completed."},
        {"name": "Eval candidate", "text": "`candidate` when a correction is made → `approved` or `rejected` by an admin → `exported` when written to a ground-truth file."},
    ],
    "notStored": [
        "The document itself: only the quotes sent with each field.",
        "Document rules: re-checking values is the LLM Extraction service's job.",
        "Ground-truth files: they are produced on export and handed over, not kept here.",
    ],
    "otherTables": "The service template also gives Review `audit_events`, `idempotency_keys` and `outbound_events`. Review writes `review.task_created`, `review.field_updated` and `review.task_completed` to `audit_events`, uses `idempotency_keys` for `POST /tasks`, and announces `review.task.completed`.",
}

# ------------------------------------------------------------------ schema
C1 = "0193b101-aa00-7b01-8c02-0d03e04f05a6"
TASKS["constraints"] = [
    "`tasks_pkey`: primary key (`id`)",
    "`tasks_status_check`: `open` or `completed`",
    "`tasks_completed_check`: `completed_at` and `completed_by` are set exactly when completed",
    "`tasks_reference_check`: `reference` 1 to 200 characters",
    "`tasks_owner_id_idx`: index on (`owner_id`, `created_at` desc), for a user's tasks",
]
TASKS["sampleCols"] = ["id", "owner_id", "reference", "status", "checks_overridden", "created_at", "completed_at", "completed_by"]
TASKS["sampleRows"] = [[T1, U1, f"docflow:{D1}", "completed", "false", "2026-11-17 09:14:43+00", "2026-11-17 09:16:02+00", U1]]
RFIELDS["constraints"] = [
    "`fields_pkey`: primary key (`id`)",
    "`fields_task_id_fkey`: foreign key (`task_id`) references `review.tasks` on delete cascade",
    "`fields_task_name_line_key`: unique (`task_id`, `name`, `line_index`) nulls not distinct",
    "`fields_type_check`, `fields_status_check`: only the listed values",
    "`fields_flagged_check`: `flagged` exactly when `flag_reasons` is not empty",
    "`fields_decided_check`: `updated_by` and `updated_at` are set exactly when `status` is not `pending`",
    "`fields_not_present_check`: a `not_present` field has no `value`; an `accepted` one keeps `original_value`",
    "`fields_confidence_check`, `fields_quote_check`: confidence 0 to 1; quote 1 to 500 characters",
    "`fields_queue_idx`: index on (`task_id`, `flagged` desc, `confidence`), for the queue order",
]
RFIELDS["sampleCols"] = ["id", "task_id", "name", "line_index", "type", "original_value", "value", "confidence", "source_page", "source_quote", "flagged", "flag_reasons", "status", "updated_by", "updated_at"]
RFIELDS["sampleRows"] = [
    [RF1, T1, "total", "(empty)", "decimal", '"1240.00"', '"1230.00"', "0.30", "2", "TOTAL DUE  $1,240.00", "true", '{"Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)"}', "edited", U1, "2026-11-17 09:15:30+00"],
    [RF2, T1, "vendor_tax_id", "(empty)", "text", "(empty)", "(empty)", "0.62", "(empty)", "(empty)", "true", '{"Low confidence (0.62)"}', "not_present", U1, "2026-11-17 09:15:41+00"],
    [RF3, T1, "vendor_name", "(empty)", "text", '"Acme Supplies Ltd"', '"Acme Supplies Ltd"', "0.97", "1", "Acme Supplies Ltd", "false", "{}", "pending", "(empty)", "(empty)"],
]
CHANGES["constraints"] = [
    "`field_changes_pkey`: primary key (`id`)",
    "`field_changes_field_id_fkey`: foreign key (`field_id`) references `review.fields` on delete cascade",
    "`field_changes_action_check`, `field_changes_source_check`: only the listed values",
    "`field_changes_field_id_idx`: index on (`field_id`, `created_at`), for a field's history in order",
]
CHANGES["sampleCols"] = ["id", "field_id", "action", "old_value", "new_value", "source", "changed_by", "created_at"]
CHANGES["sampleRows"] = [["0193b0f9-0000-7a00-8b00-0c00d00e00f1", RF1, "edit", '"1240.00"', '"1230.00"', "review", U1, "2026-11-17 09:15:30+00"]]
CANDIDATES["constraints"] = [
    "`eval_candidates_pkey`: primary key (`id`)",
    "`eval_candidates_status_check`: only the listed values",
    "`eval_candidates_changed_check`: `human_value` is different from `model_value`",
    "`eval_candidates_decided_check`: `decided_by` and `decided_at` are set exactly when not `candidate`",
    "`eval_candidates_task_field_idx`: unique (`task_id`, `field_name`, `line_index`) nulls not distinct where `task_id` is set, one candidate per corrected field",
    "`eval_candidates_status_idx`: index on (`status`, `created_at`), for the admin list",
]
CANDIDATES["sampleCols"] = ["id", "task_id", "reference", "field_name", "line_index", "model_value", "human_value", "status", "decided_by", "decided_at", "created_at"]
CANDIDATES["sampleRows"] = [[C1, T1, f"docflow:{D1}", "total", "(empty)", '"1240.00"', '"1230.00"', "candidate", "(empty)", "(empty)", "2026-11-17 09:15:30+00"]]
INBOUND["constraints"] = ["`inbound_events_pkey`: primary key (`event_id`)", "`inbound_events_type_check`: 1 to 100 characters"]
INBOUND["sampleCols"] = ["event_id", "type", "created_at"]
INBOUND["sampleRows"] = [["0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "identity.user.deleted", "2026-11-17 10:00:01+00"]]

DDL = """-- Human Review service, version 1. Schema: review.
-- IDs are UUIDv7 values generated by the service.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists review;

create table review.tasks (
  id                uuid        primary key,
  owner_id          uuid        not null,
  reference         text        not null,
  status            text        not null default 'open',
  checks_overridden boolean     not null default false,
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  completed_by      uuid,

  constraint tasks_reference_check check (length(reference) between 1 and 200),
  constraint tasks_status_check check (status in ('open', 'completed')),
  constraint tasks_completed_check check (
    (status = 'completed') = (completed_at is not null)
    and (completed_at is null) = (completed_by is null)
    and (completed_at is null or completed_at >= created_at)
  )
);

create index tasks_owner_id_idx on review.tasks (owner_id, created_at desc);

create table review.fields (
  id             uuid         primary key,
  task_id        uuid         not null,
  name           text         not null,
  line_index     smallint,
  type           text         not null,
  original_value jsonb,
  value          jsonb,
  confidence     numeric(3,2) not null,
  source_page    smallint,
  source_quote   text,
  flagged        boolean      not null,
  flag_reasons   text[]       not null default '{}',
  status         text         not null default 'pending',
  updated_by     uuid,
  updated_at     timestamptz,

  constraint fields_task_id_fkey foreign key (task_id)
    references review.tasks (id) on delete cascade,
  constraint fields_task_name_line_key unique nulls not distinct (task_id, name, line_index),
  constraint fields_name_check check (length(name) between 1 and 64 and (line_index is null or line_index >= 0)),
  constraint fields_type_check check (type in ('text', 'date', 'decimal', 'currency')),
  constraint fields_status_check check (status in ('pending', 'accepted', 'edited', 'not_present')),
  constraint fields_flagged_check check (flagged = (cardinality(flag_reasons) > 0)),
  constraint fields_decided_check check (
    (status <> 'pending') = (updated_by is not null)
    and (updated_by is null) = (updated_at is null)
  ),
  constraint fields_not_present_check check (
    (status <> 'not_present' or value is null)
    and (status <> 'accepted' or value is not distinct from original_value)
  ),
  constraint fields_confidence_check check (confidence between 0 and 1 and (source_page is null or source_page >= 1)),
  constraint fields_quote_check check (length(source_quote) between 1 and 500)
);

-- The queue: flagged first, then lowest confidence.
create index fields_queue_idx on review.fields (task_id, flagged desc, confidence);

create table review.field_changes (
  id         uuid        primary key,
  field_id   uuid        not null,
  action     text        not null,
  old_value  jsonb,
  new_value  jsonb,
  source     text        not null default 'review',
  changed_by uuid        not null,
  created_at timestamptz not null default now(),

  constraint field_changes_field_id_fkey foreign key (field_id)
    references review.fields (id) on delete cascade,
  constraint field_changes_action_check check (action in ('accept', 'edit', 'not_present')),
  constraint field_changes_source_check check (source in ('review'))
);

create index field_changes_field_id_idx on review.field_changes (field_id, created_at);

create table review.eval_candidates (
  id          uuid        primary key,
  task_id     uuid,
  reference   text        not null,
  field_name  text        not null,
  line_index  smallint,
  model_value jsonb,
  human_value jsonb,
  status      text        not null default 'candidate',
  decided_by  uuid,
  decided_at  timestamptz,
  created_at  timestamptz not null default now(),

  constraint eval_candidates_reference_check check (length(reference) between 1 and 200 and length(field_name) between 1 and 64),
  constraint eval_candidates_status_check check (status in ('candidate', 'approved', 'rejected', 'exported')),
  constraint eval_candidates_changed_check check (human_value is distinct from model_value),
  constraint eval_candidates_decided_check check (
    (status <> 'candidate') = (decided_at is not null)
    and (decided_at is null) = (decided_by is null)
  )
);

-- One candidate per corrected field of a task; the admin list by status.
create unique index eval_candidates_task_field_idx
  on review.eval_candidates (task_id, field_name, line_index) nulls not distinct
  where task_id is not null;
create index eval_candidates_status_idx on review.eval_candidates (status, created_at);

create table review.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now(),

  constraint inbound_events_type_check check (length(type) between 1 and 100)
);

-- The service's database login reaches only this schema. History is never edited.
grant usage on schema review to review_service;
grant select, insert, update, delete on review.tasks, review.fields to review_service;
grant select, insert, delete on review.field_changes to review_service;
grant select, insert, update, delete on review.eval_candidates to review_service;
grant select, insert on review.inbound_events to review_service;
grant select, insert on review.audit_events to review_service;
"""

QUERIES = [
    {"title": "The review queue (`GET /tasks/{taskId}`)",
     "sql": "select f.*\nfrom review.fields f\njoin review.tasks t on t.id = f.task_id\nwhere f.task_id = $1 and t.owner_id = $2\n  and (f.flagged or $3)          -- $3: all=true\norder by f.flagged desc, f.confidence;"},
    {"title": "Can the task be completed?",
     "sql": "select count(*) filter (where flagged and status = 'pending') as unresolved\nfrom review.fields\nwhere task_id = $1;"},
    {"title": "Record a correction as a candidate (in the same transaction as the edit)",
     "sql": "insert into review.eval_candidates (id, task_id, reference, field_name, line_index, model_value, human_value)\nvalues ($1, $2, $3, $4, $5, $6, $7)\non conflict (task_id, field_name, line_index) where task_id is not null\ndo update set human_value = excluded.human_value;"},
]

SCHEMA_RULES = [
    "A field appears once per task and line item (nulls not distinct).",
    "A decided field always records who and when; an accepted field keeps its original value; a not-present field has none.",
    "A completed task always records who completed it and when.",
    "A candidate always differs from what the model said, and records who decided on it.",
    "One candidate per corrected field of a task.",
    "History rows are inserted and read, never updated. Review's database login can reach only the `review` schema.",
]

# ------------------------------------------------------------------ user journeys
JOURNEYS = [
    journey(
        "Check the flagged values", "Someone whose document has flagged fields", "Taps 'Review 3 flagged fields'.", ["MVP1-E4-01", "MVP1-E4-02"],
        [
            ("Sees the flagged fields first, the least certain at the top, each with its value, the reason and the quote from the document, and '0 of 3 resolved'.", "Review returns the task's queue, flagged first, lowest confidence first."),
            ("Reads 'Total ≠ subtotal + tax' beside the total of 1,240.00 and the quote 'TOTAL DUE $1,240.00'.", "Nothing new is fetched: the evidence came with the task."),
            ("Checks the paper invoice, taps Edit and types 1230.00.", "Review checks it is a decimal number, saves it, records the change with the old value, and saves a candidate test case. '1 of 3 resolved'."),
            ("Taps Accept on the next field, which is right.", "The field is marked accepted; its value is unchanged."),
            ("Taps 'Not on document' for a tax ID the invoice does not have.", "The value is emptied and marked not present. '3 of 3 resolved'."),
        ],
        "Every uncertain value has a person's decision, with the history kept.",
    ),
    journey(
        "Finish the review", "Someone who has decided every flagged field", "Taps Complete review, now enabled.", ["MVP1-E4-03"],
        [
            ("Taps Complete review.", "The app re-runs the rule checks on the corrected values through the LLM Extraction service."),
            ("If every check passes: is taken to the results.", "The app completes the task in Review; the values are locked and Review announces that the task is completed."),
            ("If a check still fails: sees which one, for example 'Subtotal plus tax doesn't equal the total', with Fix it or 'Values are correct as on the document'.", "Nothing is locked yet."),
            ("Confirms the values are as printed.", "The task is completed with `checks_overridden`, so the record shows the person chose to keep them."),
        ],
        "The values are final and ready for the results. Nothing can change them afterwards.",
    ),
    journey(
        "Review on a computer with the keyboard", "Someone checking many fields quickly", "Opens the review queue on a desktop.", ["MVP1-E4-02"],
        [
            ("Presses Enter.", "The highlighted field is accepted and the next one is highlighted."),
            ("Presses E, types a value and presses Enter.", "The field is edited and checked."),
            ("Presses ↓ to skip to the next field.", "Nothing is changed."),
        ],
        "A short invoice is checked in seconds without the mouse. On a phone, every action is a large button instead.",
    ),
    journey(
        "Approve corrections as test cases", "The owner (admin)", "Opens the eval candidates list.", ["MVP1-E4-04"],
        [
            ("Sees each correction: the field, what the system said and what the person changed it to.", "Review lists candidates waiting for a decision."),
            ("Approves the ones that are real model mistakes and rejects the rest.", "Each decision is recorded with who and when."),
            ("Exports the approved ones.", "Review writes ground-truth files with the corrected values and returns links. The documents themselves are never added automatically."),
        ],
        "Real mistakes become test cases, so the next prompt change is measured against them.",
    ),
]

EDGE_CASES = [
    {"situation": "Types a date that does not exist, like 31 February", "sees": "'Enter a real date, like 2026-11-30.' The field stays as it was.", "code": "`invalid_date`"},
    {"situation": "Types letters into an amount", "sees": "'Enter a number, like 1230.00.'", "code": "`invalid_decimal`"},
    {"situation": "Types a currency that is not a real code", "sees": "'Enter a 3-letter currency code, like USD.'", "code": "`invalid_currency`"},
    {"situation": "Tries to complete with fields still to check", "sees": "Complete review stays disabled; the remaining fields are highlighted.", "code": "`fields_unresolved`"},
    {"situation": "Edits after the review was completed, for example in a second tab", "sees": "'This review is finished, so values can't change.'", "code": "`task_completed`"},
    {"situation": "Follows a link to someone else's review", "sees": "'Not found.'", "code": "`task_not_found`"},
    {"situation": "Exports a correction that was not approved", "sees": "'Approve these first.' with the list.", "code": "`candidate_not_approved`"},
    {"situation": "Is signed out", "sees": "Is taken to sign in, then back to the review.", "code": "`not_authenticated`"},
]

# ------------------------------------------------------------------ UI components
UI_RULES = [
    "Components call only the Human Review API. Re-checking values against document rules is the app's step, through the LLM Extraction service.",
    "They ship as the package `packages/ui-review` and work for any set of fields: labels come from field names, checks from field types.",
    "Keyboard on desktop: Enter accepts, E edits, ↓ moves to the next field, with the shortcuts listed on screen. On phones every action is a button at least 44 pixels tall.",
    "Evidence (the quote and page) is always beside the value it supports.",
    "Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.",
    "Keyboard reachable, visible focus, labelled controls, progress announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.",
]

COMPONENTS = [
    component("ReviewQueue", "Component", "The task's fields, flagged first, each with its value, reason, evidence and the three decisions, with the 'N of M resolved' counter.",
        [("taskId", "string", "The task."), ("showAll", "boolean, optional", "Include unflagged fields. Default false; a 'Show all fields' toggle is built in.")],
        ["Loading: placeholder rows", "Open: fields with their status", "All resolved: a short 'All checked' message", "Completed: read-only values", "Failed: 'Couldn't load this review.' and Retry"],
        ["`GET /tasks/{taskId}`"]),
    component("FieldDecision", "Component", "One field's value with Accept, Edit and Not on document; the edit box checks the value as the person types.",
        [("field", "Field", "The field."), ("onDecided", "(field) => void", "Called after the decision is saved.")],
        ["Pending", "Editing, with the format hint for the field's type", "Invalid: the message under the box", "Saving: buttons disabled", "Decided: accepted, edited (shows original and new) or not present", "Failed: the message and Retry"],
        ["`PATCH /tasks/{taskId}/fields/{fieldId}`"]),
    component("ResolvedCounter", "Component", "'N of M resolved', with a bar.",
        [("resolved, total", "numbers", "From the task.")],
        ["Partly resolved", "All resolved"],
        ["None."]),
    component("CompleteReviewButton", "Component", "Completes the task; disabled until every flagged field is decided. Can carry the person's confirmation that failing values are as printed.",
        [("taskId", "string", "The task."), ("checksOverridden", "boolean, optional", "Set by the app when the person confirmed."), ("onCompleted", "(result) => void", "Called with the final values.")],
        ["Disabled with 'N fields left'", "Ready", "Working", "Completed", "Failed: the message and Retry"],
        ["`POST /tasks/{taskId}/complete`"]),
    component("EvalCandidatesTable", "Component", "For an admin: corrections with both values, Approve and Reject, and Export for the approved ones.",
        [("status", "string, optional", "Which candidates to show. Default `candidate`.")],
        ["Loading", "Empty: 'No corrections waiting.'", "Loaded", "Exporting", "Exported: links to the files", "Not an admin: 'Not found'", "Failed: Retry"],
        ["`GET /admin/eval-candidates`", "`PATCH /admin/eval-candidates/{candidateId}`", "`POST /admin/eval-candidates/export`"]),
]

MODULE = {
    "slug": "human-review",
    "docsPath": "docs/services/review",
    "extraDocs": [],
    "labels": {"flow": "How a review works", "hosted": "Pages provided by an outside service"},
    "notes": {
        "journey": "What a person sees and what the system does while checking flagged values, in version 1.",
        "ui": "What the Human Review service ships for apps to use, as the package `packages/ui-review`.",
        "hosted": "", "token": "",
        "schema": "The SQL for the Human Review service's tables, in the `review` schema. No other service can read them.",
    },
    "overview": {
        "name": "Human Review", "version": "Version 1 · A person checks flagged fields", "status": "In design", "base": BASE,
        "what": [], "why": [], "scope_in": [], "scope_out": [],
        "stories": ["MVP1-E4-01", "MVP1-E4-02", "MVP1-E4-03", "MVP1-E4-04"],
    },
    "errorSample": problem("fields_unresolved", "Fields still to check", 409, "2 flagged fields are still waiting for a decision."),
    "endpoints": ENDPOINTS,
    "tables": [TASKS, RFIELDS, CHANGES, CANDIDATES, INBOUND],
    "entities": DATA_MODEL["entities"],
    "lifecycles": DATA_MODEL["lifecycles"],
    "otherTables": DATA_MODEL["otherTables"],
    "notStored": DATA_MODEL["notStored"],
    "ddl": DDL,
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "queries": QUERIES,
    "noEndpoint": [
        {"topic": "Re-checking corrected values (MVP1-E4-03)", "how": "The rule checks belong to the LLM Extraction service. The app calls its `POST /validations` with the corrected values before completing the task here, and passes `checks_overridden` if the person confirms values that still fail. Review itself knows no document rules."},
        {"topic": "Keyboard and touch (MVP1-E4-02 AC3)", "how": "A design rule of the components: Enter accepts, E edits, ↓ moves to the next field; on phones every action is a large button."},
        {"topic": "Events Review announces", "how": "`review.task.completed` with `{task_id, reference}`, signed and delivered with retries from the outbox."},
        {"topic": "DocFlow's endpoint", "how": "`POST /api/docflow/v1/documents/{documentId}/complete-review` belongs to the DocFlow app, which calls Extraction's checks and then this service. It is designed with the DocFlow app shell (`MVP1-E0-09`)."},
        {"topic": "AI agents", "how": "Each endpoint is a tool on Review's MCP server, `POST /api/review/mcp`. An agent can propose corrections; completing a task on a user's behalf requires a user session, not an API key."},
        {"topic": "Health and contract", "how": "Like every service, Review serves `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`)."},
    ],
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "A task's fields arrive complete with their type, evidence and flags; Review fetches nothing from other services.",
            "An edit is checked by the field's type: a real date, a decimal with at most 4 places, an ISO 4217 code, or 1 to 500 characters of text.",
            "A completed task's values are locked: changes answer `409 task_completed`.",
            "A task completes only when no flagged field is `pending`.",
            "Another user's task answers `404 task_not_found`; admin endpoints answer `404 not_found` to anyone else.",
            "Only `approved` candidates can be exported.",
            "`POST /tasks` accepts `Idempotency-Key`; `complete` is idempotent by design.",
        ]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": SCHEMA_RULES},
        {"level": "Data model level: business rules the service guarantees", "items": DATA_MODEL_RULES},
    ],
    "openQuestions": [],
}
