"""Design of the DocFlow app, version 1: the thin app that connects the services.

Data only: scripts/site/render.py turns MODULE into docs/services/docflow/*.md and
app/products/docflow.ts (shown on the "JSON and CSV output" product page, the part
of the journey DocFlow itself owns). Run `npm run site:data` after any change.
Stories: MVP1-E0-09 (app shell) and DocFlow's parts of MVP1-E1-05, E2-02, E2-03,
E2-05, E3-01, E4-03, E5-01 to E5-04, E6-01, E7-01 and E7-02.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "docflow"
COMPLETE = True

BASE = "/api/docflow/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"
F1 = "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"
J1 = "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b"
T1 = "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b"
O1 = "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f"
JF = "0193b0f5-1111-7222-8333-444455556666"
CF = "0193b0f5-1111-7222-8333-444455556667"
DOC_PAID = {"id": D1, "file_name": "acme-invoice-0042.pdf", "status": "paid", "next_action": "download", "file_id": F1, "job_id": J1,
            "review_task_id": T1, "order_id": O1, "created_at": "2026-11-17T09:14:07Z", "updated_at": "2026-11-17T09:17:03Z"}
NOT_FOUND = error("404", "document_not_found", "No such document, or it belongs to another user. The same answer in both cases.")
NOT_AUTH = error("401", "not_authenticated", "No valid access token.")
DEP = error("503", "dependency_unavailable", "A platform service could not be reached. Nothing was changed; safe to retry.")


def doc_endpoint(id, method, path, story, title, summary, params, behaviour, responses, errors, req, resp, access="Signed in"):
    return endpoint(id, method, f"{BASE}{path}", access, story, title, summary, params, behaviour, responses, errors, req, resp)


ID = [param("documentId", "path", "uuid", "Yes", "A document of the caller's.", "The document.")]
H = "Host: 01scale.com\nAuthorization: Bearer <access token>"

ENDPOINTS = [
    doc_endpoint("create-document", "POST", "/documents", "MVP1-E2-02", "Start a document",
        "Starts the DocFlow process for one invoice: creates the document and its upload in the Upload service with DocFlow's limits.",
        [param("file_name", "body", "string", "Yes", "As Upload's.", "The invoice's name."), param("mime", "body", "string", "Yes", "`application/pdf`, `image/png` or `image/jpeg`.", "Its type."),
         param("size", "body", "integer", "Yes", "1 to 10 MB.", "Its size."), param("Idempotency-Key", "header", "string", "No", "1 to 255 characters.", "Makes a retry safe.")],
        ["Calls Upload `POST /files` with the caller's token and `accept` = PDF, PNG, JPEG, 10 MB, 10 pages.", "Records the document as `pending_upload` with the file's ID; returns Upload's upload link."],
        [response("201", "Created", "`document` and `upload` (Upload's link and headers).")],
        [error("413", "file_too_large", "Passed on from Upload."), error("415", "unsupported_file_type", "Passed on from Upload."), error("422", "validation_failed", "An input is malformed."), DEP, NOT_AUTH],
        f"POST {BASE}/documents HTTP/1.1\n{H}\nContent-Type: application/json\n\n" + json.dumps({"file_name": "acme-invoice-0042.pdf", "mime": "application/pdf", "size": 248913}, indent=2),
        json.dumps({"document": {**DOC_PAID, "status": "pending_upload", "next_action": "upload", "job_id": None, "review_task_id": None, "order_id": None}, "upload": {"url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/users/…/original.pdf?X-Amz-Signature=…", "method": "PUT", "headers": {"Content-Type": "application/pdf", "Content-Length": "248913"}, "expires_at": "2026-11-17T09:19:07Z"}}, indent=2)),
    doc_endpoint("upload-complete", "POST", "/documents/{documentId}/upload-complete", "MVP1-E2-03", "Confirm the upload and start extraction",
        "Called by the upload component when the bytes are sent.", ID,
        ["Calls Upload `POST /files/{fileId}/complete`. If the file is rejected, the document is `rejected` with Upload's reason.", "If ready, calls Extraction `POST /jobs` with `reference: docflow:{documentId}` and sets the document `extracting`.", "Idempotent: a document already past this step is returned unchanged."],
        [response("200", "The upload was checked", "`document` with status `extracting` or `rejected`.")],
        [NOT_FOUND, error("409", "upload_missing", "Passed on from Upload: the file has not arrived."), DEP, NOT_AUTH],
        f"POST {BASE}/documents/{D1}/upload-complete HTTP/1.1\n{H}", json.dumps({"document": {**DOC_PAID, "status": "extracting", "next_action": "extract", "review_task_id": None, "order_id": None}}, indent=2)),
    doc_endpoint("list-documents", "GET", "/documents", "MVP1-E2-05", "List my documents",
        "The caller's documents, newest first, with a status and the next action for each.",
        [param("status", "query", "string", "No", "A document status.", "Filter."), param("cursor, limit", "query", "string, integer", "No", "`limit` 1 to 100.", "Paging.")],
        ["Read only. `next_action` is `upload`, `extract`, `review`, `results`, `pay` or `download`."],
        [response("200", "Always", "`data[]` of documents and `next_cursor`.")], [NOT_AUTH],
        f"GET {BASE}/documents HTTP/1.1\n{H}", json.dumps({"data": [DOC_PAID], "next_cursor": None}, indent=2)),
    doc_endpoint("get-document", "GET", "/documents/{documentId}", "MVP1-E2-05", "Get one document",
        "A document, its status, and the IDs of its parts in each service.", ID, ["Read only."],
        [response("200", "The document is the caller's", "`document`.")], [NOT_FOUND, NOT_AUTH],
        f"GET {BASE}/documents/{D1} HTTP/1.1\n{H}", json.dumps({"document": DOC_PAID}, indent=2)),
    doc_endpoint("retry-extraction", "POST", "/documents/{documentId}/retry-extraction", "MVP1-E3-01", "Retry a failed extraction",
        "Starts a new extraction job after the last one failed.", ID,
        ["Calls Extraction `POST /jobs` for the same file; stores the new job's ID; the document is `extracting` again."],
        [response("202", "A new job started", "`document`.")], [NOT_FOUND, error("409", "not_failed", "The last extraction did not fail."), DEP, NOT_AUTH],
        f"POST {BASE}/documents/{D1}/retry-extraction HTTP/1.1\n{H}", json.dumps({"document": {**DOC_PAID, "status": "extracting", "next_action": "extract", "review_task_id": None, "order_id": None}}, indent=2)),
    doc_endpoint("complete-review", "POST", "/documents/{documentId}/complete-review", "MVP1-E4-03", "Finish review and build the outputs",
        "Re-checks the corrected values, completes the review, and builds the JSON and CSV.",
        ID + [param("confirm_failed_checks", "body", "boolean", "No", "Default false.", "The person confirmed values that still fail a check are as printed.")],
        ["Reads the review task, then calls Extraction `POST /validations` with its values.", "If a check fails and `confirm_failed_checks` is false, answers `409` with the failed checks; nothing changes.", "Otherwise calls Review `POST /tasks/{taskId}/complete` (with `checks_overridden`), builds `result.json` and `result.csv`, stores each through Upload with a service token, records the output version, and sets the document `reviewed`."],
        [response("200", "Review completed and outputs built", "`document` (status `reviewed`) and `outputs`.")],
        [NOT_FOUND, error("409", "fields_unresolved", "Passed on from Review."), error("409", "checks_failed", "`failed_checks[]` lists them; send `confirm_failed_checks: true` to keep the values."), DEP, NOT_AUTH],
        f"POST {BASE}/documents/{D1}/complete-review HTTP/1.1\n{H}\nContent-Type: application/json\n\n" + json.dumps({"confirm_failed_checks": False}, indent=2),
        json.dumps({"document": {**DOC_PAID, "status": "reviewed", "next_action": "pay", "order_id": None}, "outputs": {"version": 1, "locked": True, "formats": ["json", "csv"]}}, indent=2)),
    doc_endpoint("get-outputs", "GET", "/documents/{documentId}/outputs", "MVP1-E5-01", "Which outputs exist",
        "The latest outputs and whether download is unlocked.", ID, ["Read only. `locked` is true until the order is paid."],
        [response("200", "Outputs exist", "`version`, `locked`, `formats`, `generated_at`.")], [NOT_FOUND, error("409", "outputs_not_ready", "The review is not complete."), NOT_AUTH],
        f"GET {BASE}/documents/{D1}/outputs HTTP/1.1\n{H}", json.dumps({"version": 1, "locked": False, "formats": ["json", "csv"], "generated_at": "2026-11-17T09:16:03Z"}, indent=2)),
    doc_endpoint("preview-output", "GET", "/documents/{documentId}/outputs/{format}/preview", "MVP1-E5-01", "Preview the JSON or CSV",
        "The full output, shown on screen, before or after paying.",
        ID + [param("format", "path", "string", "Yes", "`json` or `csv`.", "Which output.")],
        ["Returns the stored output's content inline, read through Upload."],
        [response("200", "Outputs exist", "`application/json` or `text/csv` with `Content-Disposition: inline`.")], [NOT_FOUND, error("409", "outputs_not_ready", "The review is not complete."), NOT_AUTH],
        f"GET {BASE}/documents/{D1}/outputs/json/preview HTTP/1.1\n{H}",
        json.dumps({"data": {"vendor_name": "Acme Supplies Ltd", "invoice_number": "INV-0042", "invoice_date": "2026-11-02", "currency": "USD", "subtotal": "1150.00", "tax_total": "80.00", "total": "1230.00", "line_items": [{"description": "Paper, A4", "quantity": "10", "unit_price": "115.00", "amount": "1150.00"}]},
                    "metadata": {"document_id": D1, "file_name": "acme-invoice-0042.pdf", "pages": 2, "model": "claude-sonnet-5-5", "prompt_version": "extract-invoice/v1", "extracted_at": "2026-11-17T09:14:41Z", "reviewed_at": "2026-11-17T09:16:02Z", "reviewed_by": U1, "fields_flagged": 3, "fields_corrected": 1,
                                 "fields": {"total": {"confidence": 0.3, "corrected": True}, "vendor_name": {"confidence": 0.97, "corrected": False}}}}, indent=2)),
    doc_endpoint("download-output", "GET", "/documents/{documentId}/outputs/{format}/download", "MVP1-E5-03", "Download the JSON or CSV",
        "Locked until the order is paid, checked on the server every time.",
        ID + [param("format", "path", "string", "Yes", "`json` or `csv`.", "Which output.")],
        ["Reads the order from Payment; if it is not `paid`, answers `402`.", "Otherwise asks Upload for a 5-minute download link named `{document}-result.{format}`, redirects to it, and records `delivery.downloaded` (`MVP1-E7-02`)."],
        [response("302", "Paid", "`Location`: the 5-minute Upload link.")],
        [NOT_FOUND, error("402", "payment_required", "The order is not paid."), error("409", "outputs_not_ready", "The review is not complete."), DEP, NOT_AUTH],
        f"GET {BASE}/documents/{D1}/outputs/csv/download HTTP/1.1\n{H}", "HTTP/1.1 302 Found\nLocation: https://01scale-uploads.s3.us-east-1.amazonaws.com/users/…/original.csv?response-content-disposition=attachment…&X-Amz-Signature=…"),
    doc_endpoint("checkout", "POST", "/documents/{documentId}/checkout", "MVP1-E6-01", "Start payment",
        "Sets the price and asks Payment for a checkout page.", ID,
        ["Requires status `reviewed`.", "Calls Payment `POST /orders` from DocFlow's server with the price, $5.00 (500 cents, from configuration), `reference: docflow:{documentId}`, and success and cancel addresses; stores the order's ID."],
        [response("201", "Order ready", "`order_id` and `checkout_url`.")],
        [NOT_FOUND, error("409", "already_paid", "Go straight to success."), error("409", "not_reviewed", "The review is not complete."), DEP, NOT_AUTH],
        f"POST {BASE}/documents/{D1}/checkout HTTP/1.1\n{H}", json.dumps({"order_id": O1, "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_…"}, indent=2)),
    doc_endpoint("stats", "GET", "/stats", "MVP1-E1-05", "My DocFlow totals",
        "For the account page.", [], ["Read only."], [response("200", "Always", "`documents_processed`: documents that reached `reviewed` or `paid`.")], [NOT_AUTH],
        f"GET {BASE}/stats HTTP/1.1\n{H}", json.dumps({"documents_processed": 4}, indent=2)),
    doc_endpoint("webhooks", "POST", "/webhooks/{service}", "MVP1-E0-09", "Receive service events",
        "Where platform services tell DocFlow that something finished, so the process moves on without the browser.",
        [param("service", "path", "string", "Yes", "`extraction`, `review`, `payment`, `identity` or `delivery`.", "Who sent it."),
         param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body, compared in constant time.", "Proves the event came from the platform."),
         param("event_id, type, data", "body", "uuid, string, object", "Yes", "Processed once per `event_id`.", "The event.")],
        ["`extraction.job.completed`: reads the fields, creates a Review task with them (`POST /tasks`) and sets the document `needs_review`; with nothing flagged it still creates the task, so every document is reviewed the same way.",
         "`extraction.job.failed`: sets `extraction_failed`.",
         "`payment.order.paid`: sets `paid` and asks Delivery for the `order_paid` email, keyed by the event's ID.",
         "`payment.order.expired` or `failed`: clears the order so Pay starts a new one.",
         "`identity.user.deleted`: deletes that user's documents and outputs records.",
         "Other types are acknowledged and ignored."],
        [response("200", "Accepted, including a repeat", "No body.")], [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/docflow/v1/webhooks/payment HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n" + json.dumps({"event_id": "0193b121-0000-7000-8000-00000000aaaa", "type": "payment.order.paid", "data": {"order_id": O1, "reference": f"docflow:{D1}"}}, indent=2),
        "HTTP/1.1 200 OK", access="Service"),
]

DOCS = {"name": "docflow.documents", "purpose": "The process record: one row per invoice, holding only the IDs of its parts in each service and where the process is.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The document's ID; `docflow:{id}` is the reference sent to services."),
    column("owner_id", "uuid", "No", "", "", "The user."),
    column("file_name", "text", "No", "", "1 to 255 characters", "Shown in lists, copied from the upload request."),
    column("status", "text", "No", "'pending_upload'", "`pending_upload`, `uploaded`, `rejected`, `extracting`, `extraction_failed`, `needs_review`, `reviewed`, `paid`", "Where the process is."),
    column("file_id", "uuid", "No", "", "", "Upload's file."),
    column("job_id", "uuid", "Yes", "", "", "Extraction's latest job."),
    column("review_task_id", "uuid", "Yes", "", "", "Review's task."),
    column("order_id", "uuid", "Yes", "", "", "Payment's open or paid order."),
    column("rejection_reason", "text", "Yes", "", "Set exactly when rejected", "Upload's reason."),
    column("created_at", "timestamptz", "No", "now()", "", "When the document was started."),
    column("updated_at", "timestamptz", "No", "now()", "", "When its status last changed."),
], "constraints": [
    "`documents_pkey`: primary key (`id`)",
    "`documents_status_check`: only the eight statuses",
    "`documents_parts_check`: a job exists from `extracting` on; a review task from `needs_review` on; an order when `paid`",
    "`documents_rejected_check`: `rejection_reason` exactly when `rejected`",
    "`documents_owner_idx`: index on (`owner_id`, `created_at` desc), for the documents list",
], "sampleCols": ["id", "owner_id", "file_name", "status", "file_id", "job_id", "review_task_id", "order_id", "rejection_reason", "created_at", "updated_at"],
   "sampleRows": [[D1, U1, "acme-invoice-0042.pdf", "paid", F1, J1, T1, O1, "(empty)", "2026-11-17 09:14:07+00", "2026-11-17 09:17:03+00"],
                  ["0193b160-aaaa-7bbb-8ccc-dddddddddddd", U1, "scan.jpg", "rejected", "0193b0c9-5f22-7a08-9e44-1a2b3c4d5e6f", "(empty)", "(empty)", "(empty)", "type_mismatch", "2026-11-17 09:16:40+00", "2026-11-17 09:16:44+00"]]}

OUTPUTS = {"name": "docflow.outputs", "purpose": "One row per version of a document's results: the IDs of the JSON and CSV files stored in Upload.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The output version's ID."),
    column("document_id", "uuid", "No", "", "Foreign key to `docflow.documents`, delete cascades", "Whose results."),
    column("version", "smallint", "No", "", "1 or more; unique per document", "Which version; increases when outputs are rebuilt."),
    column("json_file_id", "uuid", "No", "", "", "Upload's file holding `result.json`."),
    column("csv_file_id", "uuid", "No", "", "", "Upload's file holding `result.csv`."),
    column("schema_version", "text", "No", "", "`invoice-v1`", "The JSON Schema the JSON was validated against."),
    column("created_at", "timestamptz", "No", "now()", "", "When it was built."),
], "constraints": ["`outputs_pkey`: primary key (`id`)", "`outputs_document_id_fkey`: foreign key to `docflow.documents`, delete cascades", "`outputs_document_version_key`: unique (`document_id`, `version`)"],
   "sampleCols": ["id", "document_id", "version", "json_file_id", "csv_file_id", "schema_version", "created_at"],
   "sampleRows": [["0193b0f6-0000-7000-8000-000000000001", D1, "1", JF, CF, "invoice-v1", "2026-11-17 09:16:03+00"]]}

INBOUND = {"name": "docflow.inbound_events", "purpose": "One row per service event DocFlow has acted on.", "columns": [
    column("event_id", "uuid", "No", "", "Primary key", "The event's ID."),
    column("type", "text", "No", "", "1 to 100 characters", "What happened."),
    column("created_at", "timestamptz", "No", "now()", "", "When."),
], "constraints": ["`inbound_events_pkey`: primary key (`event_id`)"], "sampleCols": ["event_id", "type", "created_at"],
   "sampleRows": [["0193b121-0000-7000-8000-00000000aaaa", "payment.order.paid", "2026-11-17 09:17:03+00"]]}

DDL = """-- DocFlow app, version 1. Schema: docflow.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists docflow;

create table docflow.documents (
  id               uuid        primary key,
  owner_id         uuid        not null,
  file_name        text        not null,
  status           text        not null default 'pending_upload',
  file_id          uuid        not null,
  job_id           uuid,
  review_task_id   uuid,
  order_id         uuid,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint documents_file_name_check check (length(file_name) between 1 and 255),
  constraint documents_status_check check (status in ('pending_upload', 'uploaded', 'rejected',
    'extracting', 'extraction_failed', 'needs_review', 'reviewed', 'paid')),
  constraint documents_parts_check check (
    (status not in ('extracting', 'extraction_failed', 'needs_review', 'reviewed', 'paid') or job_id is not null)
    and (status not in ('needs_review', 'reviewed', 'paid') or review_task_id is not null)
    and (status <> 'paid' or order_id is not null)
  ),
  constraint documents_rejected_check check ((status = 'rejected') = (rejection_reason is not null))
);

create index documents_owner_idx on docflow.documents (owner_id, created_at desc);

create table docflow.outputs (
  id             uuid        primary key,
  document_id    uuid        not null,
  version        smallint    not null,
  json_file_id   uuid        not null,
  csv_file_id    uuid        not null,
  schema_version text        not null,
  created_at     timestamptz not null default now(),

  constraint outputs_document_id_fkey foreign key (document_id)
    references docflow.documents (id) on delete cascade,
  constraint outputs_document_version_key unique (document_id, version),
  constraint outputs_version_check check (version >= 1 and schema_version in ('invoice-v1'))
);

create table docflow.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

grant usage on schema docflow to docflow_service;
grant select, insert, update, delete on docflow.documents, docflow.outputs to docflow_service;
grant select, insert on docflow.inbound_events, docflow.audit_events to docflow_service;
"""

CSV_COLUMNS = "`document_id`, `vendor_name`, `vendor_address`, `vendor_tax_id`, `invoice_number`, `invoice_date`, `due_date`, `bill_to_name`, `bill_to_address`, `currency`, `subtotal`, `tax_total`, `total`, `payment_terms`, `line_number`, `line_description`, `line_quantity`, `line_unit_price`, `line_amount`"

JOURNEYS = [
    journey("Upload to results", "Someone with an invoice", "Starts on My documents.", ["MVP1-E0-09", "MVP1-E2-05"], [
        ("Sees My documents, or 'Upload your first invoice' with a sample invoice to try.", "DocFlow lists the person's documents with status and next action."),
        ("Uploads; is taken to the extraction page.", "DocFlow starts the document, Upload stores and checks the file, and DocFlow starts Extraction."),
        ("Watches the steps, then sees 'Review 3 flagged fields'.", "Extraction tells DocFlow it finished; DocFlow sends the fields to Review."),
        ("Checks the flagged fields and taps Complete review.", "DocFlow re-checks the values with Extraction, completes the review, and builds the JSON and CSV."),
    ], "The results exist, previewable but locked until payment."),
    journey("Preview, pay and download", "Someone with reviewed results", "Opens the results.", ["MVP1-E5-01", "MVP1-E5-03", "MVP1-E6-01", "MVP1-E7-01", "MVP1-E7-02"], [
        ("Reads the full JSON (with folding) and the CSV on screen; download buttons say 'Pay to download'.", "DocFlow returns the stored outputs for preview; downloads answer 402 until paid."),
        ("Taps Pay $5.00 and pays on Stripe's page.", "DocFlow's server asks Payment for an order at $5.00."),
        ("Lands on the success page: 'Confirming payment…', then the buttons work.", "The success page polls the order; Payment's event tells DocFlow it is paid; DocFlow asks Delivery to email."),
        ("Taps Download CSV; opens it in Excel with correct characters.", "DocFlow checks the order is paid, then redirects to a 5-minute Upload link. The CSV is UTF-8 with a BOM."),
    ], "The person has their files and an email with a link back."),
]

EDGE_CASES = [
    {"situation": "Tries to download before paying (for example by URL)", "sees": "'Pay to download.'", "code": "`payment_required`"},
    {"situation": "A check still fails at Complete review", "sees": "Which check, with Fix it or 'Values are correct as on the document'.", "code": "`checks_failed`"},
    {"situation": "Extraction failed", "sees": "The failure message and Retry.", "code": "Document `extraction_failed`"},
    {"situation": "Upload rejected the file", "sees": "The reason and 'Choose another file'.", "code": "Document `rejected`"},
    {"situation": "Pays for a document already paid", "sees": "Goes straight to the success page.", "code": "`already_paid`"},
    {"situation": "A service is down", "sees": "'Something went wrong. Try again in a moment.' Nothing is lost.", "code": "`dependency_unavailable`"},
    {"situation": "A spreadsheet formula in a value, like `=SUM(…)`", "sees": "The text as written, not a formula, when the CSV is opened.", "code": "Prefixed with `'`"},
]

COMPONENTS = [
    component("DocumentsList", "Page section", "My documents with name, date, status chip and the next action; an empty state with a sample invoice.",
        [("pageSize", "number, optional", "Default 20.")], ["Loading", "Empty: 'Upload your first invoice' and the sample", "Loaded", "Failed: Retry"], ["`GET /documents`"]),
    component("JsonPreview", "Component", "The JSON with syntax highlighting and folding; usable on a phone.",
        [("documentId", "string", "The document.")], ["Loading", "Shown, folded at the first level on phones", "Not ready", "Failed: Retry"], ["`GET /documents/{documentId}/outputs/json/preview`"]),
    component("CsvPreview", "Component", "The CSV as a table that scrolls inside its own box.",
        [("documentId", "string", "The document.")], ["Loading", "Shown", "Not ready", "Failed: Retry"], ["`GET /documents/{documentId}/outputs/csv/preview`"]),
    component("DownloadButtons", "Component", "Download JSON and Download CSV; 'Pay to download' while locked.",
        [("documentId", "string", "The document."), ("locked", "boolean", "From the outputs request.")], ["Locked", "Unlocked", "Working"], ["`GET /documents/{documentId}/outputs/{format}/download`"]),
]

MODULE = {
    "slug": "json-and-csv-output",
    "docsPath": "docs/services/docflow",
    "extraDocs": [],
    "labels": {"flow": "How DocFlow connects the services", "hosted": "Pages provided by an outside service"},
    "notes": {"journey": "What a person sees across the whole DocFlow journey, and where DocFlow's own steps are.", "ui": "DocFlow's own page sections. Everything else on DocFlow's pages comes from the services' component packages.", "hosted": "", "token": "",
              "schema": "The SQL for the DocFlow app's tables, in the `docflow` schema. No service can read them."},
    "overview": {
        "name": "DocFlow", "version": "Version 1 · The app that connects the services", "status": "Designed, not built", "base": BASE,
        "what": [
            "DocFlow is the first app built from the 01scale platform services. It turns an uploaded invoice into reviewed JSON and CSV, by calling Upload, LLM Extraction, Human Review, Payment and Delivery in order.",
            "It is deliberately thin. It keeps one record per invoice (which file, job, review and order belong together, and where the process is) and builds the invoice-specific results. Everything else is a service it calls.",
            "This page covers DocFlow's own parts: the documents list, the JSON and CSV outputs, checkout, the success page and the downloads.",
        ],
        "why": [
            {"title": "The process lives in one place", "text": "The order of steps is written once, in the app, so the services stay unaware of invoices and of each other."},
            {"title": "The next app is a copy, not a rewrite", "text": "Procure-to-Pay would be another thin app calling the same services in a different order."},
            {"title": "Results people can trust", "text": "The JSON is validated against a published schema and carries what was corrected and how sure the system was; the CSV opens cleanly in Excel and cannot run formulas."},
        ],
        "scope_in": ["The documents list with status and next action", "Starting each service at the right moment, and reacting to their events", "Building `result.json` (with metadata) and `result.csv`, stored through Upload", "Locked preview; downloads only after payment, checked on the server", "Checkout at $5.00 and the success page", "Asking Delivery to email when paid"],
        "scope_out": ["Batches of documents: `MVP2-E9`, `MVP2-E12`", "Paying with a saved card: `MVP2-E13`", "Anything a service does: it is designed in that service"],
        "stories": ["MVP1-E0-09", "MVP1-E2-05", "MVP1-E5-01", "MVP1-E5-02", "MVP1-E5-03", "MVP1-E5-04", "MVP1-E7-01", "MVP1-E7-02"],
    },
    "flow": [
        {"who": "DocFlow", "what": "Creates the document and Upload's file; after the upload, starts Extraction."},
        {"who": "Extraction", "what": "Tells DocFlow the job finished (`extraction.job.completed`)."},
        {"who": "DocFlow", "what": "Sends the fields to Review as a task."},
        {"who": "DocFlow", "what": "When the person completes review: re-checks values with Extraction, completes the Review task, builds the JSON and CSV and stores them through Upload."},
        {"who": "DocFlow", "what": "At checkout, asks Payment for an order at $5.00."},
        {"who": "Payment", "what": "Tells DocFlow the order is paid (`payment.order.paid`)."},
        {"who": "DocFlow", "what": "Marks the document paid, asks Delivery for the email, and unlocks downloads."},
    ],
    "concepts": [
        {"term": "Process record", "meaning": "DocFlow's one row per invoice: the IDs of its parts in each service, and its status."},
        {"term": "Reference", "meaning": "`docflow:{document_id}`: how DocFlow labels its jobs, tasks, orders and messages in the services."},
        {"term": "CSV injection", "meaning": "A cell starting with `=`, `+`, `-` or `@` can run as a formula in a spreadsheet; such cells are prefixed with `'`."},
    ],
    "quickstart": [
        {"title": "The CSV's columns", "text": f"One row per line item, invoice columns repeated on each row: {CSV_COLUMNS}. An invoice with no line items gives one row with the line columns empty.", "lang": "text", "code": "document_id,vendor_name,…,line_number,line_description,line_quantity,line_unit_price,line_amount"},
        {"title": "Unlock only when paid", "text": "Every download checks the order on the server.", "lang": "ts", "code": 'const { order } = await payment.get(`/orders/${doc.order_id}`);\nif (order.status !== "paid") return problem(402, "payment_required");'},
    ],
    "env": [
        {"name": "DOCFLOW_DATABASE_URL", "value": "Neon connection string for the `docflow_service` role", "secret": "Yes"},
        {"name": "DOCFLOW_PRICE_CENTS", "value": "`500`", "secret": "No"},
        {"name": "DOCFLOW_SERVICE_TOKEN", "value": "How DocFlow's server authenticates to services as the app", "secret": "Yes"},
        {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64", "secret": "Yes"},
    ],
    "openQuestions": [
        "`MVP1-E5-04` stores outputs under `users/{userId}/{docId}/outputs/`. Through Upload, every key is `users/{owner}/{fileId}/original.{ext}`, built from IDs; the story's path cannot be kept without breaking that rule. I propose changing the story.",
        "`MVP1-E5-04` AC2 rebuilds outputs 'if the user later edits fields', but Human Review locks values when a review completes. Either reviews can be reopened, or AC2 belongs with the chat corrections of MVP2.",
        "Where the JSON Schema `schemas/invoice-v1.json` is published (a file in the repository, or also served at an address) is not decided.",
    ],
    "errorSample": problem("payment_required", "Payment required", 402, "Pay to download these results."),
    "endpoints": ENDPOINTS,
    "noEndpoint": [
        {"topic": "Building the JSON (MVP1-E5-01)", "how": "`data` holds the final values in the invoice v1 shape; `metadata` holds document_id, file_name, pages, model, prompt_version, extracted_at, reviewed_at, reviewed_by, fields_flagged, fields_corrected, and per field `confidence` and `corrected`. Validated against `schemas/invoice-v1.json` before it is stored."},
        {"topic": "Building the CSV (MVP1-E5-02)", "how": f"Columns in this order: {CSV_COLUMNS}. RFC 4180 quoting, UTF-8 with a byte-order mark, CRLF line ends; cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'`."},
        {"topic": "Success page (MVP1-E7-01)", "how": "Polls Payment `GET /orders/{orderId}` every 2 seconds for up to 30 seconds, then says 'We'll email you when it's ready'; shows the email's status from Delivery."},
        {"topic": "Pages", "how": "`/documents`, `/documents/{id}` (extraction), `/documents/{id}/review`, `/documents/{id}/results`, `/documents/{id}/pay`, `/documents/{id}/success`. Each composes the services' components."},
    ],
    "tables": [DOCS, OUTPUTS, INBOUND],
    "entities": [
        {"name": "Document", "table": "`docflow.documents`", "what": "One invoice going through the process.", "relations": "Points at one file, one latest job, one review task and one order in their services, by ID only."},
        {"name": "Output version", "table": "`docflow.outputs`", "what": "One built set of results.", "relations": "Belongs to one document; its files are in Upload."},
        {"name": "Processed event", "table": "`docflow.inbound_events`", "what": "A service event already acted on.", "relations": "Stands alone."},
    ],
    "lifecycles": [{"name": "Document", "text": "`pending_upload` → `uploaded` → `extracting` → `needs_review` → `reviewed` → `paid`; or `rejected` after upload, or `extraction_failed` (back to `extracting` on retry)."}],
    "otherTables": "The service template also gives DocFlow `audit_events`, `idempotency_keys` and `outbound_events`.",
    "notStored": ["Field values: they live in Extraction and Review; the results files live in Upload.", "Prices: only in configuration and on Payment's order."],
    "ddl": DDL,
    "queries": [{"title": "The documents list", "sql": "select * from docflow.documents\nwhere owner_id = $1\norder by created_at desc\nlimit $2;"}],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "uiRules": ["DocFlow's pages are built from the services' components; DocFlow adds only the documents list and the results views.", "Same accessibility and size rules as every 01scale page."],
    "components": COMPONENTS,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": ["Every download checks on the server that the order is paid.", "The price is set by DocFlow's server, from configuration.", "DocFlow passes the user's own token to services, so their ownership checks apply.", "Service events are verified and processed once."]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": ["A document's status always has the parts it needs (a job once extracting, a task once in review, an order once paid).", "One output per version per document."]},
        {"level": "Data model level: business rules the service guarantees", "items": ["DocFlow stores IDs of other services' records, never their data.", "Every document is reviewed, even when nothing is flagged.", "Results are built only from a completed review."]},
    ],
}
