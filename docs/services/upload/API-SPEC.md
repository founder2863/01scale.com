# Upload service — API specification

> **Version 1 · Files to AWS S3.** Status: designed, not built. Stories: `MVP1-E2-01`, `MVP1-E2-02`, `MVP1-E2-03`, `MVP1-E2-04`, `MVP1-E2-05`.

Base address: `https://01scale.com/api/upload/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/file_too_large",
  "title": "File too large",
  "status": 413,
  "detail": "This file is 14.2 MB. The limit is 10 MB.",
  "code": "file_too_large",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### POST /files

**Create a file and get an upload link.** Records a new file and returns a link the browser uses to send the file straight to private storage. The file itself never passes through the API.

Access: **Signed in** · Story: `MVP1-E2-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `file_name` | body | string | Yes | 1 to 255 characters after trimming; no `/`, `\` or control characters. | The name the person sees. Never used as the storage key. |
| `mime` | body | string | Yes | One of `application/pdf`, `image/png`, `image/jpeg`, `application/json`, `text/csv`, and allowed by `accept` if given. | The file type the browser reports. Checked again against the real bytes on completion. |
| `size` | body | integer | Yes | 1 to 10,485,760 (10 MB), and at most `accept.max_bytes` if given. | The exact size in bytes. The upload link only accepts this size. |
| `accept` | body | object | No | `{mimes[], max_bytes, max_pages}`; each value may only narrow the service's limits, never widen them. `max_pages` 1 to 10, PDFs only. | The calling app's own limits. DocFlow sends PDF, PNG and JPEG, 10 MB and 10 pages. |
| `owner_id` | body | uuid | Only with Service access | Rejected unless the caller has the `service` role. | Lets an app's server store a file for a user, for example DocFlow saving the JSON and CSV results (MVP1-E5-04). |
| `Idempotency-Key` | header | string | No | 1 to 255 characters. Same key and same body within 24 hours returns the first response. | Makes a retried request safe. |

**Behaviour**

- Checks the inputs against the service's limits and `accept`, before anything is stored.
- Creates the file with status `pending_upload` and storage key `users/{owner_id}/{file_id}/original.{ext}`, where `ext` comes from `mime`.
- Signs an S3 PUT link valid for 5 minutes. `Content-Type` and `Content-Length` are part of the signature, so S3 refuses a different type or size.
- Records `file.created` in the audit log.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | The file was created | `file` (status `pending_upload`) and `upload`: `url`, `method` (always `PUT`), the `headers` the browser must send, and `expires_at`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `413` | `file_too_large` | `size` is over 10 MB or over `accept.max_bytes`. |
| `415` | `unsupported_file_type` | `mime` is not one of the allowed types, or not allowed by `accept`. |
| `422` | `validation_failed` | Another input is missing or malformed; `errors[]` lists each field. |
| `422` | `idempotency_key_reused` | The same `Idempotency-Key` was sent with a different body. |
| `403` | `service_only` | `owner_id` was sent without the `service` role. |
| `401` | `not_authenticated` | No valid access token. |
| `503` | `storage_unavailable` | AWS S3 could not be reached. Nothing was changed; safe to retry. |

**Sample request**

```http
POST /api/upload/v1/files HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Idempotency-Key: 8b1f6c2e-upload-1
Content-Type: application/json

{
  "file_name": "acme-invoice-0042.pdf",
  "mime": "application/pdf",
  "size": 248913,
  "accept": {
    "mimes": [
      "application/pdf",
      "image/png",
      "image/jpeg"
    ],
    "max_bytes": 10485760,
    "max_pages": 10
  }
}
```

**Sample response**

```json
{
  "file": {
    "id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "file_name": "acme-invoice-0042.pdf",
    "mime": "application/pdf",
    "size_bytes": 248913,
    "pages": null,
    "status": "pending_upload",
    "rejection_reason": null,
    "sha256": null,
    "created_at": "2026-11-17T09:14:07Z",
    "completed_at": null,
    "expires_at": "2026-12-17T09:14:07Z"
  },
  "upload": {
    "url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/users/0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e/0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b/original.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAEXAMPLE%2F20261117%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261117T091407Z&X-Amz-Expires=300&X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost&X-Amz-Signature=5f2c...",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf",
      "Content-Length": "248913"
    },
    "expires_at": "2026-11-17T09:19:07Z"
  }
}
```

### POST /files/{fileId}/complete

**Confirm the upload and check the file.** Called after the browser has sent the file. Upload checks what actually arrived in storage and marks the file ready or rejected. Safe to call more than once.

Access: **Signed in** · Story: `MVP1-E2-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `fileId` | path | uuid | Yes | A file of the caller's. | The file to confirm. |

**Behaviour**

- If the file is already `ready` or `rejected`, returns it unchanged.
- Asks S3 whether the object exists and compares its size with the size declared at creation.
- Reads the first bytes to confirm the real type: `%PDF-` for PDF, the PNG signature, `FF D8 FF` for JPEG; JSON must parse, CSV must be valid UTF-8 text.
- For a PDF, counts its pages with a PDF parser (not by text search) and checks them against `accept.max_pages`. An image counts as 1 page.
- Passing: computes the SHA-256 of the content, sets status `ready`, `pages` and `completed_at`, and records `file.uploaded`.
- Failing a check: sets status `rejected` with a `rejection_reason`, deletes the object from S3, and records `file.rejected`. This is still a `200`: the check ran and has an answer.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The check has run | `file` with status `ready`, or `rejected` and its `rejection_reason`: `type_mismatch`, `too_many_pages`, `unreadable`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. The gateway normally answers this before the request arrives. |
| `404` | `file_not_found` | No such file, or it belongs to another user. The same answer in both cases. |
| `409` | `upload_missing` | Nothing has arrived in storage yet, for example the browser has not finished sending. Safe to retry. |
| `409` | `size_mismatch` | What arrived is not the declared size. The object is deleted; create a new file to try again. |
| `409` | `file_deleted` | The file was deleted or has expired. |
| `503` | `storage_unavailable` | AWS S3 could not be reached. Nothing was changed; safe to retry. |

**Sample request**

```http
POST /api/upload/v1/files/0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b/complete HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "file": {
    "id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "file_name": "acme-invoice-0042.pdf",
    "mime": "application/pdf",
    "size_bytes": 248913,
    "pages": 2,
    "status": "ready",
    "rejection_reason": null,
    "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    "created_at": "2026-11-17T09:14:07Z",
    "completed_at": "2026-11-17T09:14:11Z",
    "expires_at": "2026-12-17T09:14:07Z"
  }
}
```

### GET /files/{fileId}

**Get one file.** A file's details and status.

Access: **Signed in** · Story: `MVP1-E2-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `fileId` | path | uuid | Yes | A UUID. | The file. |

**Behaviour**

- Read only.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The file exists and is the caller's | `file`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. The gateway normally answers this before the request arrives. |
| `404` | `file_not_found` | No such file, or it belongs to another user. The same answer in both cases. |

**Sample request**

```http
GET /api/upload/v1/files/0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "file": {
    "id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "file_name": "acme-invoice-0042.pdf",
    "mime": "application/pdf",
    "size_bytes": 248913,
    "pages": 2,
    "status": "ready",
    "rejection_reason": null,
    "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    "created_at": "2026-11-17T09:14:07Z",
    "completed_at": "2026-11-17T09:14:11Z",
    "expires_at": "2026-12-17T09:14:07Z"
  }
}
```

### GET /files

**List my files.** The caller's files, newest first.

Access: **Signed in** · Story: `MVP1-E2-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `status` | query | string | No | One of `pending_upload`, `ready`, `rejected`. Deleted and expired files are never listed. | Only files with this status. |
| `cursor` | query | string | No | A `next_cursor` from an earlier page, unchanged. | Where to continue. |
| `limit` | query | integer | No | 1 to 100. Default 20. | How many to return. |

**Behaviour**

- Read only. Ordered by `created_at` then `id`, newest first.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always, even when empty | `data[]` of files and `next_cursor` (null on the last page). |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | `status`, `cursor` or `limit` is not valid. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/upload/v1/files?status=ready&limit=2 HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
      "file_name": "acme-invoice-0042.pdf",
      "mime": "application/pdf",
      "size_bytes": 248913,
      "pages": 2,
      "status": "ready",
      "rejection_reason": null,
      "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
      "created_at": "2026-11-17T09:14:07Z",
      "completed_at": "2026-11-17T09:14:11Z",
      "expires_at": "2026-12-17T09:14:07Z"
    }
  ],
  "next_cursor": null
}
```

### GET /files/{fileId}/download-url

**Get a link to read the file.** A link valid for 5 minutes that opens or downloads the file directly from storage.

Access: **Signed in** · Story: `MVP1-E2-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `fileId` | path | uuid | Yes | A file of the caller's with status `ready`. | The file. |
| `disposition` | query | string | No | `inline` (default) or `attachment`. | Show in the browser, or download. |
| `filename` | query | string | No | 1 to 255 characters; same rules as `file_name`. Default: the file's `file_name`. | The name the downloaded file gets. |

**Behaviour**

- Signs an S3 GET link valid for 5 minutes, with the content type and `Content-Disposition` fixed in the signature.
- Records `file.downloaded` when `disposition` is `attachment`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The file is ready | `url` and `expires_at`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. The gateway normally answers this before the request arrives. |
| `404` | `file_not_found` | No such file, or it belongs to another user. The same answer in both cases. |
| `409` | `file_not_ready` | The file is still uploading, or was rejected. |
| `410` | `file_expired` | The file was removed after 30 days. |
| `503` | `storage_unavailable` | AWS S3 could not be reached. Nothing was changed; safe to retry. |

**Sample request**

```http
GET /api/upload/v1/files/0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b/download-url?disposition=attachment HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/users/0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e/0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b/original.pdf?response-content-disposition=attachment%3B%20filename%3D%22acme-invoice-0042.pdf%22&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAEXAMPLE%2F20261117%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261117T091407Z&X-Amz-Expires=300&X-Amz-SignedHeaders=host&X-Amz-Signature=5f2c...",
  "expires_at": "2026-11-17T09:25:00Z"
}
```

### DELETE /files/{fileId}

**Delete a file.** Removes the stored object and marks the file deleted. Safe to call more than once.

Access: **Signed in** · Story: `MVP1-E2-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `fileId` | path | uuid | Yes | A file of the caller's. | The file. |

**Behaviour**

- Deletes the object from S3, sets status `deleted` and `deleted_at`, and records `file.deleted`.
- A file that is already deleted returns `204` again.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `204` | The file is deleted | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. The gateway normally answers this before the request arrives. |
| `404` | `file_not_found` | No such file, or it belongs to another user. The same answer in both cases. |
| `503` | `storage_unavailable` | AWS S3 could not be reached. Nothing was changed; safe to retry. |

**Sample request**

```http
DELETE /api/upload/v1/files/0193b0c9-5f22-7a08-9e44-1a2b3c4d5e6f HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```http
HTTP/1.1 204 No Content
```

### POST /events

**Receive platform events.** Where other services' signed events arrive. In version 1 Upload acts on one: a user's account was deleted, so their files go too.

Access: **Service** · Story: `MVP1-E1-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `X-01scale-Signature` | header | string | Yes | HMAC-SHA256 of the raw body with the shared events key, compared in constant time. | Proves the event came from the platform. |
| `event_id` | body | uuid | Yes | Each event is processed once; a repeat returns `200` with no effect. | The event's ID. |
| `type` | body | string | Yes | Version 1 acts on `identity.user.deleted`; other types are acknowledged and ignored. | What happened. |
| `data` | body | object | Yes | For `identity.user.deleted`: `{user_id}`. | The event's details. |

**Behaviour**

- For `identity.user.deleted`: deletes the object of each of that user's files, using the keys in `upload.files` (so the service never needs permission to list the bucket), marks the files `deleted`, and records `file.deleted` for each with `reason: account_deleted`.

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
POST /api/upload/v1/events HTTP/1.1
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
| Sending the file (MVP1-E2-02) | The browser PUTs the bytes straight to S3 with the link from `POST /files`, sending exactly the `headers` returned. Upload never receives the file's content through its API. |
| The storage bucket (MVP1-E2-01) | Private, encrypted, no public access, objects deleted after 30 days, and CORS open only to 01scale.com and localhost. Setup steps in `docs/infra/s3.md`. |
| Abandoned uploads | A daily clean-up deletes files still `pending_upload` after 24 hours, and their object if one arrived. Files past 30 days are marked `expired` to match the bucket's own deletion. |
| DocFlow's endpoints in these stories | `POST /api/docflow/v1/documents`, `…/upload-complete` and the documents list belong to the DocFlow app, which calls this service. They are designed with the DocFlow app shell (`MVP1-E0-09`). |
| AI agents | Each endpoint above is also a tool on Upload's MCP server, `POST /api/upload/mcp`, with the same inputs and errors. An agent creates a file and receives the upload link; sending the bytes is an ordinary HTTPS PUT. |
| Health and contract | Like every service, Upload also serves `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`). |

## Constraints at the API level

- `mime` must be one of the five allowed types, and allowed by `accept` if the app sent it.
- `size` must be between 1 byte and 10 MB, and within `accept.max_bytes`.
- `accept` can only narrow the service's limits, never widen them.
- `file_name` is 1 to 255 characters, with no path separators or control characters; it is never used to build the storage key.
- `owner_id` is accepted only from a caller with the `service` role.
- Another user's file always answers `404 file_not_found`, never `403`.
- Upload and download links last 5 minutes, and fix the type and size (upload) or type and filename (download) in their signature.
- `POST /files` accepts `Idempotency-Key`; `complete` and `DELETE` are idempotent by design.
- Events must carry a valid signature and are processed once per `event_id`.
- Rate limit at the gateway: 100 requests a minute per user, across every endpoint of every service (Nikhil's decision on #64). Over it, `429 rate_limited` with `Retry-After`.
