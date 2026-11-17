"""Design of the LLM Extraction service, version 1 (one Claude call per document).

Data only: scripts/site/render.py turns MODULE into docs/services/extraction/*.md
and app/products/extraction.ts. Run `npm run site:data` after any change.
Stories: MVP1-E3-01 to MVP1-E3-05. The DocFlow endpoint in MVP1-E3-01
(retry-extraction) is designed with the DocFlow app shell, MVP1-E0-09.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "extraction"
COMPLETE = False

BASE = "/api/extraction/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"   # a user, from Identity
F1 = "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"   # a ready file, from Upload
J1 = "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b"   # a finished job
J2 = "0193b0e7-0a1b-7c2d-8e3f-4a5b6c7d8e9f"   # a failed job
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"   # DocFlow's document, as an opaque reference

JOB_EXTRACTED = {
    "id": J1, "file_id": F1, "schema": "invoice-v1", "reference": f"docflow:{D1}", "status": "extracted",
    "steps": [
        {"name": "fetching_file", "state": "done"}, {"name": "reading_document", "state": "done"},
        {"name": "checking_rules", "state": "done"}, {"name": "saving", "state": "done"},
    ],
    "fields_total": 19, "fields_flagged": 3, "error_code": None, "error_message": None, "retryable": False,
    "created_at": "2026-11-17T09:14:12Z", "finished_at": "2026-11-17T09:14:41Z",
}
JOB_RUNNING = {**JOB_EXTRACTED, "status": "processing", "fields_total": None, "fields_flagged": None, "finished_at": None,
               "steps": [{"name": "fetching_file", "state": "done"}, {"name": "reading_document", "state": "running"},
                         {"name": "checking_rules", "state": "waiting"}, {"name": "saving", "state": "waiting"}]}

FIELD_TOTAL = {
    "id": "0193b0d2-1f00-7a01-8b02-0c03d04e05f6", "name": "total", "line_index": None, "value": "1240.00",
    "confidence": 0.3, "model_confidence": 0.92, "source_page": 2, "source_quote": "TOTAL DUE  $1,240.00",
    "flagged": True, "flag_reasons": ["Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)"],
}
FIELD_VENDOR = {
    "id": "0193b0d2-1f00-7a01-8b02-0c03d04e05f7", "name": "vendor_name", "line_index": None, "value": "Acme Supplies Ltd",
    "confidence": 0.97, "model_confidence": 0.97, "source_page": 1, "source_quote": "Acme Supplies Ltd",
    "flagged": False, "flag_reasons": [],
}

NOT_FOUND = error("404", "job_not_found", "No such job, or it belongs to another user. The same answer in both cases.")
NOT_AUTH = error("401", "not_authenticated", "No valid access token.")

ENDPOINTS = [
    endpoint(
        "create-job", "POST", f"{BASE}/jobs", "Signed in", "MVP1-E3-01",
        "Start extracting a file",
        "Starts reading a ready file into structured fields. Returns at once; the work continues in the background. Calling it again for the same file while a job is running returns that job instead of starting another.",
        [
            param("file_id", "body", "uuid", "Yes", "A file of the caller's in the Upload service, with status `ready`.", "The document to read."),
            param("schema", "body", "string", "Yes", "In version 1, only `invoice-v1`.", "Which fields to extract. Each schema has its own prompt and rule checks."),
            param("reference", "body", "string", "No", "1 to 200 characters. Opaque to Extraction.", "The caller's own label for the job, returned in its events. DocFlow sends `docflow:{document_id}`."),
        ],
        [
            "Checks the file through Upload, forwarding the caller's access token, so only the caller's own ready files can be read.",
            "If a job for this file and schema is `queued` or `processing`, returns it with `200`. Nothing new is started or charged.",
            "Otherwise records a job as `queued`, with the model ID and prompt version from configuration, and returns `202`.",
            "The job then runs in the background: fetch the file through a 5-minute Upload link, send it to Claude, check the answer, apply the rule checks, and save the fields.",
            "Temporary failures (rate limit, timeout, overload) are retried up to 2 times, after 2 and then 8 seconds. After that the job is `failed`.",
            "When the job ends, announces `extraction.job.completed` or `extraction.job.failed` to subscribed apps, and records `job.completed` or `job.failed` in the audit log.",
        ],
        [
            response("202", "A new job was started", "`job` (status `queued`). `Location`: the job's address. `Retry-After: 2`."),
            response("200", "A job for this file was already running", "That `job`."),
        ],
        [
            error("404", "file_not_found", "Upload does not know the file, or it is another user's."),
            error("409", "file_not_ready", "The file is still uploading or was rejected."),
            error("422", "unknown_schema", "`schema` is not one Extraction supports."),
            error("422", "validation_failed", "Another input is missing or malformed."),
            error("429", "rate_limited", "More than 10 jobs a minute for one user."),
            error("503", "dependency_unavailable", "Upload could not be reached to check the file. Safe to retry."),
            NOT_AUTH,
        ],
        "POST /api/extraction/v1/jobs HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"file_id": F1, "schema": "invoice-v1", "reference": f"docflow:{D1}"}, indent=2),
        "HTTP/1.1 202 Accepted\nLocation: /api/extraction/v1/jobs/" + J1 + "\nRetry-After: 2\nContent-Type: application/json\n\n"
        + json.dumps({"job": {**JOB_RUNNING, "status": "queued", "steps": [{"name": s["name"], "state": "waiting"} for s in JOB_RUNNING["steps"]]}}, indent=2),
    ),
    endpoint(
        "get-job", "GET", f"{BASE}/jobs/{{jobId}}", "Signed in", "MVP1-E3-01",
        "Check a job",
        "Where a job is, step by step. A page polls this every 2 seconds while the job runs.",
        [param("jobId", "path", "uuid", "Yes", "A UUID.", "The job.")],
        [
            "Read only.",
            "`steps[]` lists `fetching_file`, `reading_document`, `checking_rules`, `saving`, each `waiting`, `running`, `done` or `failed`.",
            "A failed job has `error_code`, a plain-language `error_message`, and `retryable`: true when starting a new job may succeed.",
            "Sends `Retry-After: 2` while the job is `queued` or `processing`.",
        ],
        [response("200", "The job exists and is the caller's", "`job`.")],
        [NOT_FOUND, NOT_AUTH],
        f"GET /api/extraction/v1/jobs/{J1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"job": JOB_EXTRACTED}, indent=2),
    ),
    endpoint(
        "get-fields", "GET", f"{BASE}/jobs/{{jobId}}/fields", "Signed in", "MVP1-E3-02",
        "Get the extracted fields",
        "Every field the job extracted, with its value, how confident the system is, and the exact text it was read from.",
        [
            param("jobId", "path", "uuid", "Yes", "A job with status `extracted`.", "The job."),
            param("flagged", "query", "boolean", "No", "`true` returns only flagged fields.", "Only what needs a person's check."),
        ],
        [
            "Read only. Fields never change after a job saves them; corrections happen in the Human Review service, on its own copy.",
            "Ordered by the schema's field order; line-item fields by `line_index`, then field.",
            "Amounts and quantities are decimal strings (`\"1240.00\"`), never floating-point numbers, so no value is rounded on the way.",
        ],
        [response("200", "The job has finished extracting", "`data[]` of fields: `id`, `name`, `line_index` (line items only), `value`, `confidence` (final), `model_confidence`, `source_page`, `source_quote`, `flagged`, `flag_reasons[]`.")],
        [NOT_FOUND, error("409", "job_not_finished", "The job is still running, or failed."), NOT_AUTH],
        f"GET /api/extraction/v1/jobs/{J1}/fields?flagged=true HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [FIELD_TOTAL]}, indent=2),
    ),
    endpoint(
        "validate", "POST", f"{BASE}/validations", "Signed in", "MVP1-E3-03",
        "Check values against a schema's rules",
        "Runs the same rule checks the job runs, on any set of values. An app uses it to re-check values after a person has corrected them.",
        [
            param("schema", "body", "string", "Yes", "`invoice-v1`.", "Which rules to apply."),
            param("values", "body", "object", "Yes", "The schema's fields by name; `line_items` as an array of objects. Amounts as decimal strings.", "The values to check."),
            param("file_id", "body", "uuid", "No", "A ready file of the caller's.", "When given, also checks that each `source_quote` in `values` appears in the file's text."),
        ],
        [
            "Runs every rule for the schema and reports each one. Stores nothing.",
            "Invoice v1 rules: line amounts add up to the subtotal (±0.01); subtotal + tax = total (±0.01); dates are real dates and the due date is not before the invoice date; the currency is an ISO 4217 code; `vendor_name`, `invoice_number`, `invoice_date`, `currency` and `total` are present; each quote appears in the document's text.",
        ],
        [response("200", "The checks ran (whether or not they passed)", "`passed` and `checks[]`: `name`, `passed`, `fields[]` involved, and a plain-language `message`.")],
        [error("422", "unknown_schema", "`schema` is not supported."), error("422", "validation_failed", "`values` is malformed."), NOT_AUTH],
        "POST /api/extraction/v1/validations HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n"
        + json.dumps({"schema": "invoice-v1", "values": {"vendor_name": "Acme Supplies Ltd", "invoice_number": "INV-0042", "invoice_date": "2026-11-02", "due_date": "2026-12-02", "currency": "USD", "subtotal": "1150.00", "tax_total": "80.00", "total": "1230.00", "line_items": [{"description": "Paper, A4", "quantity": "10", "unit_price": "115.00", "amount": "1150.00"}]}}, indent=2),
        json.dumps({"passed": True, "checks": [
            {"name": "line_amounts_match_subtotal", "passed": True, "fields": ["line_items", "subtotal"], "message": "Line amounts add up to the subtotal."},
            {"name": "subtotal_plus_tax_is_total", "passed": True, "fields": ["subtotal", "tax_total", "total"], "message": "Subtotal plus tax equals the total."},
            {"name": "dates_valid", "passed": True, "fields": ["invoice_date", "due_date"], "message": "Dates are valid and the due date is after the invoice date."},
            {"name": "currency_valid", "passed": True, "fields": ["currency"], "message": "USD is a valid currency."},
            {"name": "required_present", "passed": True, "fields": ["vendor_name", "invoice_number", "invoice_date", "currency", "total"], "message": "All required fields are present."},
        ]}, indent=2),
    ),
    endpoint(
        "admin-jobs", "GET", f"{BASE}/admin/jobs", "Admin", "MVP1-E3-05",
        "Recent jobs with cost and timing",
        "The last 100 jobs across all users, with tokens, cost and duration, and the failure rate. For the owner, to watch quality and spend.",
        [param("limit", "query", "integer", "No", "1 to 100. Default 100.", "How many jobs.")],
        ["Read only. Shows no field values and no file names: only IDs, status, model, prompt version, tokens, cost, duration and error codes."],
        [response("200", "The caller is an admin", "`data[]` of jobs and `summary`: `failure_rate`, `avg_cost_usd`, `p95_duration_ms`, `jobs`.")],
        [error("404", "not_found", "The caller is not an admin. The endpoint does not reveal that it exists."), NOT_AUTH],
        f"GET /api/extraction/v1/admin/jobs?limit=1 HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [{"id": J1, "status": "extracted", "model": "claude-sonnet-5-5", "prompt_version": "extract-invoice/v1", "pages": 2, "tokens_in": 6210, "tokens_out": 1480, "cost_usd": "0.040830", "duration_ms": 28900, "error_code": None, "created_at": "2026-11-17T09:14:12Z"}],
                    "summary": {"jobs": 100, "failure_rate": 0.02, "avg_cost_usd": "0.0412", "p95_duration_ms": 41200}}, indent=2),
    ),
    endpoint(
        "events", "POST", f"{BASE}/events", "Service", "MVP1-E1-05",
        "Receive platform events",
        "Where other services' signed events arrive. In version 1 Extraction acts on one: a user's account was deleted, so their jobs and the values read from their documents go too.",
        [
            param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body, compared in constant time.", "Proves the event came from the platform."),
            param("event_id", "body", "uuid", "Yes", "Processed once; a repeat returns `200` with no effect.", "The event's ID."),
            param("type", "body", "string", "Yes", "Version 1 acts on `identity.user.deleted`; other types are acknowledged and ignored.", "What happened."),
            param("data", "body", "object", "Yes", "For `identity.user.deleted`: `{user_id}`.", "The event's details."),
        ],
        ["For `identity.user.deleted`: deletes that user's fields (they contain document content), and keeps their jobs with only IDs, counts, tokens and cost, for the cost records."],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/extraction/v1/events HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n"
        + json.dumps({"event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "type": "identity.user.deleted", "occurred_at": "2026-11-17T10:00:00Z", "data": {"user_id": U1}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
]

EVENTS_OUT = [
    {"topic": "Events Extraction announces", "how": "`extraction.job.completed` with `{job_id, file_id, reference, fields_total, fields_flagged}`, and `extraction.job.failed` with `{job_id, file_id, reference, error_code, retryable}`. Signed and delivered with retries from the outbox to each subscribed app (DocFlow's webhook, `MVP1-E0-09`)."},
]

MODULE = {
    "slug": "extraction-with-claude",
    "docsPath": "docs/services/extraction",
    "extraDocs": [{"path": "docs/evals/EVALS.md", "label": "Eval plan: how extraction quality is measured"}],
    "labels": {"flow": "How an extraction works", "hosted": "Pages provided by an outside service"},
    "notes": {
        "journey": "What a person sees and what the system does while a document is read, in version 1.",
        "ui": "What the LLM Extraction service ships for apps to use, as the package `packages/ui-extraction`.",
        "hosted": "", "token": "",
        "schema": "The SQL for the LLM Extraction service's tables, in the `extraction` schema. No other service can read them.",
    },
    "overview": {
        "name": "LLM Extraction", "version": "Version 1 · One Claude call per document", "status": "In design", "base": BASE,
        "what": [], "why": [], "scope_in": [], "scope_out": [],
        "stories": ["MVP1-E3-01", "MVP1-E3-02", "MVP1-E3-03", "MVP1-E3-04", "MVP1-E3-05"],
    },
    "errorSample": problem("file_not_ready", "File not ready", 409, "This file is still uploading. Try again when the upload has finished."),
    "endpoints": ENDPOINTS,
    "noEndpoint": EVENTS_OUT + [
        {"topic": "The Claude call (MVP1-E3-02)", "how": "Inside the job, not an endpoint. The document goes to Claude as a document or image input with the versioned prompt `prompts/extract-invoice/v1.md`. The answer is forced into the invoice v1 schema with a tool definition, then validated with zod. A failure triggers one repair attempt; if that fails too, the job fails with `output_invalid` and nothing is stored."},
        {"topic": "Final confidence (MVP1-E3-03)", "how": "Each field's final confidence is the lower of the model's own confidence and its rule result: a failed check sets 0.3. A field under the threshold (0.85 by default, set in configuration) or failing a check is `flagged`, with each reason stored."},
        {"topic": "Where the job runs", "how": "In the Extraction service itself, continuing after the `202` response. A sweep every minute picks up any job left `queued` for over a minute, so a lost background task is not a lost job."},
        {"topic": "DocFlow's retry endpoint", "how": "`POST /api/docflow/v1/documents/{documentId}/retry-extraction` belongs to the DocFlow app. It calls `POST /jobs` again; a failed job is never restarted, a new one is created."},
        {"topic": "AI agents", "how": "Each endpoint is also a tool on Extraction's MCP server, `POST /api/extraction/mcp`, with the same inputs and errors."},
        {"topic": "Health and contract", "how": "Like every service, Extraction also serves `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`)."},
    ],
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "A job can only be started for the caller's own file, and only when Upload says it is `ready`.",
            "`schema` must be one Extraction supports; in version 1, `invoice-v1`.",
            "Only one job per file and schema can be running at a time; asking again returns the running job.",
            "Another user's job answers `404 job_not_found`, never `403`.",
            "Admin endpoints answer `404 not_found` to anyone who is not an admin.",
            "Amounts are exchanged as decimal strings, never as floating-point numbers.",
            "Events must carry a valid signature and are processed once per `event_id`.",
            "Starting rate limit at the gateway: 10 jobs a minute per user.",
        ]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": []},
        {"level": "Data model level: business rules the service guarantees", "items": []},
    ],
    "openQuestions": [
        "Rate limits are starting values to be tuned once there is real traffic.",
    ],
}
