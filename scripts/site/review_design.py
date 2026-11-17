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
        {"level": "Schema level: enforced by the database, whatever the code does", "items": []},
        {"level": "Data model level: business rules the service guarantees", "items": DATA_MODEL_RULES},
    ],
    "openQuestions": [],
}
