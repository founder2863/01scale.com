# Delivery service — API specification

> **Version 1 · Email through Resend.** Status: designed, not built. Stories: `MVP1-E7-01`, `MVP1-E7-02`, `MVP1-E7-03`.

Base address: `https://01scale.com/api/delivery/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/unknown_template",
  "title": "Unknown template",
  "status": 422,
  "detail": "There is no template called order_shipped.",
  "code": "unknown_template",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### POST /messages

**Send a templated email to a user.** An app's server asks Delivery to email one of its users. Delivery looks up the address, fills the template, sends it through Resend and retries if needed. Never callable from a browser, so nobody can send email in 01scale's name.

Access: **Service** · Scope: `delivery:write` · Story: `MVP1-E7-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `user_id` | body | uuid | Yes | An existing user. | Who receives it. Delivery looks up their verified email from Identity at send time; apps never pass addresses. |
| `template` | body | string | Yes | In version 1, `order_paid`. | Which email. Each template has fixed wording, a plain-text and an HTML version. |
| `data` | body | object | Yes | The template's fields only. For `order_paid`: `document_name` (1 to 255 characters), `amount` and `currency` (minor units and code), `link_path` (a path on 01scale.com). | What fills the template. Links are paths, so an email can only point at 01scale.com. |
| `reference` | body | string | Yes | 1 to 200 characters. | The app's own label, for finding the message later. |
| `Idempotency-Key` | header | string | Yes | 1 to 255 characters. DocFlow uses the Payment event's ID. | The same key never sends a second email. |

**Behaviour**

- Validates the template's data and records the message as `queued`; answers `202` at once.
- In the background: looks up the user's email through Identity `GET /api/identity/v1/users/{userId}`, renders the template, and sends it through Resend from `receipts@01scale.com`.
- On a failure Resend says is temporary, retries 3 times, after 1, 5 and 25 seconds. Then the message is `failed` with the reason, and Delivery announces `delivery.message.failed`.
- On success the message is `sent` with Resend's message ID, and `delivery.message.sent` is recorded in the audit log.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `202` | Accepted | `message` (status `queued`). |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `unknown_template` | `template` is not one Delivery has. |
| `422` | `validation_failed` | `data` is missing a field or has one the template does not use. |
| `422` | `idempotency_key_reused` | Same key, different body. |
| `403` | `service_only` | The caller is not an app's server. |

**Sample request**

```http
POST /api/delivery/v1/messages HTTP/1.1
Authorization: Bearer <DocFlow service token>
Idempotency-Key: evt_order_paid_0193b120
Content-Type: application/json

{
  "user_id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
  "template": "order_paid",
  "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
  "data": {
    "document_name": "acme-invoice-0042.pdf",
    "amount": 500,
    "currency": "USD",
    "link_path": "/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/success"
  }
}
```

**Sample response**

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "message": {
    "id": "0193b140-2b3c-7d4e-8f50-6172839a0b1c",
    "app": "docflow",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "channel": "email",
    "template": "order_paid",
    "status": "queued",
    "attempts": 0,
    "last_error": null,
    "sent_at": null,
    "created_at": "2026-11-17T09:17:04Z"
  }
}
```

### GET /messages

**My messages and their status.** The signed-in person's messages, newest first. The success page uses it to show 'Email couldn't be sent' when a send failed.

Access: **Signed in** · Scope: `delivery:read` · Story: `MVP1-E7-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `reference` | query | string | No | Exact match. | Only messages about this reference. |
| `cursor, limit` | query | string, integer | No | `limit` 1 to 100, default 20. | Paging. |

**Behaviour**

- Read only. Never returns the email address or the email's content: only template, status and times.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always, even when empty | `data[]` of messages and `next_cursor`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | A filter is not valid. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/delivery/v1/messages?reference=docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b140-2b3c-7d4e-8f50-6172839a0b1c",
      "app": "docflow",
      "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
      "channel": "email",
      "template": "order_paid",
      "status": "sent",
      "attempts": 1,
      "last_error": null,
      "sent_at": "2026-11-17T09:17:09Z",
      "created_at": "2026-11-17T09:17:04Z"
    }
  ],
  "next_cursor": null
}
```

### POST /events

**Receive platform events.** Where other services' signed events arrive. In version 1 Delivery acts on one: a user's account was deleted.

Access: **Service** · Scope: None: HMAC signature · Story: `MVP1-E1-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `X-01scale-Signature` | header | string | Yes | HMAC-SHA256 of the raw body, compared in constant time. | Proves the event came from the platform. |
| `event_id, type, data` | body | uuid, string, object | Yes | Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`. | The event. |

**Behaviour**

- Cancels that user's queued messages and deletes their message records.

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
POST /api/delivery/v1/events HTTP/1.1
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
| The success page (MVP1-E7-01) | DocFlow's page polls the Payment order for up to 30 seconds, then says 'We'll email you when it's ready'. It reads the email's status from `GET /messages`. Designed with the DocFlow app shell. |
| Secure downloads (MVP1-E7-02) | DocFlow's download endpoint checks ownership and the paid order, then redirects to a 5-minute Upload link and records `delivery.downloaded`. Designed with the DocFlow app shell. |
| Events Delivery announces | `delivery.message.sent` and `delivery.message.failed`, with `{message_id, app, reference}`. |
| Sending domain (MVP1-E7-03 AC3) | 01scale.com is verified in Resend with its SPF and DKIM DNS records. Setup steps belong in `docs/infra/` when the service is built. |
| AI agents | `GET /messages` is a tool on Delivery's MCP server. Sending is never offered to agents. |
| Health and contract | `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`). |

## Constraints at the API level

- Only an app's server can send; an idempotency key is required.
- Templates are fixed; `data` may hold only the template's fields; links are paths on 01scale.com.
- A person sees only their own messages, without addresses or content.
