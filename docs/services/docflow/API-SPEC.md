# DocFlow service — API specification

> **Version 1 · The app that connects the services.** Status: designed, not built. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

Base address: `https://01scale.com/api/docflow/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/payment_required",
  "title": "Payment required",
  "status": 402,
  "detail": "Pay to download these results.",
  "code": "payment_required",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### POST /documents

**Start a document.** Starts the DocFlow process for one invoice: creates the document and its upload in the Upload service with DocFlow's limits.

Access: **Signed in** · Scope: `docflow:write` · Story: `MVP1-E2-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `file_name` | body | string | Yes | As Upload's. | The invoice's name. |
| `mime` | body | string | Yes | `application/pdf`, `image/png` or `image/jpeg`. | Its type. |
| `size` | body | integer | Yes | 1 to 10 MB. | Its size. |
| `Idempotency-Key` | header | string | No | 1 to 255 characters. | Makes a retry safe. |

**Behaviour**

- Calls Upload `POST /files` with the caller's token and `accept` = PDF, PNG, JPEG, 10 MB, 10 pages.
- Records the document as `pending_upload` with the file's ID; returns Upload's upload link.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | Created | `document` and `upload` (Upload's link and headers). |

**Errors**

| Status | Code | When |
|---|---|---|
| `413` | `file_too_large` | Passed on from Upload. |
| `415` | `unsupported_file_type` | Passed on from Upload. |
| `422` | `validation_failed` | An input is malformed. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/docflow/v1/documents HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "file_name": "acme-invoice-0042.pdf",
  "mime": "application/pdf",
  "size": 248913
}
```

**Sample response**

```json
{
  "document": {
    "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "status": "pending_upload",
    "next_action": "upload",
    "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "job_id": null,
    "review_task_id": null,
    "order_id": null,
    "created_at": "2026-11-17T09:14:07Z",
    "updated_at": "2026-11-17T09:17:03Z"
  },
  "upload": {
    "url": "https://01scale-uploads.s3.us-east-1.amazonaws.com/users/\u2026/original.pdf?X-Amz-Signature=\u2026",
    "method": "PUT",
    "headers": {
      "Content-Type": "application/pdf",
      "Content-Length": "248913"
    },
    "expires_at": "2026-11-17T09:19:07Z"
  }
}
```

### POST /documents/{documentId}/upload-complete

**Confirm the upload and start extraction.** Called by the upload component when the bytes are sent.

Access: **Signed in** · Scope: `docflow:write` · Story: `MVP1-E2-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |

**Behaviour**

- Calls Upload `POST /files/{fileId}/complete`. If the file is rejected, the document is `rejected` with Upload's reason.
- If ready, calls Extraction `POST /jobs` with `reference: docflow:{documentId}` and sets the document `extracting`.
- Idempotent: a document already past this step is returned unchanged.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The upload was checked | `document` with status `extracting` or `rejected`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `upload_missing` | Passed on from Upload: the file has not arrived. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/upload-complete HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "document": {
    "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "status": "extracting",
    "next_action": "extract",
    "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "job_id": "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b",
    "review_task_id": null,
    "order_id": null,
    "created_at": "2026-11-17T09:14:07Z",
    "updated_at": "2026-11-17T09:17:03Z"
  }
}
```

### GET /documents

**List my documents.** The caller's documents, newest first, with a status and the next action for each.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E2-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `status` | query | string | No | A document status. | Filter. |
| `cursor, limit` | query | string, integer | No | `limit` 1 to 100. | Paging. |

**Behaviour**

- Read only. `next_action` is `upload`, `extract`, `review`, `results`, `pay` or `download`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `data[]` of documents and `next_cursor`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/documents HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
      "file_name": "acme-invoice-0042.pdf",
      "status": "paid",
      "next_action": "download",
      "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
      "job_id": "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b",
      "review_task_id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
      "order_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
      "created_at": "2026-11-17T09:14:07Z",
      "updated_at": "2026-11-17T09:17:03Z"
    }
  ],
  "next_cursor": null
}
```

### GET /documents/{documentId}

**Get one document.** A document, its status, and the IDs of its parts in each service.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E2-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |

**Behaviour**

- Read only.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The document is the caller's | `document`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "document": {
    "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "status": "paid",
    "next_action": "download",
    "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "job_id": "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b",
    "review_task_id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
    "order_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
    "created_at": "2026-11-17T09:14:07Z",
    "updated_at": "2026-11-17T09:17:03Z"
  }
}
```

### POST /documents/{documentId}/retry-extraction

**Retry a failed extraction.** Starts a new extraction job after the last one failed.

Access: **Signed in** · Scope: `docflow:write` · Story: `MVP1-E3-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |

**Behaviour**

- Calls Extraction `POST /jobs` for the same file; stores the new job's ID; the document is `extracting` again.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `202` | A new job started | `document`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `not_failed` | The last extraction did not fail. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/retry-extraction HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "document": {
    "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "status": "extracting",
    "next_action": "extract",
    "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "job_id": "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b",
    "review_task_id": null,
    "order_id": null,
    "created_at": "2026-11-17T09:14:07Z",
    "updated_at": "2026-11-17T09:17:03Z"
  }
}
```

### POST /documents/{documentId}/complete-review

**Finish review and build the outputs.** Re-checks the corrected values, completes the review, and builds the JSON and CSV.

Access: **Signed in** · Scope: `docflow:write` · Story: `MVP1-E4-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |
| `confirm_failed_checks` | body | boolean | No | Default false. | The person confirmed values that still fail a check are as printed. |

**Behaviour**

- Reads the review task, then calls Extraction `POST /validations` with its values.
- If a check fails and `confirm_failed_checks` is false, answers `409` with the failed checks; nothing changes.
- Otherwise calls Review `POST /tasks/{taskId}/complete` (with `checks_overridden`), builds `result.json` and `result.csv`, stores each through Upload `POST /files` with the person's own token (Idempotency-Key `docflow:{documentId}:v{version}:{format}`), records the output version, and sets the document `reviewed`.
- Safe to retry after a failure halfway: if Review answers `409 task_completed`, the review is already done, so DocFlow continues from building the outputs. The document stays `needs_review` until the outputs are stored, and repeated uploads return the same files.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Review completed and outputs built | `document` (status `reviewed`) and `outputs`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `fields_unresolved` | Passed on from Review. |
| `409` | `checks_failed` | `failed_checks[]` lists them; send `confirm_failed_checks: true` to keep the values. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/complete-review HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
Content-Type: application/json

{
  "confirm_failed_checks": false
}
```

**Sample response**

```json
{
  "document": {
    "id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "status": "reviewed",
    "next_action": "pay",
    "file_id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
    "job_id": "0193b0d1-4b2c-7d10-9a8b-1c2d3e4f5a6b",
    "review_task_id": "0193b0f2-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
    "order_id": null,
    "created_at": "2026-11-17T09:14:07Z",
    "updated_at": "2026-11-17T09:17:03Z"
  },
  "outputs": {
    "version": 1,
    "locked": true,
    "formats": [
      "json",
      "csv"
    ]
  }
}
```

### GET /documents/{documentId}/outputs

**Which outputs exist.** The latest outputs and whether download is unlocked.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E5-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |

**Behaviour**

- Read only. `locked` is true until the order is paid.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Outputs exist | `version`, `locked`, `formats`, `generated_at`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `outputs_not_ready` | The review is not complete. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/outputs HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "version": 1,
  "locked": false,
  "formats": [
    "json",
    "csv"
  ],
  "generated_at": "2026-11-17T09:16:03Z"
}
```

### GET /documents/{documentId}/outputs/{format}/preview

**Preview the JSON or CSV.** The full output, shown on screen, before or after paying.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E5-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |
| `format` | path | string | Yes | `json` or `csv`. | Which output. |

**Behaviour**

- Returns the stored output's content inline, read through Upload.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Outputs exist | `application/json` or `text/csv` with `Content-Disposition: inline`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `outputs_not_ready` | The review is not complete. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/outputs/json/preview HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": {
    "vendor_name": "Acme Supplies Ltd",
    "invoice_number": "INV-0042",
    "invoice_date": "2026-11-02",
    "currency": "USD",
    "subtotal": "1150.00",
    "tax_total": "80.00",
    "total": "1230.00",
    "line_items": [
      {
        "description": "Paper, A4",
        "quantity": "10",
        "unit_price": "115.00",
        "amount": "1150.00"
      }
    ]
  },
  "metadata": {
    "document_id": "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "file_name": "acme-invoice-0042.pdf",
    "pages": 2,
    "model": "claude-sonnet-5-5",
    "prompt_version": "extract-invoice/v1",
    "extracted_at": "2026-11-17T09:14:41Z",
    "reviewed_at": "2026-11-17T09:16:02Z",
    "reviewed_by": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
    "fields_flagged": 3,
    "fields_corrected": 1,
    "fields": {
      "total": {
        "confidence": 0.3,
        "corrected": true
      },
      "vendor_name": {
        "confidence": 0.97,
        "corrected": false
      }
    }
  }
}
```

### GET /documents/{documentId}/outputs/{format}/download

**Download the JSON or CSV.** Locked until the order is paid, checked on the server every time.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E5-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |
| `format` | path | string | Yes | `json` or `csv`. | Which output. |

**Behaviour**

- Reads the order from Payment; if it is not `paid`, answers `402`.
- Otherwise asks Upload for a 5-minute download link named `{document}-result.{format}`, redirects to it, and records `delivery.downloaded` (`MVP1-E7-02`).

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `302` | Paid | `Location`: the 5-minute Upload link. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `402` | `payment_required` | The order is not paid. |
| `409` | `outputs_not_ready` | The review is not complete. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/outputs/csv/download HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```http
HTTP/1.1 302 Found
Location: https://01scale-uploads.s3.us-east-1.amazonaws.com/users/…/original.csv?response-content-disposition=attachment…&X-Amz-Signature=…
```

### POST /documents/{documentId}/checkout

**Start payment.** Sets the price and asks Payment for a checkout page.

Access: **Signed in** · Scope: `docflow:write` · Story: `MVP1-E6-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `documentId` | path | uuid | Yes | A document of the caller's. | The document. |

**Behaviour**

- Requires status `reviewed`.
- Calls Payment `POST /orders` from DocFlow's server with a delegated token for the person (Payment accepts no other kind), the price, $5.00 (500 cents, from configuration), `reference: docflow:{documentId}`, and success and cancel addresses; stores the order's ID.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | Order ready | `order_id` and `checkout_url`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `document_not_found` | No such document, or it belongs to another user. The same answer in both cases. |
| `409` | `already_paid` | Go straight to success. |
| `409` | `not_reviewed` | The review is not complete. |
| `503` | `dependency_unavailable` | A platform service could not be reached. Nothing was changed; safe to retry. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/docflow/v1/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/checkout HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "order_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_\u2026"
}
```

### GET /stats

**My DocFlow totals.** For the account page.

Access: **Signed in** · Scope: `docflow:read` · Story: `MVP1-E1-05`

**Inputs:** none.

**Behaviour**

- Read only.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `documents_processed`: documents that reached `reviewed` or `paid`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/docflow/v1/stats HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "documents_processed": 4
}
```

### POST /webhooks/{service}

**Receive service events.** Where platform services tell DocFlow that something finished, so the process moves on without the browser.

Access: **Service** · Scope: None: HMAC signature · Story: `MVP1-E0-09`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `service` | path | string | Yes | `extraction`, `review`, `payment`, `identity` or `delivery`. | Who sent it. |
| `X-01scale-Signature` | header | string | Yes | HMAC-SHA256 of the raw body, compared in constant time. | Proves the event came from the platform. |
| `event_id, type, data` | body | uuid, string, object | Yes | Processed once per `event_id`. | The event. |

**Behaviour**

- No person is present, so each step uses a delegated token for the document's owner from Identity (`act: service:docflow`; decision on #24).
- Acts only on events about the document's current work: an extraction event whose `job_id` is not the document's `job_id`, or a payment event whose `order_id` is not its `order_id`, is acknowledged and ignored. A late failure from a retried job, or the expiry of an earlier order, changes nothing.
- `extraction.job.completed`: reads the fields with Extraction `GET /jobs/{jobId}/fields`, creates a Review task with Review `POST /tasks` (Idempotency-Key `docflow:{documentId}:{jobId}`) and sets the document `needs_review`; with nothing flagged it still creates the task, so every document is reviewed the same way.
- `extraction.job.failed`: sets `extraction_failed`.
- `payment.order.paid`: sets `paid` and asks Delivery `POST /messages` for the `order_paid` email, keyed by the event's ID.
- `payment.order.expired` or `failed`: clears the order so Pay starts a new one.
- `identity.user.deleted`: deletes that user's documents and outputs records.
- Other types are acknowledged and ignored.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Accepted, including a repeat | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_signature` | The signature is missing or wrong. |

**Sample request**

```http
POST /api/docflow/v1/webhooks/payment HTTP/1.1
X-01scale-Signature: sha256=8c1f...
Content-Type: application/json

{
  "event_id": "0193b121-0000-7000-8000-00000000aaaa",
  "type": "payment.order.paid",
  "data": {
    "order_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"
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
| Building the JSON (MVP1-E5-01) | `data` holds the final values in the invoice v1 shape; `metadata` holds document_id, file_name, pages, model, prompt_version, extracted_at, reviewed_at, reviewed_by, fields_flagged, fields_corrected, and per field `confidence` and `corrected`. Validated against `schemas/invoice-v1.json` before it is stored. |
| Building the CSV (MVP1-E5-02) | Columns in this order: `document_id`, `vendor_name`, `vendor_address`, `vendor_tax_id`, `invoice_number`, `invoice_date`, `due_date`, `bill_to_name`, `bill_to_address`, `currency`, `subtotal`, `tax_total`, `total`, `payment_terms`, `line_number`, `line_description`, `line_quantity`, `line_unit_price`, `line_amount`. RFC 4180 quoting, UTF-8 with a byte-order mark, CRLF line ends; cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'`. |
| Success page (MVP1-E7-01) | Polls Payment `GET /orders/{orderId}` every 2 seconds for up to 30 seconds, then says 'We'll email you when it's ready'; shows the email's status from Delivery. |
| Which token each step uses (decisions on #24 and #21) | Steps the person starts (upload, retry, complete review, checkout, preview, download) use their own token, except Payment and Delivery, which take only a delegated token. Steps after an event (create the review task, send the email) use a delegated token for the document's owner. Every call goes through `https://01scale.com/api/…`. |
| Pages | `/documents`, `/documents/new` (upload, with the file's preview once checked), `/documents/{id}` (extraction, with the preview beside the fields), `/documents/{id}/review`, `/documents/{id}/results`, `/documents/{id}/pay`, `/documents/{id}/success`. Each composes the services' components. |

## Constraints at the API level

- Every download checks on the server that the order is paid.
- The price is set by DocFlow's server, from configuration.
- DocFlow passes the person's own token to services when they are present, and a delegated token for them when not, so every service's ownership checks apply.
- Service events are verified and processed once.
