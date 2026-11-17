"""Design of the Upload service, version 1 (files to AWS S3).

Data only: scripts/site/render.py turns MODULE into docs/services/upload/*.md and
app/products/upload.ts. Run `npm run site:data` after any change.
Stories: MVP1-E2-01 to MVP1-E2-05 (Upload's part; the DocFlow app's endpoints in
those stories are designed with the DocFlow app shell, MVP1-E0-09).
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "upload"
COMPLETE = False

BASE = "/api/upload/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"        # a user (owner), from Identity
F1 = "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"        # a ready PDF
F2 = "0193b0c9-5f22-7a08-9e44-1a2b3c4d5e6f"        # a rejected upload
F3 = "0193b1d0-0c3e-7b19-a2f5-7e8f9a0b1c2d"        # a file still uploading
KEY1 = f"users/{U1}/{F1}/original.pdf"
SIGNED = "X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAEXAMPLE%2F20261117%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261117T091407Z&X-Amz-Expires=300&X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost&X-Amz-Signature=5f2c..."
BUCKET = "https://01scale-uploads.s3.us-east-1.amazonaws.com"

FILE_READY = {
    "id": F1, "file_name": "acme-invoice-0042.pdf", "mime": "application/pdf", "size_bytes": 248913,
    "pages": 2, "status": "ready", "rejection_reason": None, "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    "created_at": "2026-11-17T09:14:07Z", "completed_at": "2026-11-17T09:14:11Z", "expires_at": "2026-12-17T09:14:07Z",
}
FILE_PENDING = {**FILE_READY, "id": F3, "pages": None, "status": "pending_upload", "sha256": None, "completed_at": None,
                "file_name": "receipt-photo.jpg", "mime": "image/jpeg", "size_bytes": 1843200,
                "created_at": "2026-11-17T09:20:30Z", "expires_at": "2026-12-17T09:20:30Z"}

STORAGE_DOWN = error("503", "storage_unavailable", "AWS S3 could not be reached. Nothing was changed; safe to retry.")

ERRORS_COMMON = [
    error("401", "not_authenticated", "No valid access token. The gateway normally answers this before the request arrives."),
    error("404", "file_not_found", "No such file, or it belongs to another user. The same answer in both cases."),
]

ENDPOINTS = [
    endpoint(
        "create-file", "POST", f"{BASE}/files", "Signed in", "MVP1-E2-02",
        "Create a file and get an upload link",
        "Records a new file and returns a link the browser uses to send the file straight to private storage. The file itself never passes through the API.",
        [
            param("file_name", "body", "string", "Yes", "1 to 255 characters after trimming; no `/`, `\\` or control characters.", "The name the person sees. Never used as the storage key."),
            param("mime", "body", "string", "Yes", "One of `application/pdf`, `image/png`, `image/jpeg`, `application/json`, `text/csv`, and allowed by `accept` if given.", "The file type the browser reports. Checked again against the real bytes on completion."),
            param("size", "body", "integer", "Yes", "1 to 10,485,760 (10 MB), and at most `accept.max_bytes` if given.", "The exact size in bytes. The upload link only accepts this size."),
            param("accept", "body", "object", "No", "`{mimes[], max_bytes, max_pages}`; each value may only narrow the service's limits, never widen them. `max_pages` 1 to 10, PDFs only.", "The calling app's own limits. DocFlow sends PDF, PNG and JPEG, 10 MB and 10 pages."),
            param("owner_id", "body", "uuid", "Only with Service access", "Rejected unless the caller has the `service` role.", "Lets an app's server store a file for a user, for example DocFlow saving the JSON and CSV results (MVP1-E5-04)."),
            param("Idempotency-Key", "header", "string", "No", "1 to 255 characters. Same key and same body within 24 hours returns the first response.", "Makes a retried request safe."),
        ],
        [
            "Checks the inputs against the service's limits and `accept`, before anything is stored.",
            "Creates the file with status `pending_upload` and storage key `users/{owner_id}/{file_id}/original.{ext}`, where `ext` comes from `mime`.",
            "Signs an S3 PUT link valid for 5 minutes. `Content-Type` and `Content-Length` are part of the signature, so S3 refuses a different type or size.",
            "Records `file.created` in the audit log.",
        ],
        [response("201", "The file was created", "`file` (status `pending_upload`) and `upload`: `url`, `method` (always `PUT`), the `headers` the browser must send, and `expires_at`.")],
        [
            error("413", "file_too_large", "`size` is over 10 MB or over `accept.max_bytes`."),
            error("415", "unsupported_file_type", "`mime` is not one of the allowed types, or not allowed by `accept`."),
            error("422", "validation_failed", "Another input is missing or malformed; `errors[]` lists each field."),
            error("422", "idempotency_key_reused", "The same `Idempotency-Key` was sent with a different body."),
            error("403", "service_only", "`owner_id` was sent without the `service` role."),
            error("401", "not_authenticated", "No valid access token."),
            STORAGE_DOWN,
        ],
        "POST /api/upload/v1/files HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>\nIdempotency-Key: 8b1f6c2e-upload-1\nContent-Type: application/json\n\n"
        + json.dumps({"file_name": "acme-invoice-0042.pdf", "mime": "application/pdf", "size": 248913,
                      "accept": {"mimes": ["application/pdf", "image/png", "image/jpeg"], "max_bytes": 10485760, "max_pages": 10}}, indent=2),
        json.dumps({
            "file": {**FILE_READY, "pages": None, "status": "pending_upload", "sha256": None, "completed_at": None},
            "upload": {"url": f"{BUCKET}/{KEY1}?{SIGNED}", "method": "PUT",
                       "headers": {"Content-Type": "application/pdf", "Content-Length": "248913"},
                       "expires_at": "2026-11-17T09:19:07Z"},
        }, indent=2),
    ),
    endpoint(
        "complete-upload", "POST", f"{BASE}/files/{{fileId}}/complete", "Signed in", "MVP1-E2-03",
        "Confirm the upload and check the file",
        "Called after the browser has sent the file. Upload checks what actually arrived in storage and marks the file ready or rejected. Safe to call more than once.",
        [param("fileId", "path", "uuid", "Yes", "A file of the caller's.", "The file to confirm.")],
        [
            "If the file is already `ready` or `rejected`, returns it unchanged.",
            "Asks S3 whether the object exists and compares its size with the size declared at creation.",
            "Reads the first bytes to confirm the real type: `%PDF-` for PDF, the PNG signature, `FF D8 FF` for JPEG; JSON must parse, CSV must be valid UTF-8 text.",
            "For a PDF, counts its pages with a PDF parser (not by text search) and checks them against `accept.max_pages`. An image counts as 1 page.",
            "Passing: computes the SHA-256 of the content, sets status `ready`, `pages` and `completed_at`, and records `file.uploaded`.",
            "Failing a check: sets status `rejected` with a `rejection_reason`, deletes the object from S3, and records `file.rejected`. This is still a `200`: the check ran and has an answer.",
        ],
        [response("200", "The check has run", "`file` with status `ready`, or `rejected` and its `rejection_reason`: `type_mismatch`, `too_many_pages`, `unreadable`.")],
        ERRORS_COMMON + [
            error("409", "upload_missing", "Nothing has arrived in storage yet, for example the browser has not finished sending. Safe to retry."),
            error("409", "size_mismatch", "What arrived is not the declared size. The object is deleted; create a new file to try again."),
            error("409", "file_deleted", "The file was deleted or has expired."),
            STORAGE_DOWN,
        ],
        f"POST /api/upload/v1/files/{F1}/complete HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"file": FILE_READY}, indent=2),
    ),
    endpoint(
        "get-file", "GET", f"{BASE}/files/{{fileId}}", "Signed in", "MVP1-E2-02",
        "Get one file",
        "A file's details and status.",
        [param("fileId", "path", "uuid", "Yes", "A UUID.", "The file.")],
        ["Read only."],
        [response("200", "The file exists and is the caller's", "`file`.")],
        ERRORS_COMMON,
        f"GET /api/upload/v1/files/{F1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"file": FILE_READY}, indent=2),
    ),
    endpoint(
        "list-files", "GET", f"{BASE}/files", "Signed in", "MVP1-E2-05",
        "List my files",
        "The caller's files, newest first.",
        [
            param("status", "query", "string", "No", "One of `pending_upload`, `ready`, `rejected`. Deleted and expired files are never listed.", "Only files with this status."),
            param("cursor", "query", "string", "No", "A `next_cursor` from an earlier page, unchanged.", "Where to continue."),
            param("limit", "query", "integer", "No", "1 to 100. Default 20.", "How many to return."),
        ],
        ["Read only. Ordered by `created_at` then `id`, newest first."],
        [response("200", "Always, even when empty", "`data[]` of files and `next_cursor` (null on the last page).")],
        [error("422", "validation_failed", "`status`, `cursor` or `limit` is not valid."), error("401", "not_authenticated", "No valid access token.")],
        "GET /api/upload/v1/files?status=ready&limit=2 HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [FILE_READY], "next_cursor": None}, indent=2),
    ),
    endpoint(
        "download-url", "GET", f"{BASE}/files/{{fileId}}/download-url", "Signed in", "MVP1-E2-03",
        "Get a link to read the file",
        "A link valid for 5 minutes that opens or downloads the file directly from storage.",
        [
            param("fileId", "path", "uuid", "Yes", "A file of the caller's with status `ready`.", "The file."),
            param("disposition", "query", "string", "No", "`inline` (default) or `attachment`.", "Show in the browser, or download."),
            param("filename", "query", "string", "No", "1 to 255 characters; same rules as `file_name`. Default: the file's `file_name`.", "The name the downloaded file gets."),
        ],
        ["Signs an S3 GET link valid for 5 minutes, with the content type and `Content-Disposition` fixed in the signature.", "Records `file.downloaded` when `disposition` is `attachment`."],
        [response("200", "The file is ready", "`url` and `expires_at`.")],
        ERRORS_COMMON + [error("409", "file_not_ready", "The file is still uploading, or was rejected."), error("410", "file_expired", "The file was removed after 30 days."), STORAGE_DOWN],
        f"GET /api/upload/v1/files/{F1}/download-url?disposition=attachment HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"url": f"{BUCKET}/{KEY1}?response-content-disposition=attachment%3B%20filename%3D%22acme-invoice-0042.pdf%22&{SIGNED.replace('content-length%3Bcontent-type%3B', '')}", "expires_at": "2026-11-17T09:25:00Z"}, indent=2),
    ),
    endpoint(
        "delete-file", "DELETE", f"{BASE}/files/{{fileId}}", "Signed in", "MVP1-E2-02",
        "Delete a file",
        "Removes the stored object and marks the file deleted. Safe to call more than once.",
        [param("fileId", "path", "uuid", "Yes", "A file of the caller's.", "The file.")],
        ["Deletes the object from S3, sets status `deleted` and `deleted_at`, and records `file.deleted`.", "A file that is already deleted returns `204` again."],
        [response("204", "The file is deleted", "No body.")],
        ERRORS_COMMON + [STORAGE_DOWN],
        f"DELETE /api/upload/v1/files/{F2} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        "HTTP/1.1 204 No Content",
    ),
    endpoint(
        "events", "POST", f"{BASE}/events", "Service", "MVP1-E1-05",
        "Receive platform events",
        "Where other services' signed events arrive. In version 1 Upload acts on one: a user's account was deleted, so their files go too.",
        [
            param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body with the shared events key, compared in constant time.", "Proves the event came from the platform."),
            param("event_id", "body", "uuid", "Yes", "Each event is processed once; a repeat returns `200` with no effect.", "The event's ID."),
            param("type", "body", "string", "Yes", "Version 1 acts on `identity.user.deleted`; other types are acknowledged and ignored.", "What happened."),
            param("data", "body", "object", "Yes", "For `identity.user.deleted`: `{user_id}`.", "The event's details."),
        ],
        ["For `identity.user.deleted`: deletes every object under `users/{user_id}/`, marks that user's files `deleted`, and records `file.deleted` for each with `reason: account_deleted`."],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/upload/v1/events HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n"
        + json.dumps({"event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "type": "identity.user.deleted", "occurred_at": "2026-11-17T10:00:00Z", "data": {"user_id": U1}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
]

# ------------------------------------------------------------------ data model
FILES = {
    "name": "upload.files",
    "purpose": "One row per file. Created when an upload is requested; it never stores the file's content, only where it is and what Upload knows about it.",
    "columns": [
        column("id", "uuid", "No", "", "Primary key. UUIDv7, generated by the service", "The file's ID everywhere in 01scale. Other services store it as `file_id`."),
        column("owner_id", "uuid", "No", "", "", "The user who owns the file: the `sub` of the caller's access token, or `owner_id` sent by an app's server. A plain ID: Identity's tables are not reachable from here."),
        column("s3_key", "text", "No", "", "Unique. Always `users/{owner_id}/{id}/original.{ext}`", "Where the object lives in the bucket. Built from IDs only, so a file name can never change the path."),
        column("file_name", "text", "No", "", "1 to 255 characters, no `/`, `\\` or control characters", "The name the person gave the file, shown in the UI and used for downloads. 255 is the longest file name most file systems allow."),
        column("mime", "text", "No", "", "One of `application/pdf`, `image/png`, `image/jpeg`, `application/json`, `text/csv`", "The file's type, as declared and then confirmed from its first bytes."),
        column("size_bytes", "bigint", "No", "", "1 to 10,485,760", "The declared size, which the upload link enforces. 10 MB keeps a single extraction within the time limits of a serverless function."),
        column("pages", "integer", "Yes", "", "1 to 10 for a PDF; 1 for an image; empty for JSON and CSV", "Set when the upload is checked. Empty until then."),
        column("accept", "jsonb", "No", "'{}'", "Only the keys `mimes`, `max_bytes`, `max_pages`", "The calling app's limits at the time of upload, kept so the check on completion applies the same rules."),
        column("status", "text", "No", "'pending_upload'", "One of `pending_upload`, `ready`, `rejected`, `deleted`, `expired`", "Where the file is in its life (see below)."),
        column("rejection_reason", "text", "Yes", "", "One of `type_mismatch`, `too_many_pages`, `unreadable`, `size_mismatch`; set exactly when status is `rejected`", "Why the check failed, for a plain-language message."),
        column("sha256", "text", "Yes", "", "64 lower-case hex characters; set exactly when the file has been `ready`", "A fingerprint of the content, to prove later that the file was not changed and to spot the same file uploaded twice."),
        column("created_at", "timestamptz", "No", "now()", "", "When the upload was requested."),
        column("completed_at", "timestamptz", "Yes", "", "Not earlier than `created_at`", "When the check ran."),
        column("deleted_at", "timestamptz", "Yes", "", "Set exactly when status is `deleted`", "When the file was deleted."),
        column("expires_at", "timestamptz", "No", "", "30 days after `created_at`", "When the bucket's lifecycle rule removes the object. Shown to the person so it is not a surprise."),
    ],
    "constraints": [
        "`files_pkey`: primary key (`id`)",
        "`files_s3_key_key`: unique (`s3_key`)",
        "`files_s3_key_check`: `s3_key` starts with `users/{owner_id}/{id}/original.`",
        "`files_file_name_check`: 1 to 255 characters, none of them `/`, `\\` or a control character",
        "`files_mime_check`: `mime` is one of the five allowed types",
        "`files_size_bytes_check`: `size_bytes` between 1 and 10,485,760",
        "`files_pages_check`: `pages` empty, or 1 to 10 for a PDF and exactly 1 for an image; always empty for JSON and CSV",
        "`files_accept_check`: `accept` has no keys other than `mimes`, `max_bytes`, `max_pages`",
        "`files_status_check`: `status` is one of the five statuses",
        "`files_rejection_check`: `rejection_reason` is set exactly when `status` is `rejected`, and is one of the four reasons",
        "`files_ready_check`: a `ready` file has `sha256`, `completed_at` and, unless it is JSON or CSV, `pages`",
        "`files_sha256_check`: `sha256` is 64 lower-case hex characters",
        "`files_deleted_check`: `deleted_at` is set exactly when `status` is `deleted`",
        "`files_dates_check`: `completed_at` is not before `created_at`; `expires_at` is exactly 30 days after `created_at`",
        "`files_owner_id_idx`: index on (`owner_id`, `created_at` desc, `id` desc), for listing a user's files page by page",
        "`files_pending_idx`: partial index on (`created_at`) where `status = 'pending_upload'`, for the daily clean-up",
        "`files_expiry_idx`: partial index on (`expires_at`) where `status = 'ready'`, for marking files expired",
    ],
    "sampleCols": ["id", "owner_id", "s3_key", "file_name", "mime", "size_bytes", "pages", "status", "rejection_reason", "sha256", "created_at", "completed_at", "expires_at"],
    "sampleRows": [
        [F1, U1, f"users/{U1}/{F1}/original.pdf", "acme-invoice-0042.pdf", "application/pdf", "248913", "2", "ready", "(empty)", "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b", "2026-11-17 09:14:07+00", "2026-11-17 09:14:11+00", "2026-12-17 09:14:07+00"],
        [F2, U1, f"users/{U1}/{F2}/original.jpg", "scan.jpg", "image/jpeg", "512000", "(empty)", "rejected", "type_mismatch", "(empty)", "2026-11-17 09:16:40+00", "2026-11-17 09:16:44+00", "2026-12-17 09:16:40+00"],
        [F3, U1, f"users/{U1}/{F3}/original.jpg", "receipt-photo.jpg", "image/jpeg", "1843200", "(empty)", "pending_upload", "(empty)", "(empty)", "2026-11-17 09:20:30+00", "(empty)", "2026-12-17 09:20:30+00"],
    ],
}

INBOUND = {
    "name": "upload.inbound_events",
    "purpose": "One row per platform event Upload has acted on, so a repeated delivery has no effect.",
    "columns": [
        column("event_id", "uuid", "No", "", "Primary key", "The event's ID, from the sender."),
        column("type", "text", "No", "", "1 to 100 characters", "What happened, for example `identity.user.deleted`."),
        column("created_at", "timestamptz", "No", "now()", "", "When Upload processed it."),
    ],
    "constraints": [
        "`inbound_events_pkey`: primary key (`event_id`); inserting a duplicate fails, which is how a repeat is detected",
        "`inbound_events_type_check`: `type` is 1 to 100 characters",
    ],
    "sampleCols": ["event_id", "type", "created_at"],
    "sampleRows": [["0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "identity.user.deleted", "2026-11-17 10:00:01+00"]],
}

DATA_MODEL = {
    "tables": [FILES, INBOUND],
    "entities": [
        {"name": "File", "table": "`upload.files`", "what": "A file a user stored, and what Upload knows about it.",
         "relations": "Belongs to one user, by `owner_id` only. Other services refer to it by `file_id`. Its content is one object in the S3 bucket."},
        {"name": "Stored object", "table": "(S3, not the database)", "what": "The file's bytes, in a private bucket.",
         "relations": "Exactly one per file that is not rejected or deleted, at the file's `s3_key`."},
        {"name": "Processed event", "table": "`upload.inbound_events`", "what": "A platform event Upload has already acted on.",
         "relations": "Stands alone. Holds the event's ID only, not its contents."},
        {"name": "Audit event", "table": "`upload.audit_events`", "what": "A permanent record that something happened to a file.",
         "relations": "Refers to the file and the user by ID, with no foreign key, so the record outlives a deleted file."},
    ],
    "lifecycles": [
        {"name": "File", "text": "Created as `pending_upload` → after the check, `ready` or `rejected` → `deleted` when the user or their account deletion removes it, or `expired` after 30 days. A `pending_upload` file left for 24 hours is deleted by the daily clean-up. A file never returns to an earlier status."},
        {"name": "Stored object", "text": "Arrives when the browser sends it → removed at once if the check rejects it, when the file is deleted, or by the bucket after 30 days."},
        {"name": "Upload and download links", "text": "Never stored. Signed on request and valid for 5 minutes."},
    ],
    "otherTables": "The service template also gives Upload `audit_events`, `idempotency_keys` and `outbound_events`. Upload writes `file.created`, `file.uploaded`, `file.rejected`, `file.downloaded` and `file.deleted` to `audit_events`, uses `idempotency_keys` for `POST /files`, and keeps `inbound_events` (above) so a repeated event has no effect. In version 1 it announces no events of its own.",
    "notStored": [
        "The file's content: it lives only in S3, never in the database.",
        "Upload and download links: signed on request, valid for 5 minutes.",
        "The original path on the person's device: only the file name.",
        "Anything read from inside the file except its page count: what a document says is Extraction's job, not Upload's.",
    ],
    "rule": [
        "A file is usable (can be downloaded or extracted) only when its status is `ready`.",
        "A file is `ready` only after its stored size matches the declared size and its first bytes match its type.",
        "A rejected file has no stored object: it is deleted in the same step that rejects it.",
        "The storage key is built from IDs only, never from the file name.",
        "One file belongs to exactly one user and is never shared or moved to another.",
        "Deleting a user's account deletes all their objects and marks all their files `deleted`. Rows are kept, without content, so audit records still make sense.",
        "A status only moves forward: `pending_upload` → `ready` or `rejected` → `deleted` or `expired`.",
        "Every change of status writes an audit event in the same transaction.",
    ],
}

# ------------------------------------------------------------------ schema
DDL = """-- Upload service, version 1. Schema: upload.
-- IDs are UUIDv7 values generated by the service.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists upload;

create table upload.files (
  id               uuid        primary key,
  owner_id         uuid        not null,
  s3_key           text        not null,
  file_name        text        not null,
  mime             text        not null,
  size_bytes       bigint      not null,
  pages            integer,
  accept           jsonb       not null default '{}',
  status           text        not null default 'pending_upload',
  rejection_reason text,
  sha256           text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  deleted_at       timestamptz,
  expires_at       timestamptz not null,

  constraint files_s3_key_key unique (s3_key),
  constraint files_s3_key_check
    check (s3_key like 'users/' || owner_id::text || '/' || id::text || '/original.%'),
  constraint files_file_name_check
    check (length(file_name) between 1 and 255 and file_name !~ '[/\\\\[:cntrl:]]'),
  constraint files_mime_check
    check (mime in ('application/pdf', 'image/png', 'image/jpeg', 'application/json', 'text/csv')),
  constraint files_size_bytes_check check (size_bytes between 1 and 10485760),
  constraint files_pages_check check (
    pages is null
    or (mime = 'application/pdf' and pages between 1 and 10)
    or (mime in ('image/png', 'image/jpeg') and pages = 1)
  ),
  constraint files_accept_check
    check (accept - array['mimes', 'max_bytes', 'max_pages'] = '{}'::jsonb),
  constraint files_status_check
    check (status in ('pending_upload', 'ready', 'rejected', 'deleted', 'expired')),
  constraint files_rejection_check check (
    (status = 'rejected') = (rejection_reason is not null)
    and (rejection_reason is null
         or rejection_reason in ('type_mismatch', 'too_many_pages', 'unreadable', 'size_mismatch'))
  ),
  constraint files_ready_check check (
    status <> 'ready'
    or (sha256 is not null and completed_at is not null
        and (pages is not null or mime in ('application/json', 'text/csv')))
  ),
  constraint files_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint files_deleted_check check ((status = 'deleted') = (deleted_at is not null)),
  constraint files_dates_check check (
    (completed_at is null or completed_at >= created_at)
    and expires_at = created_at + interval '30 days'
  )
);

-- A user's files, newest first, page by page.
create index files_owner_id_idx on upload.files (owner_id, created_at desc, id desc);
-- The daily clean-up of uploads that never arrived.
create index files_pending_idx on upload.files (created_at) where status = 'pending_upload';
-- Marking files expired when the bucket removes them.
create index files_expiry_idx on upload.files (expires_at) where status = 'ready';

create table upload.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now(),

  constraint inbound_events_type_check check (length(type) between 1 and 100)
);

-- The service's database login reaches only this schema. Rows are never
-- deleted (a deleted file keeps its row, without content), and audit events
-- can be added and read but never changed.
grant usage on schema upload to upload_service;
grant select, insert, update on upload.files to upload_service;
grant select, insert on upload.inbound_events to upload_service;
grant select, insert on upload.audit_events to upload_service;
"""

QUERIES = [
    {"title": "List a user's files, one page (`GET /files`)",
     "sql": "select id, file_name, mime, size_bytes, pages, status, created_at\nfrom upload.files\nwhere owner_id = $1\n  and status in ('pending_upload', 'ready', 'rejected')\n  and (created_at, id) < ($2, $3)      -- from the cursor; omitted on the first page\norder by created_at desc, id desc\nlimit $4;"},
    {"title": "Mark a checked file ready (`POST /files/{fileId}/complete`)",
     "sql": "update upload.files\nset status = 'ready', pages = $3, sha256 = $4, completed_at = now()\nwhere id = $1 and owner_id = $2 and status = 'pending_upload'\nreturning *;     -- no row: already checked, or not this user's file"},
    {"title": "Find abandoned uploads (daily clean-up)",
     "sql": "select id, s3_key\nfrom upload.files\nwhere status = 'pending_upload'\n  and created_at < now() - interval '24 hours';"},
]

SCHEMA_RULES = [
    "Primary keys on both tables; `s3_key` is unique, so two files can never share an object.",
    "The storage key must be built from the owner and file IDs.",
    "Type, size, page count, status and rejection reason accept only their listed values or ranges.",
    "A rejection reason exists exactly when a file is rejected; a deleted date exists exactly when it is deleted.",
    "A ready file always has its fingerprint and completion time.",
    "`expires_at` is always exactly 30 days after `created_at`, matching the bucket's lifecycle rule.",
    "Rows are never deleted: the service's login has no `DELETE` grant. Audit events can be added and read, never changed.",
    "Upload's database login can reach only the `upload` schema. No other service can read these tables.",
]

# ------------------------------------------------------------------ user journeys
JOURNEYS = [
    journey(
        "Upload a document on a computer", "Someone with a document on their computer",
        "Drags a file onto the upload area, or chooses Upload a file.", ["MVP1-E2-02", "MVP1-E2-03", "MVP1-E2-04"],
        [
            ("Drops a PDF onto the upload area, or picks it with Choose file.", "The upload area checks the type and size in the browser first, so an obvious mistake is caught before anything is sent."),
            ("Sees the file name and a progress bar starting at 0%.", "Upload records the file as `pending_upload` and returns a link valid for 5 minutes."),
            ("Watches the bar fill.", "The browser sends the file straight to private storage with that link. Upload never handles the bytes."),
            ("Sees 'Checking your file…' for a moment.", "Upload confirms the file arrived at the declared size, checks its first bytes match its type, and counts its pages."),
            ("Sees 'Uploaded' and is taken to the next step.", "The file is `ready`. The app that uses Upload moves on; in DocFlow, the extraction page opens."),
        ],
        "The file is stored privately, checked and ready to use. Only its owner can read it, through links that last 5 minutes.",
    ),
    journey(
        "Upload from a phone", "Someone with a paper invoice or a file on their phone",
        "Taps Choose file or Take photo.", ["MVP1-E2-04"],
        [
            ("Taps Take photo and photographs the invoice, or taps Choose file and picks a PDF or image.", "The phone's own camera or file picker opens. Nothing depends on dragging, which phones cannot do."),
            ("Sees the photo's name and the progress bar.", "As on a computer: the file is recorded and sent straight to storage."),
            ("Sees 'Uploaded' and moves on.", "The photo is checked as a JPEG or PNG and counted as one page."),
        ],
        "The same result as on a computer.",
    ),
    journey(
        "Upload a file that is not what it says", "Someone who picked the wrong file, for example a renamed spreadsheet",
        "The browser reports a PDF, but the content is something else.", ["MVP1-E2-03"],
        [
            ("Uploads the file; the bar reaches 100%.", "The file arrives in storage."),
            ("Sees 'This file isn't a readable PDF, PNG or JPEG. Choose another file.'", "The check finds the first bytes do not match the type. Upload marks the file `rejected` with the reason `type_mismatch` and deletes it from storage at once."),
            ("Chooses another file.", "A new upload starts. The rejected one is kept only as a record, without content."),
        ],
        "Nothing unreadable is stored or passed on to extraction.",
    ),
    journey(
        "Lose the connection during an upload", "Someone on a weak mobile connection",
        "The connection drops while the bar is moving.", ["MVP1-E2-04"],
        [
            ("Sees 'The upload stopped. Check your connection and try again.' and a Retry button.", "The browser's transfer failed. Upload still has the file as `pending_upload`."),
            ("Taps Retry.", "If the 5-minute link is still valid, the browser sends the file again with it; if not, it asks Upload for a new file and link."),
            ("Sees 'Uploaded'.", "The check runs as usual."),
        ],
        "The person never has to start over by hand. An upload abandoned altogether is deleted by the daily clean-up after 24 hours.",
    ),
    journey(
        "Open a stored file", "The file's owner, for example checking the original next to extracted data",
        "Taps the file's name or View original.", ["MVP1-E2-03"],
        [
            ("Taps View original.", "The app asks Upload for a link to the file."),
            ("Sees the PDF or image open in a new tab.", "Upload returns a link valid for 5 minutes; the browser reads the file straight from storage."),
            ("Taps Download instead.", "The link is made with `attachment`, so the file saves under its original name. Upload records `file.downloaded`."),
        ],
        "The person sees their file. The link stops working after 5 minutes, so a forwarded link is of no use to anyone else.",
    ),
    journey(
        "Delete a file", "The file's owner", "Chooses Delete on a file and confirms.", ["MVP1-E2-02"],
        [
            ("Chooses Delete, then confirms 'Delete this file? This can't be undone.'", "The app asks Upload to delete the file."),
            ("Sees the file disappear from the list.", "Upload removes the object from storage, marks the file `deleted` and records `file.deleted`."),
        ],
        "The content is gone for good. A record that the file existed remains, without content, so the history still makes sense.",
    ),
]

EDGE_CASES = [
    {"situation": "Picks a Word document or another unsupported type", "sees": "'PDF, PNG and JPEG files only.' Nothing is uploaded.", "code": "`unsupported_file_type`"},
    {"situation": "Picks a file over 10 MB", "sees": "'This file is 14.2 MB. The limit is 10 MB.' Nothing is uploaded.", "code": "`file_too_large`"},
    {"situation": "Uploads a PDF with more than 10 pages", "sees": "'This PDF has 14 pages. The limit is 10.' The file is deleted.", "code": "Rejected: `too_many_pages`"},
    {"situation": "The content does not match the type", "sees": "'This file isn't a readable PDF, PNG or JPEG. Choose another file.'", "code": "Rejected: `type_mismatch`"},
    {"situation": "The connection drops mid-upload", "sees": "'The upload stopped. Check your connection and try again.' with Retry.", "code": "`upload_missing`"},
    {"situation": "Waits more than 5 minutes before the file is sent", "sees": "Nothing different: the upload area asks for a new link and continues.", "code": "(S3 refuses the expired link)"},
    {"situation": "What arrived is not the size declared", "sees": "'Something went wrong sending this file. Try again.'", "code": "`size_mismatch`"},
    {"situation": "Opens a file that is still uploading", "sees": "'This file is still uploading.'", "code": "`file_not_ready`"},
    {"situation": "Opens a file older than 30 days", "sees": "'This file was removed after 30 days. Upload it again to use it.'", "code": "`file_expired`"},
    {"situation": "Follows a link to someone else's file", "sees": "'File not found.' Nothing reveals that the file exists.", "code": "`file_not_found`"},
    {"situation": "Storage is unavailable", "sees": "'Uploads are unavailable for a moment. Try again shortly.' Nothing is lost.", "code": "`storage_unavailable`"},
    {"situation": "Is signed out", "sees": "Is taken to sign in, then returned to the upload page.", "code": "`not_authenticated`"},
]

MODULE = {
    "slug": "document-upload",
    "docsPath": "docs/services/upload",
    "extraDocs": [],
    "labels": {"flow": "How an upload works", "hosted": "Pages provided by an outside service"},
    "notes": {
        "journey": "What a person sees and what the system does, for uploading a file in version 1.",
        "ui": "What the Upload service ships for apps to use, as the package `packages/ui-upload`.",
        "hosted": "",
        "token": "",
        "schema": "The SQL for the Upload service's tables, in the `upload` schema. No other service can read them.",
    },
    "overview": {
        "name": "Upload", "version": "Version 1 · Files to AWS S3", "status": "In design", "base": BASE,
        "what": [], "why": [], "scope_in": [], "scope_out": [],
        "stories": ["MVP1-E2-01", "MVP1-E2-02", "MVP1-E2-03", "MVP1-E2-04", "MVP1-E2-05"],
    },
    "errorSample": problem("file_too_large", "File too large", 413, "This file is 14.2 MB. The limit is 10 MB."),
    "endpoints": ENDPOINTS,
    "tables": DATA_MODEL["tables"],
    "entities": DATA_MODEL["entities"],
    "lifecycles": DATA_MODEL["lifecycles"],
    "otherTables": DATA_MODEL["otherTables"],
    "notStored": DATA_MODEL["notStored"],
    "ddl": DDL,
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "queries": QUERIES,
    "noEndpoint": [
        {"topic": "Sending the file (MVP1-E2-02)", "how": "The browser PUTs the bytes straight to S3 with the link from `POST /files`, sending exactly the `headers` returned. Upload never receives the file's content through its API."},
        {"topic": "The storage bucket (MVP1-E2-01)", "how": "Private, encrypted, no public access, objects deleted after 30 days, and CORS open only to 01scale.com and localhost. Setup steps in `docs/infra/s3.md`."},
        {"topic": "Abandoned uploads", "how": "A daily clean-up deletes files still `pending_upload` after 24 hours, and their object if one arrived. Files past 30 days are marked `expired` to match the bucket's own deletion."},
        {"topic": "DocFlow's endpoints in these stories", "how": "`POST /api/docflow/v1/documents`, `…/upload-complete` and the documents list belong to the DocFlow app, which calls this service. They are designed with the DocFlow app shell (`MVP1-E0-09`)."},
        {"topic": "AI agents", "how": "Each endpoint above is also a tool on Upload's MCP server, `POST /api/upload/mcp`, with the same inputs and errors. An agent creates a file and receives the upload link; sending the bytes is an ordinary HTTPS PUT."},
        {"topic": "Health and contract", "how": "Like every service, Upload also serves `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`)."},
    ],
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "`mime` must be one of the five allowed types, and allowed by `accept` if the app sent it.",
            "`size` must be between 1 byte and 10 MB, and within `accept.max_bytes`.",
            "`accept` can only narrow the service's limits, never widen them.",
            "`file_name` is 1 to 255 characters, with no path separators or control characters; it is never used to build the storage key.",
            "`owner_id` is accepted only from a caller with the `service` role.",
            "Another user's file always answers `404 file_not_found`, never `403`.",
            "Upload and download links last 5 minutes, and fix the type and size (upload) or type and filename (download) in their signature.",
            "`POST /files` accepts `Idempotency-Key`; `complete` and `DELETE` are idempotent by design.",
            "Events must carry a valid signature and are processed once per `event_id`.",
            "Starting rate limits at the gateway: 30 file creations a minute per user; 120 reads a minute per user.",
        ]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": SCHEMA_RULES},
        {"level": "Data model level: business rules the service guarantees", "items": DATA_MODEL["rule"]},
    ],
    "openQuestions": [
        "Rate limits are starting values to be tuned once there is real traffic.",
    ],
}
