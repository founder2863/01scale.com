"""Design of the LLM Extraction service, version 1 (one Claude call per document).

Data only: scripts/site/render.py turns MODULE into docs/services/extraction/*.md
and app/products/extraction.ts. Run `npm run site:data` after any change.
Stories: MVP1-E3-01 to MVP1-E3-05. The DocFlow endpoint in MVP1-E3-01
(retry-extraction) is designed with the DocFlow app shell, MVP1-E0-09.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "extraction"
COMPLETE = True

BASE = "/api/extraction/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"   # a user, from Identity
F1 = "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"   # a ready file, from Upload
J1 = "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b"   # a finished job
J2 = "0193b0e7-0a1b-7c2d-8e3f-4a5b6c7d8e9f"   # a failed job
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"   # DocFlow's document, as an opaque reference

JOB_EXTRACTED = {
    "id": J1, "file_id": F1, "schema": "invoice-v1", "reference": f"docflow:{D1}", "status": "extracted",
    "steps": [
        {"name": "fetching_file", "state": "done"}, {"name": "reading_text", "state": "done"},
        {"name": "reading_document", "state": "done"}, {"name": "checking_rules", "state": "done"}, {"name": "saving", "state": "done"},
    ],
    "fields_total": 19, "fields_flagged": 3, "error_code": None, "error_message": None, "retryable": False,
    "created_at": "2026-11-17T09:14:12Z", "finished_at": "2026-11-17T09:14:41Z",
}
JOB_RUNNING = {**JOB_EXTRACTED, "status": "processing", "fields_total": None, "fields_flagged": None, "finished_at": None,
               "steps": [{"name": "fetching_file", "state": "done"}, {"name": "reading_text", "state": "done"}, {"name": "reading_document", "state": "running"},
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
            "The job then runs in the background: with a delegated token for the owner, fetch the file through a 5-minute Upload link, and read its text. A PDF with a text layer gives its text directly; a scanned PDF or a photo is read by OCR (Claude transcribing each page, in a call separate from extraction so the quote check stays independent). Each page's text is saved for the quote check.",
            "If no text is found on any page, the job fails with `no_text_found` and the message 'No text found'. It is not retryable: the same file would give the same result.",
            "Otherwise it sends the document to Claude with the versioned prompt, checks the answer against the schema, applies the rule checks (including every quote against the saved text, for photos and scans too), and saves the fields.",
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
            "`steps[]` lists `fetching_file`, `reading_text`, `reading_document`, `checking_rules`, `saving`, each `waiting`, `running`, `done` or `failed`.",
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
            param("job_id", "body", "uuid", "No", "A job of the caller's that read text.", "When given, also checks that each `source_quote` in `values` appears in that job's saved page text, for scans and photos as well as text PDFs. Nothing is read again."),
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
        json.dumps({"data": [{"id": J1, "status": "extracted", "model": "claude-opus-5-5", "prompt_version": "extract-invoice/v1", "pages": 2, "tokens_in": 6210, "tokens_out": 1480, "cost_usd": "0.040830", "duration_ms": 28900, "error_code": None, "created_at": "2026-11-17T09:14:12Z"}],
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

# ------------------------------------------------------------------ data model
JOB_STATUSES = "`queued`, `processing`, `extracted`, `failed`"
ERROR_CODES = "`file_unavailable`, `document_unreadable`, `no_text_found`, `model_unavailable`, `output_invalid`, `timed_out`"

JOBS = {
    "name": "extraction.jobs",
    "purpose": "One row per attempt to read one file. A retry is a new job, so the history of attempts is kept.",
    "columns": [
        column("id", "uuid", "No", "", "Primary key. UUIDv7", "The job's ID. Other services store it as `job_id`."),
        column("owner_id", "uuid", "No", "", "", "The user whose file it is, from the access token. A plain ID."),
        column("file_id", "uuid", "No", "", "", "The file in the Upload service. A plain ID: Upload's tables are not reachable from here."),
        column("schema", "text", "No", "", "`invoice-v1` in version 1", "Which fields were extracted, and so which prompt and rules applied."),
        column("reference", "text", "Yes", "", "1 to 200 characters", "The caller's own label, returned in events. Opaque to Extraction."),
        column("status", "text", "No", "'queued'", f"One of {JOB_STATUSES}", "Where the job is."),
        column("step", "text", "Yes", "", "One of `fetching_file`, `reading_text`, `reading_document`, `checking_rules`, `saving`", "The step running now, or the step that failed. Empty while queued and after success."),
        column("attempt", "smallint", "No", "1", "1 to 3", "Which try this is within the job: the first, or one of the 2 retries after a temporary failure."),
        column("model", "text", "No", "", "1 to 100 characters", "The Claude model used, from configuration at the time (`MVP1-E3-02` AC3)."),
        column("prompt_version", "text", "No", "", "Like `extract-invoice/v1`", "The versioned prompt used, so a result can always be traced to its prompt."),
        column("pages", "smallint", "Yes", "", "1 to 10", "Pages sent to the model, from Upload."),
        column("fields_total", "smallint", "Yes", "", "0 or more; set when extracted", "How many fields were saved."),
        column("fields_flagged", "smallint", "Yes", "", "0 to `fields_total`", "How many need a person's check."),
        column("tokens_in", "integer", "Yes", "", "0 or more", "Tokens sent to the model, across the attempt and any repair (`MVP1-E3-05`)."),
        column("tokens_out", "integer", "Yes", "", "0 or more", "Tokens the model returned."),
        column("cost_usd", "numeric(10,6)", "Yes", "", "0 or more", "Estimated model cost of this job, from the tokens and the model's price per token in configuration. Six decimals because one job costs fractions of a cent."),
        column("duration_ms", "integer", "Yes", "", "0 or more", "Time from start of processing to the end, in milliseconds."),
        column("error_code", "text", "Yes", "", f"One of {ERROR_CODES}; set exactly when failed", "Why the job failed, as a stable code."),
        column("error_message", "text", "Yes", "", "Set exactly when failed", "The plain-language message a person sees."),
        column("created_at", "timestamptz", "No", "now()", "", "When the job was asked for."),
        column("started_at", "timestamptz", "Yes", "", "Not before `created_at`", "When processing began."),
        column("finished_at", "timestamptz", "Yes", "", "Set exactly when extracted or failed; not before `started_at`", "When the job ended."),
    ],
    "constraints": [], "sampleCols": [], "sampleRows": [],
}

FIELDS = {
    "name": "extraction.fields",
    "purpose": "One row per value read from a document: a header field, or one field of one line item. Never edited after it is saved: this is what the model said, and corrections live in the Human Review service.",
    "columns": [
        column("id", "uuid", "No", "", "Primary key. UUIDv7", "The field's ID."),
        column("job_id", "uuid", "No", "", "Foreign key to `extraction.jobs`, delete cascades", "The job that read it."),
        column("name", "text", "No", "", "A field of the job's schema, for example `total` or `amount`", "Which field this is."),
        column("line_index", "smallint", "Yes", "", "0 or more for line-item fields (`description`, `quantity`, `unit_price`, `amount`); empty for header fields", "Which line item, counting from 0."),
        column("value", "jsonb", "Yes", "", "A JSON string, or empty when the document does not contain the field", "The value read. Amounts and quantities are decimal strings, dates `YYYY-MM-DD`, currency a 3-letter code."),
        column("model_confidence", "numeric(3,2)", "No", "", "0 to 1", "How sure the model said it was."),
        column("confidence", "numeric(3,2)", "No", "", "0 to 1, never above `model_confidence`", "The final confidence after rule checks: the lower of the two."),
        column("source_page", "smallint", "Yes", "", "1 to the job's page count; empty when there is no value", "The page the value was read from."),
        column("source_quote", "text", "Yes", "", "1 to 500 characters; empty when there is no value", "The exact text on the page the value came from: the evidence a person checks."),
        column("flagged", "boolean", "No", "false", "True exactly when there is at least one reason", "Whether a person needs to check it."),
        column("flag_reasons", "text[]", "No", "'{}'", "Plain-language reasons", "Why it was flagged, for example 'Total ≠ subtotal + tax' or 'Low confidence (0.62)'."),
        column("created_at", "timestamptz", "No", "now()", "", "When it was saved."),
    ],
    "constraints": [], "sampleCols": [], "sampleRows": [],
}

PAGE_TEXTS = {
    "name": "extraction.page_texts",
    "purpose": "The text of each page a job read: from the PDF's text layer, or by OCR for scans and photos. Used to check that every quote is really in the document.",
    "columns": [
        column("job_id", "uuid", "No", "", "Part of the primary key; foreign key to `extraction.jobs`, delete cascades", "Which job read it."),
        column("page", "smallint", "No", "", "1 to 10; part of the primary key", "Which page."),
        column("source", "text", "No", "", "`text_layer` or `ocr`", "Where the text came from. OCR text can contain reading mistakes, which the eval set measures."),
        column("text", "text", "No", "", "Up to 100,000 characters; may be empty for a blank page", "The page's text."),
        column("created_at", "timestamptz", "No", "now()", "", "When it was read."),
    ],
    "constraints": ["`page_texts_pkey`: primary key (`job_id`, `page`)", "`page_texts_job_id_fkey`: foreign key to `extraction.jobs`, delete cascades", "`page_texts_page_check`, `page_texts_source_check`, `page_texts_text_check`"],
    "sampleCols": ["job_id", "page", "source", "text", "created_at"],
    "sampleRows": [[J1, "2", "text_layer", "Subtotal 1,150.00  Tax 80.00  TOTAL DUE  $1,240.00", "2026-11-17 09:14:15+00"]],
}

INBOUND = {
    "name": "extraction.inbound_events",
    "purpose": "One row per platform event Extraction has acted on, so a repeated delivery has no effect.",
    "columns": [
        column("event_id", "uuid", "No", "", "Primary key", "The event's ID, from the sender."),
        column("type", "text", "No", "", "1 to 100 characters", "What happened."),
        column("created_at", "timestamptz", "No", "now()", "", "When Extraction processed it."),
    ],
    "constraints": [], "sampleCols": [], "sampleRows": [],
}

DATA_MODEL_RULES = [
    "A job only ever reads a file its owner can read: the background job fetches it through Upload with a delegated token for the owner (`upload:read`, `act: service:extraction`), so Upload's ownership check applies and no user token is stored.",
    "At most one job per file and schema is `queued` or `processing` at a time, so the same document is never read or billed twice at once.",
    "A job only moves forward: `queued` → `processing` → `extracted` or `failed`. A failed job is never restarted; a retry is a new job.",
    "Fields are written once, all together, when a job succeeds, and never changed. A failed job has no fields.",
    "A field's final confidence is never higher than the model's own, and a field is flagged exactly when it has a reason.",
    "Every value that is present has a page and a quote, so a person can always see where it came from.",
    "Amounts are kept as decimal strings, never floating-point numbers.",
    "Deleting a user's account deletes their fields, which hold document content. Their jobs are kept with IDs, counts, tokens and cost only, for the cost records.",
    "Each job records the model and prompt version it used, so any result can be traced and re-run.",
]

DATA_MODEL = {
    "entities": [
        {"name": "Job", "table": "`extraction.jobs`", "what": "One attempt to read one file into fields.", "relations": "Belongs to one user and one file, both by ID only. Has many fields."},
        {"name": "Field", "table": "`extraction.fields`", "what": "One value read from the document, with its confidence and evidence.", "relations": "Belongs to one job; deleted with it."},
        {"name": "Processed event", "table": "`extraction.inbound_events`", "what": "A platform event already acted on.", "relations": "Stands alone."},
        {"name": "Prompt", "table": "(file `prompts/extract-invoice/v1.md`)", "what": "The versioned instructions sent to the model.", "relations": "Named on each job by `prompt_version`. A changed prompt is a new version with its own eval report."},
    ],
    "lifecycles": [
        {"name": "Job", "text": "`queued` when asked for → `processing` when the background work starts → `extracted` when its fields are saved, or `failed` after the last retry. A job left `queued` for a minute is picked up by the sweep."},
        {"name": "Field", "text": "Created with all its job's fields in one step → never changed → deleted only with its job or its owner's account."},
        {"name": "The document's content", "text": "Fetched through a 5-minute Upload link into memory, then dropped. Only each page's text is saved (`extraction.page_texts`), for the quote check."},
        {"name": "Page text", "text": "Saved when the job reads the document → never changed → deleted with its job or its owner's account. It stays inside the owner's account like every other record (privacy rule on #41)."},
    ],
    "notStored": [
        "The document itself: it stays in the Upload service. Only its page text is kept, for the quote check.",
        "The model's raw answer: only the validated fields are saved, so invalid output is never kept.",
        "The prompt text on each job: only its version; the text lives in `prompts/`.",
        "Document content in logs: logs carry IDs, counts and timings only.",
    ],
    "otherTables": "The service template also gives Extraction `audit_events`, `idempotency_keys` and `outbound_events`. Extraction writes `job.created`, `job.completed` and `job.failed` to `audit_events`, and announces `extraction.job.completed` and `extraction.job.failed` through `outbound_events`. `POST /jobs` needs no idempotency key: a second call for the same file returns the running job.",
}

# ------------------------------------------------------------------ schema
JOBS["constraints"] = [
    "`jobs_pkey`: primary key (`id`)",
    "`jobs_schema_check`: `schema` is `invoice-v1`",
    "`jobs_status_check`, `jobs_step_check`, `jobs_error_code_check`: only the listed values",
    "`jobs_attempt_check`: `attempt` between 1 and 3",
    "`jobs_failed_check`: `error_code` and `error_message` are set exactly when `status` is `failed`",
    "`jobs_finished_check`: `finished_at` is set exactly when `status` is `extracted` or `failed`",
    "`jobs_extracted_check`: an extracted job has `fields_total`, `fields_flagged`, tokens, cost and duration, and `fields_flagged` ≤ `fields_total`",
    "`jobs_numbers_check`: pages 1 to 10; counts, tokens, cost and duration never negative",
    "`jobs_dates_check`: `started_at` not before `created_at`; `finished_at` not before `started_at`",
    "`jobs_active_file_idx`: unique (`file_id`, `schema`) where `status` in (`queued`, `processing`), so the same file is never read twice at once",
    "`jobs_owner_id_idx`: index on (`owner_id`, `created_at` desc), for a user's jobs",
    "`jobs_created_at_idx`: index on (`created_at` desc), for the admin's recent jobs",
    "`jobs_queued_idx`: partial index on (`created_at`) where `status = 'queued'`, for the sweep",
]
JOBS["sampleCols"] = ["id", "owner_id", "file_id", "schema", "reference", "status", "step", "attempt", "model", "prompt_version", "pages", "fields_total", "fields_flagged", "tokens_in", "tokens_out", "cost_usd", "duration_ms", "error_code", "error_message", "created_at", "started_at", "finished_at"]
JOBS["sampleRows"] = [
    [J1, U1, F1, "invoice-v1", f"docflow:{D1}", "extracted", "(empty)", "1", "claude-opus-5-5", "extract-invoice/v1", "2", "19", "3", "6210", "1480", "0.040830", "28900", "(empty)", "(empty)", "2026-11-17 09:14:12+00", "2026-11-17 09:14:12+00", "2026-11-17 09:14:41+00"],
    [J2, U1, "0193b0e6-77aa-7b11-9c22-3d4e5f6a7b8c", "invoice-v1", "(empty)", "failed", "reading_document", "3", "claude-opus-5-5", "extract-invoice/v1", "1", "(empty)", "(empty)", "(empty)", "(empty)", "(empty)", "(empty)", "model_unavailable", "Reading this document is taking longer than usual. Try again in a few minutes.", "2026-11-17 09:30:00+00", "2026-11-17 09:30:01+00", "2026-11-17 09:30:22+00"],
]
FIELDS["constraints"] = [
    "`fields_pkey`: primary key (`id`)",
    "`fields_job_id_fkey`: foreign key (`job_id`) references `extraction.jobs` on delete cascade",
    "`fields_job_name_line_key`: unique (`job_id`, `name`, `line_index`) with nulls not distinct, so a header field cannot appear twice in one job",
    "`fields_name_check`: `name` is one of the invoice v1 fields",
    "`fields_line_index_check`: `line_index` is set exactly for line-item fields, and is not negative",
    "`fields_confidence_check`: both confidences between 0 and 1, and `confidence` ≤ `model_confidence`",
    "`fields_evidence_check`: a present value has `source_page` and `source_quote`; an absent one has neither",
    "`fields_quote_check`: `source_quote` 1 to 500 characters",
    "`fields_flagged_check`: `flagged` is true exactly when `flag_reasons` is not empty",
    "`fields_flagged_idx`: partial index on (`job_id`) where `flagged`, for the review queue",
]
FIELDS["sampleCols"] = ["id", "job_id", "name", "line_index", "value", "model_confidence", "confidence", "source_page", "source_quote", "flagged", "flag_reasons", "created_at"]
FIELDS["sampleRows"] = [
    [FIELD_VENDOR["id"], J1, "vendor_name", "(empty)", '"Acme Supplies Ltd"', "0.97", "0.97", "1", "Acme Supplies Ltd", "false", "{}", "2026-11-17 09:14:41+00"],
    [FIELD_TOTAL["id"], J1, "total", "(empty)", '"1240.00"', "0.92", "0.30", "2", "TOTAL DUE  $1,240.00", "true", '{"Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)"}', "2026-11-17 09:14:41+00"],
    ["0193b0d2-1f00-7a01-8b02-0c03d04e05f8", J1, "amount", "0", '"1150.00"', "0.95", "0.95", "1", "Paper, A4   10   115.00   1,150.00", "false", "{}", "2026-11-17 09:14:41+00"],
    ["0193b0d2-1f00-7a01-8b02-0c03d04e05f9", J1, "vendor_tax_id", "(empty)", "(empty)", "0.80", "0.62", "(empty)", "(empty)", "true", '{"Low confidence (0.62)"}', "2026-11-17 09:14:41+00"],
]
INBOUND["constraints"] = ["`inbound_events_pkey`: primary key (`event_id`)", "`inbound_events_type_check`: `type` is 1 to 100 characters"]
INBOUND["sampleCols"] = ["event_id", "type", "created_at"]
INBOUND["sampleRows"] = [["0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "identity.user.deleted", "2026-11-17 10:00:01+00"]]

HEADER_FIELDS = "'vendor_name', 'vendor_address', 'vendor_tax_id', 'invoice_number', 'invoice_date', 'due_date', 'bill_to_name', 'bill_to_address', 'currency', 'subtotal', 'tax_total', 'total', 'payment_terms'"
LINE_FIELDS = "'description', 'quantity', 'unit_price', 'amount'"

DDL = f"""-- LLM Extraction service, version 1. Schema: extraction.
-- IDs are UUIDv7 values generated by the service.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists extraction;

create table extraction.jobs (
  id             uuid          primary key,
  owner_id       uuid          not null,
  file_id        uuid          not null,
  schema         text          not null,
  reference      text,
  status         text          not null default 'queued',
  step           text,
  attempt        smallint      not null default 1,
  model          text          not null,
  prompt_version text          not null,
  pages          smallint,
  fields_total   smallint,
  fields_flagged smallint,
  tokens_in      integer,
  tokens_out     integer,
  cost_usd       numeric(10,6),
  duration_ms    integer,
  error_code     text,
  error_message  text,
  created_at     timestamptz   not null default now(),
  started_at     timestamptz,
  finished_at    timestamptz,

  constraint jobs_schema_check check (schema in ('invoice-v1')),
  constraint jobs_reference_check check (length(reference) between 1 and 200),
  constraint jobs_status_check check (status in ('queued', 'processing', 'extracted', 'failed')),
  constraint jobs_step_check
    check (step in ('fetching_file', 'reading_text', 'reading_document', 'checking_rules', 'saving')),
  constraint jobs_attempt_check check (attempt between 1 and 3),
  constraint jobs_model_check check (length(model) between 1 and 100 and length(prompt_version) between 1 and 100),
  constraint jobs_error_code_check check (error_code in
    ('file_unavailable', 'document_unreadable', 'no_text_found', 'model_unavailable', 'output_invalid', 'timed_out')),
  constraint jobs_failed_check check (
    (status = 'failed') = (error_code is not null)
    and (error_code is null) = (error_message is null)
  ),
  constraint jobs_finished_check check ((status in ('extracted', 'failed')) = (finished_at is not null)),
  constraint jobs_extracted_check check (
    status <> 'extracted'
    or (fields_total is not null and fields_flagged between 0 and fields_total
        and tokens_in is not null and tokens_out is not null
        and cost_usd is not null and duration_ms is not null)
  ),
  constraint jobs_numbers_check check (
    (pages is null or pages between 1 and 10)
    and coalesce(fields_total, 0) >= 0 and coalesce(tokens_in, 0) >= 0
    and coalesce(tokens_out, 0) >= 0 and coalesce(cost_usd, 0) >= 0
    and coalesce(duration_ms, 0) >= 0
  ),
  constraint jobs_dates_check check (
    (started_at is null or started_at >= created_at)
    and (finished_at is null or finished_at >= coalesce(started_at, created_at))
  )
);

-- One running job per file and schema: a second request returns the first.
create unique index jobs_active_file_idx on extraction.jobs (file_id, schema)
  where status in ('queued', 'processing');
-- A user's jobs; the admin's recent jobs; the sweep of jobs left queued.
create index jobs_owner_id_idx on extraction.jobs (owner_id, created_at desc);
create index jobs_created_at_idx on extraction.jobs (created_at desc);
create index jobs_queued_idx on extraction.jobs (created_at) where status = 'queued';

create table extraction.fields (
  id               uuid         primary key,
  job_id           uuid         not null,
  name             text         not null,
  line_index       smallint,
  value            jsonb,
  model_confidence numeric(3,2) not null,
  confidence       numeric(3,2) not null,
  source_page      smallint,
  source_quote     text,
  flagged          boolean      not null default false,
  flag_reasons     text[]       not null default '{{}}',
  created_at       timestamptz  not null default now(),

  constraint fields_job_id_fkey foreign key (job_id)
    references extraction.jobs (id) on delete cascade,
  constraint fields_job_name_line_key unique nulls not distinct (job_id, name, line_index),
  constraint fields_name_check check (name in ({HEADER_FIELDS}, {LINE_FIELDS})),
  constraint fields_line_index_check check (
    (name in ({LINE_FIELDS})) = (line_index is not null)
    and (line_index is null or line_index >= 0)
  ),
  constraint fields_confidence_check check (
    model_confidence between 0 and 1
    and confidence between 0 and 1
    and confidence <= model_confidence
  ),
  constraint fields_evidence_check check (
    (value is null) = (source_quote is null)
    and (source_quote is null) = (source_page is null)
  ),
  constraint fields_quote_check check (length(source_quote) between 1 and 500),
  constraint fields_flagged_check check (flagged = (cardinality(flag_reasons) > 0))
);

-- The fields a person must check, for the review queue.
create index fields_flagged_idx on extraction.fields (job_id) where flagged;

-- The text of each page, for the quote check. Deleted with the job.
create table extraction.page_texts (
  job_id     uuid        not null,
  page       smallint    not null,
  source     text        not null,
  text       text        not null,
  created_at timestamptz not null default now(),

  constraint page_texts_pkey primary key (job_id, page),
  constraint page_texts_job_id_fkey foreign key (job_id)
    references extraction.jobs (id) on delete cascade,
  constraint page_texts_page_check check (page between 1 and 10),
  constraint page_texts_source_check check (source in ('text_layer', 'ocr')),
  constraint page_texts_text_check check (length(text) <= 100000)
);

create table extraction.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now(),

  constraint inbound_events_type_check check (length(type) between 1 and 100)
);

-- The service's database login reaches only this schema. Fields are deleted only
-- with their owner's account; audit events can be added and read, never changed.
grant usage on schema extraction to extraction_service;
grant select, insert, update on extraction.jobs to extraction_service;
grant select, insert, delete on extraction.fields, extraction.page_texts to extraction_service;
grant select, insert on extraction.inbound_events to extraction_service;
grant select, insert on extraction.audit_events to extraction_service;
"""

QUERIES = [
    {"title": "Start a job, or find the running one (`POST /jobs`)",
     "sql": "insert into extraction.jobs (id, owner_id, file_id, schema, reference, model, prompt_version)\nvalues ($1, $2, $3, $4, $5, $6, $7)\non conflict (file_id, schema) where status in ('queued', 'processing')\ndo nothing\nreturning *;\n-- no row returned: a job is already running; read it and answer 200"},
    {"title": "The fields a person must check (`GET /jobs/{jobId}/fields?flagged=true`)",
     "sql": "select f.*\nfrom extraction.fields f\njoin extraction.jobs j on j.id = f.job_id\nwhere f.job_id = $1 and j.owner_id = $2 and f.flagged\norder by f.confidence;"},
    {"title": "Recent jobs and failure rate (`GET /admin/jobs`)",
     "sql": "select id, status, model, prompt_version, pages, tokens_in, tokens_out, cost_usd, duration_ms, error_code\nfrom extraction.jobs\norder by created_at desc\nlimit 100;"},
]

SCHEMA_RULES = [
    "One running job per file and schema, enforced by a partial unique index.",
    "A field name appears once per job, and once per line item for line-item fields (nulls not distinct).",
    "A failed job always has an error code and message; a finished job always has an end time; an extracted job always has its counts, tokens, cost and duration.",
    "Final confidence can never exceed the model's own; a flagged field always has a reason.",
    "A value that is present always has its page and quote.",
    "Extraction's database login can reach only the `extraction` schema, and cannot delete jobs.",
]

# ------------------------------------------------------------------ user journeys
JOURNEYS = [
    journey(
        "Watch a document being read", "Someone who has just uploaded an invoice",
        "The app starts extraction after the upload.", ["MVP1-E3-01", "MVP1-E3-02", "MVP1-E3-04"],
        [
            ("Sees 'Reading your document' with four steps: getting the file, reading it, checking the numbers, saving.", "Extraction records the job as `queued` and starts it in the background."),
            ("Watches each step tick off, without the page reloading.", "The page asks for the job's status every 2 seconds; each step is marked `done` as it ends."),
            ("Sees the document on the left and the fields on the right, each with a coloured confidence badge.", "Claude has read the document; the answer passed its schema check; the rule checks ran and the fields were saved. The job is `extracted`."),
            ("Sees 'Review 3 flagged fields' or, if none, 'Continue to results'.", "The app reads the flagged count from the job and offers the next step."),
        ],
        "Every value on the invoice is on screen, with how sure the system is and where it came from. Typically under a minute for a short invoice.",
    ),
    journey(
        "Check where a value came from", "Someone looking at an extracted value", "Taps a field.", ["MVP1-E3-04"],
        [
            ("Taps the Total field, marked red.", "The field's page, quote and reasons are already on the page from the fields request."),
            ("Sees 'TOTAL DUE $1,240.00, page 2' and the reason 'Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)'.", "Nothing new is fetched."),
            ("On a computer, sees the document jump to page 2.", "The app moves its document preview to the field's page."),
        ],
        "The person can judge the value themselves, with the evidence in front of them.",
    ),
    journey(
        "Extraction fails, then a retry works", "Someone whose extraction hit a problem", "The model is overloaded.", ["MVP1-E3-01"],
        [
            ("Sees the reading step take a little longer than usual.", "Claude reported overload. Extraction waits 2 seconds and tries again, then 8 seconds and tries once more."),
            ("Sees 'Reading this document is taking longer than usual. Try again in a few minutes.' and a Retry button.", "Both retries failed. The job is `failed` with `model_unavailable`, marked retryable. Nothing was charged twice."),
            ("Taps Retry a few minutes later.", "The app starts a new job for the same file. The failed job stays in the history."),
            ("Sees the steps run again and the fields appear.", "The new job succeeds."),
        ],
        "The person recovers with one tap. Each attempt is recorded with its cost.",
    ),
    journey(
        "Look at cost and speed", "The owner (admin)", "Opens the jobs page.", ["MVP1-E3-05"],
        [
            ("Opens `/admin/jobs`.", "Extraction checks the caller is an admin; anyone else gets 'not found'."),
            ("Sees the last 100 jobs with model, prompt version, pages, tokens, cost and time, and the failure rate, average cost and slowest times at the top.", "The figures come from each job's record. No document content or file names are shown."),
        ],
        "The owner can see whether extraction stays under its targets: 60 seconds and $0.10 per document.",
    ),
]

EDGE_CASES = [
    {"situation": "The model is overloaded or rate-limited after both retries", "sees": "'Reading this document is taking longer than usual. Try again in a few minutes.' with Retry.", "code": "`model_unavailable`"},
    {"situation": "The model's answer does not fit the schema, even after one repair", "sees": "'We couldn't read this document reliably. Try again, or upload a clearer copy.'", "code": "`output_invalid`"},
    {"situation": "The file cannot be opened, for example a damaged or password-protected PDF", "sees": "'We couldn't open this document. Upload another copy.'", "code": "`document_unreadable`"},
    {"situation": "No text is found, even by OCR: a blank page, or a photo too blurred or dark to read", "sees": "'No text found' and Choose another file. No Retry: the same file would give the same result.", "code": "`no_text_found`"},
    {"situation": "The job takes longer than its limit", "sees": "'Reading took too long. Try again.' with Retry.", "code": "`timed_out`"},
    {"situation": "The file was deleted or expired before it could be read", "sees": "'This file is no longer available. Upload it again.'", "code": "`file_unavailable`"},
    {"situation": "Starts extraction on a file still uploading", "sees": "'This file is still uploading.'", "code": "`file_not_ready`"},
    {"situation": "Asks for fields while the job is still running", "sees": "The steps continue; the fields appear when ready.", "code": "`job_not_finished`"},
    {"situation": "Follows a link to someone else's job", "sees": "'Not found.'", "code": "`job_not_found`"},
    {"situation": "Upload cannot be reached when starting", "sees": "'Something went wrong starting. Try again.'", "code": "`dependency_unavailable`"},
    {"situation": "Starts more than 10 extractions in a minute", "sees": "'Too many at once. Wait a moment and try again.'", "code": "`rate_limited`"},
]

# ------------------------------------------------------------------ UI components
UI_RULES = [
    "Components call only the LLM Extraction API. The document preview beside them belongs to the app, which gets the file from the Upload service.",
    "They ship as the package `packages/ui-extraction` and work in any app and for any schema; field labels come from the schema, not from DocFlow.",
    "Confidence is shown by colour and by words and numbers together, never colour alone: green 'High' from 0.85, amber 'Check' from 0.6, red 'Low' below 0.6.",
    "Polling stops as soon as a job ends, and pauses while the browser tab is hidden.",
    "Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.",
    "Keyboard reachable, visible focus, labelled controls, step changes announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.",
]

COMPONENTS = [
    component(
        "ExtractionProgress", "Component",
        "The four steps of a running job, ticking off as they finish, with the outcome at the end.",
        [
            ("jobId", "string", "The job to follow."),
            ("onFinished", "(job) => void", "Called once when the job is `extracted` or `failed`."),
        ],
        ["Queued: all steps waiting", "Running: done steps ticked, the current one animated", "Extracted: all ticked", "Failed: the failed step marked, the message, and Retry when `retryable`", "Lost connection: 'Reconnecting…' while polling retries"],
        ["`GET /jobs/{jobId}` every 2 seconds while running"],
    ),
    component(
        "useExtractionJob()", "Hook",
        "Starts a job or follows an existing one, and reports its status, for an app with its own design.",
        [("fileId or jobId", "string", "Start a job for a file, or follow a job already started."), ("schema", "string, optional", "Default `invoice-v1`.")],
        ["`starting`", "`queued`", "`processing` with the current step", "`extracted` with counts", "`failed` with code, message and `retryable`"],
        ["`POST /jobs`", "`GET /jobs/{jobId}`"],
    ),
    component(
        "FieldList", "Component",
        "The extracted fields grouped as header and line items, each with its value, a confidence badge and a flag when it needs checking.",
        [
            ("jobId", "string", "The job whose fields to show."),
            ("onSelect", "(field) => void, optional", "Called when a field is tapped, for example to move the app's preview to its page."),
            ("flaggedOnly", "boolean, optional", "Show only flagged fields. Default false."),
        ],
        ["Loading: placeholder rows of the same height", "Loaded: header fields, then a table of line items", "A field not on the document: 'Not found on the document'", "Failed: 'Couldn't load the fields.' and Retry"],
        ["`GET /jobs/{jobId}/fields`"],
    ),
    component(
        "ConfidenceBadge", "Component",
        "A small label showing how sure the system is about one value.",
        [("confidence", "number 0 to 1", "The field's final confidence."), ("flagged", "boolean", "Whether the field needs checking.")],
        ["High (green, from 0.85)", "Check (amber, 0.6 to 0.85)", "Low (red, below 0.6)", "Flagged: adds a flag icon whatever the score"],
        ["None: it shows the value it is given."],
    ),
    component(
        "FieldEvidence", "Component",
        "For one field: the exact quote from the document, its page, and why it was flagged.",
        [("field", "Field", "The field from the fields request.")],
        ["With quote and page", "No value: 'Not found on the document'", "With reasons: each reason as a sentence"],
        ["None: the evidence comes with the fields."],
    ),
    component(
        "NextStepButton", "Component",
        "'Review N flagged fields' when anything is flagged, otherwise 'Continue'. The app decides where each goes.",
        [("job", "Job", "The finished job."), ("onReview, onContinue", "functions", "Where to go next.")],
        ["Flagged: 'Review 3 flagged fields'", "Nothing flagged: 'Continue to results'", "Disabled while the job runs"],
        ["None: it reads `fields_flagged` from the job."],
    ),
    component(
        "JobsTable", "Component",
        "For an admin: recent jobs with model, prompt version, pages, tokens, cost, time and outcome, with the summary on top.",
        [("limit", "number, optional", "How many jobs. Default 100.")],
        ["Loading", "Loaded, with failure rate, average cost and slowest time", "Not an admin: 'Not found'", "Failed: Retry"],
        ["`GET /admin/jobs`"],
    ),
]

# ------------------------------------------------------------------ read me
OVERVIEW_WHAT = [
    "LLM Extraction is the platform service that reads a document and returns what it says as structured fields. In DocFlow it turns an uploaded invoice into the vendor, dates, amounts and line items.",
    "In version 1 it sends the document to Claude once, with a versioned prompt and a strict output schema. Every value comes back with how confident the model is, the page it is on and the exact text it was read from.",
    "It does not trust the model on its own word. The answer must fit the schema, the numbers must add up, the dates must make sense and every quote must really be in the document. Anything that fails, or that the model is unsure about, is flagged for a person to check.",
]

OVERVIEW_WHY = [
    {"title": "One way to read documents", "text": "Every app that needs data from a document uses the same service, the same checks and the same measured quality, instead of each writing its own prompts."},
    {"title": "Honest about what it does not know", "text": "Flagging the uncertain fields lets a person check a few values instead of all of them, and keeps silent mistakes out of the results."},
    {"title": "Evidence for every value", "text": "A page and a quote with every value means a person can verify it in seconds, and a hallucinated value fails the quote check."},
    {"title": "Measured, not guessed", "text": "Each job records its model, prompt version, tokens, cost and time, and the eval set measures accuracy before any prompt or model change ships."},
]

SCOPE_IN = [
    "Read one document of up to 10 pages (PDF, PNG or JPEG) into the invoice v1 fields, including scanned PDFs and photos, which are read by OCR",
    "'No text found' when a document has no readable text",
    "A confidence score, page and quote for every value",
    "Rule checks: amounts, dates, currency, required fields and quotes",
    "Flag fields below the threshold or failing a check, with reasons",
    "Retry temporary failures twice, then fail with a plain-language message",
    "Re-run the rule checks on corrected values",
    "Cost, tokens and time per job, and a recent-jobs view for the admin",
]

SCOPE_OUT = [
    "Several documents in parallel, and an orchestrated pipeline on AWS Lambda: `MVP2-E9-02`",
    "A second model judging the first: `MVP2-E10`",
    "Enriching vendor details from the web: `MVP2-E11-01`",
    "Document types other than invoices: a later version, with a new schema and prompt",
    "Correcting values: that is the Human Review service",
]

FLOW = [
    {"who": "App", "what": "Calls `POST /jobs` with a ready file's ID and the schema. In DocFlow this happens right after the upload."},
    {"who": "LLM Extraction", "what": "Checks the file through Upload with the user's own token, records the job as `queued` and answers `202` at once."},
    {"who": "LLM Extraction", "what": "In the background, fetches the file through a 5-minute Upload link and sends it to Claude with the versioned prompt and a tool definition that forces the invoice v1 schema."},
    {"who": "Claude", "what": "Returns every field with a value, confidence, page and quote."},
    {"who": "LLM Extraction", "what": "Validates the answer (one repair attempt if needed), runs the rule checks, sets each field's final confidence, flags what needs a person, and saves the fields with the tokens, cost and time."},
    {"who": "LLM Extraction", "what": "Announces `extraction.job.completed` (or `failed`) to the app."},
    {"who": "App", "what": "Has been polling `GET /jobs/{jobId}` every 2 seconds; shows the fields and offers review of the flagged ones."},
]

CONCEPTS = [
    {"term": "Job", "meaning": "One attempt to read one file. A retry is a new job."},
    {"term": "Schema", "meaning": "The list of fields to extract, with their types. Version 1 has one: `invoice-v1`."},
    {"term": "Model confidence", "meaning": "How sure Claude says it is about a value. Known to be poorly calibrated, so it is never used alone."},
    {"term": "Final confidence", "meaning": "The lower of the model's confidence and the rule checks' result; a failed check sets 0.3."},
    {"term": "Flagged", "meaning": "Below the threshold (0.85 by default) or failing a check: a person should look at it."},
    {"term": "Source quote", "meaning": "The exact text on the page a value was read from."},
    {"term": "Repair attempt", "meaning": "When the model's answer does not fit the schema, it is sent back once with the errors to fix them."},
]

QUICKSTART = [
    {"title": "Extract a file and follow it", "text": "Start the job, then poll until it ends. Asking twice for the same file returns the same job.",
     "lang": "ts", "code": 'const { job } = await api.post("/api/extraction/v1/jobs", {\n  file_id: fileId, schema: "invoice-v1",\n});\nlet current = job;\nwhile (current.status === "queued" || current.status === "processing") {\n  await sleep(2000);\n  current = (await api.get(`/api/extraction/v1/jobs/${job.id}`)).job;\n}'},
    {"title": "Show only what needs checking", "text": "Ask for the flagged fields; each carries its reasons and evidence.",
     "lang": "ts", "code": 'const { data } = await api.get(`/api/extraction/v1/jobs/${jobId}/fields?flagged=true`);\nfor (const f of data) console.log(f.name, f.value, f.flag_reasons, f.source_quote);'},
    {"title": "Re-check corrected values", "text": "Run the same rules on values a person has fixed, before accepting them.",
     "lang": "ts", "code": 'const { passed, checks } = await api.post("/api/extraction/v1/validations", {\n  schema: "invoice-v1", values: correctedValues,\n});\nif (!passed) showProblems(checks.filter((c) => !c.passed));'},
    {"title": "Show progress with the component", "text": "Drop in the progress view and decide what happens when it ends.",
     "lang": "tsx", "code": 'import { ExtractionProgress } from "@01scale/ui-extraction";\n\n<ExtractionProgress jobId={jobId} onFinished={(job) => setJob(job)} />'},
]

ENV = [
    {"name": "EXTRACTION_DATABASE_URL", "value": "Neon connection string for the `extraction_service` role", "secret": "Yes"},
    {"name": "ANTHROPIC_API_KEY", "value": "The Claude API key", "secret": "Yes"},
    {"name": "EXTRACTION_MODEL", "value": "The Claude model ID; default `claude-opus-5-5` (Nikhil's decision on #34). Used for OCR and extraction, and saved on each job. A change needs an eval report.", "secret": "No"},
    {"name": "EXTRACTION_PROMPT_VERSION", "value": "`extract-invoice/v1`: a file in `prompts/`. Saved on each job.", "secret": "No"},
    {"name": "MODEL_PRICE_INPUT_PER_MTOK, MODEL_PRICE_OUTPUT_PER_MTOK", "value": "The model's price per million tokens, from Anthropic's price list, for the cost estimate", "secret": "No"},
    {"name": "FLAG_THRESHOLD", "value": "`0.85`: fields below it are flagged. Tuned with the eval set.", "secret": "No"},
    {"name": "UPLOAD_API_URL", "value": "Where the Upload service is reached", "secret": "No"},
    {"name": "IDENTITY_JWKS_URL", "value": "`https://01scale.com/api/identity/v1/jwks`", "secret": "No"},
    {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64: signs and verifies platform events", "secret": "Yes"},
    {"name": "EVENT_ROUTES", "value": "From the service template: reference prefix → the app's event address (decision on #13)", "secret": "No"},
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
        "name": "LLM Extraction", "version": "Version 1 · One Claude call per document", "status": "Designed, not built", "uiStatus": "UI components built in `@01scale/ui-extraction` 0.3.0, against a stand-in client; the service is designed, not built", "base": BASE,
        "what": OVERVIEW_WHAT, "why": OVERVIEW_WHY, "scope_in": SCOPE_IN, "scope_out": SCOPE_OUT,
        "stories": ["MVP1-E3-01", "MVP1-E3-02", "MVP1-E3-03", "MVP1-E3-04", "MVP1-E3-05"],
    },
    "flow": FLOW,
    "concepts": CONCEPTS,
    "quickstart": QUICKSTART,
    "env": ENV,
    "errorSample": problem("file_not_ready", "File not ready", 409, "This file is still uploading. Try again when the upload has finished."),
    "endpoints": ENDPOINTS,
    "tables": [JOBS, FIELDS, PAGE_TEXTS, INBOUND],
    "entities": DATA_MODEL["entities"],
    "lifecycles": DATA_MODEL["lifecycles"],
    "otherTables": DATA_MODEL["otherTables"],
    "notStored": DATA_MODEL["notStored"],
    "ddl": DDL,
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "uiRules": UI_RULES,
    "components": COMPONENTS,
    "queries": QUERIES,
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
        {"level": "Schema level: enforced by the database, whatever the code does", "items": SCHEMA_RULES},
        {"level": "Data model level: business rules the service guarantees", "items": DATA_MODEL_RULES},
    ],
    "openQuestions": [
        "Rate limits are starting values to be tuned once there is real traffic.",
        "Decided by Nikhil on 17 Nov 2026: Claude Opus 5.5 is the default model (#34); scans and photos are in scope, read by OCR, with 'No text found' when there is no text (#34, #35); Upload ships the preview the extraction page uses (#36).",
        "OCR uses Claude itself, so no second vendor is needed. AWS Textract is the alternative if OCR accuracy or cost on the eval set's scanned cases misses its targets.",
        "Opus 5.5 costs more per token than the earlier sample model; the eval set measures whether it stays within $0.10 per document.",
        "Decided by Nikhil on 17 Nov 2026 (#65): photo values are not capped. A person can always see every value, flagged or not, through 'Show all fields' in review, so the minimal implementation is kept. (Later, #80 adds OCR, which lets the quote check run on photos as well.)",
    ],
}
