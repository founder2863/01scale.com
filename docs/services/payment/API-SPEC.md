# Payment service — API specification

> **Version 1 · Stripe Checkout, test mode.** Status: designed, not built. Stories: `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`.

Base address: `https://01scale.com/api/payment/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/already_paid",
  "title": "Already paid",
  "status": 409,
  "detail": "This item is already paid for.",
  "code": "already_paid",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### POST /orders

**Create an order and a checkout page.** An app's server asks for payment for something it sells. Payment records an order and returns the address of Stripe's checkout page. Never callable from a browser, so a browser can never set a price.

Access: **Service** · Scope: `payment:write` · Story: `MVP1-E6-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `user_id` | body | uuid | Yes | The user who will pay. | Who the order is for. The app's service token proves the app may act for its users. |
| `reference` | body | string | Yes | 1 to 200 characters; unique per app while an order is open or paid. | What is being paid for, in the app's own terms. DocFlow sends `docflow:{document_id}`. |
| `description` | body | string | Yes | 1 to 200 characters. | What the person sees on the checkout page and the receipt. |
| `amount` | body | integer | Yes | 50 to 100,000 minor units (cents), so $0.50 to $1,000. | The price, set by the app's server. $0.50 is Stripe's smallest charge in USD. |
| `currency` | body | string | Yes | In version 1, `USD`. | The currency, as an ISO 4217 code. |
| `success_url, cancel_url` | body | string | Yes | HTTPS addresses on 01scale.com (or localhost in development). | Where Stripe sends the person afterwards. `{ORDER_ID}` in the address is replaced with the order's ID. |

**Behaviour**

- If the app already has a `paid` order for this reference, refuses with `409 already_paid`.
- If it has a `pending` order whose checkout page is still open, returns that order with `200`: no second order, no second page.
- Otherwise records an order as `pending` and creates a Stripe Checkout session in test mode with the order's ID as `client_reference_id` and in `metadata.order_id`, using the order's ID as Stripe's idempotency key.
- The checkout page stays open for 1 hour, then Stripe expires it.
- Records `order.created` in the audit log.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | A new order was created | `order` and `checkout_url`. |
| `200` | An open order for this reference already existed | That `order` and its `checkout_url`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `already_paid` | This reference is already paid; `order_id` names the paid order. |
| `422` | `validation_failed` | An input is missing or out of range; `errors[]` lists each. |
| `403` | `service_only` | The caller is not an app's server. |
| `503` | `stripe_unavailable` | Stripe could not be reached. Nothing was charged; safe to retry. |

**Sample request**

```http
POST /api/payment/v1/orders HTTP/1.1
Authorization: Bearer <DocFlow service token>
Content-Type: application/json

{
  "user_id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
  "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
  "description": "Invoice extraction: acme-invoice-0042.pdf",
  "amount": 500,
  "currency": "USD",
  "success_url": "https://01scale.com/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/success?order={ORDER_ID}",
  "cancel_url": "https://01scale.com/documents/0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c/pay?cancelled=1"
}
```

**Sample response**

```json
{
  "order": {
    "id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
    "app": "docflow",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "description": "Invoice extraction: acme-invoice-0042.pdf",
    "amount": 500,
    "currency": "USD",
    "status": "pending",
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8i9J0exampleSession#fidkdWxOYHwnPyd1blpxYHZxWjA0example",
    "checkout_expires_at": "2026-11-17T10:16:10Z",
    "paid_at": null,
    "created_at": "2026-11-17T09:16:10Z"
  },
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_a1B2c3D4e5F6g7H8i9J0exampleSession#fidkdWxOYHwnPyd1blpxYHZxWjA0example"
}
```

### POST /webhooks/stripe

**Receive Stripe's events.** Stripe tells Payment what happened on its checkout page. This, not the browser, is what marks an order paid.

Access: **Service** · Scope: None: HMAC signature · Story: `MVP1-E6-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `Stripe-Signature` | header | string | Yes | Verified against the raw body with the webhook signing secret, rejecting timestamps older than 5 minutes. | Proves the event came from Stripe and is not a replay. |
| `(body)` | body | Stripe event | Yes | Read as raw bytes for the signature check, then parsed. | The event. |

**Behaviour**

- Records the event's ID first; if it was already recorded, answers `200` and changes nothing.
- `checkout.session.completed` with `payment_status: paid`: the order becomes `paid` with `paid_at`; records `order.paid`; announces `payment.order.paid`.
- `checkout.session.expired`: a `pending` order becomes `expired`; announces `payment.order.expired`.
- `checkout.session.async_payment_failed`: the order becomes `failed`; announces `payment.order.failed`.
- Any other event type is recorded and ignored.
- An order that is already `paid` never goes back to another status.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Accepted, including a repeat or an ignored type | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `invalid_signature` | The signature is missing, wrong or too old. |

**Sample request**

```http
POST /api/payment/v1/webhooks/stripe HTTP/1.1
Stripe-Signature: t=1794826622,v1=5257a869e7ec...
Content-Type: application/json

{
  "id": "evt_test_1Q2w3E4r5T6y",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1B2c3D4e5F6g7H8i9J0exampleSession",
      "client_reference_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
      "payment_status": "paid",
      "metadata": {
        "order_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f"
      }
    }
  }
}
```

**Sample response**

```http
HTTP/1.1 200 OK
```

### GET /orders/{orderId}

**Get one order.** An order and its status. The success page polls it until the payment is confirmed.

Access: **Signed in** · Scope: `payment:read` · Story: `MVP1-E6-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `orderId` | path | uuid | Yes | A UUID. | The order. |

**Behaviour**

- Read only. `checkout_url` is included only while the order is `pending` and its page is open.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The order is the caller's | `order`: `id`, `app`, `reference`, `description`, `amount`, `currency`, `status` (`pending`, `paid`, `expired`, `failed`), `checkout_url`, `checkout_expires_at`, `paid_at`, `created_at`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `order_not_found` | No such order, or it belongs to another user. The same answer in both cases. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/payment/v1/orders/0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "order": {
    "id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
    "app": "docflow",
    "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
    "description": "Invoice extraction: acme-invoice-0042.pdf",
    "amount": 500,
    "currency": "USD",
    "status": "paid",
    "checkout_url": null,
    "checkout_expires_at": "2026-11-17T10:16:10Z",
    "paid_at": "2026-11-17T09:17:02Z",
    "created_at": "2026-11-17T09:16:10Z"
  }
}
```

### GET /orders

**List my orders.** The caller's orders, newest first. Used on the account page and to find an order by its reference.

Access: **Signed in** · Scope: `payment:read` · Story: `MVP1-E6-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `reference` | query | string | No | Exact match. | Only orders for this reference. |
| `status` | query | string | No | `pending`, `paid`, `expired` or `failed`. | Only orders with this status. |
| `cursor, limit` | query | string, integer | No | `limit` 1 to 100, default 20. | Paging. |

**Behaviour**

- Read only.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always, even when empty | `data[]` of orders and `next_cursor`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | A filter is not valid. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/payment/v1/orders?reference=docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
      "app": "docflow",
      "reference": "docflow:0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c",
      "description": "Invoice extraction: acme-invoice-0042.pdf",
      "amount": 500,
      "currency": "USD",
      "status": "paid",
      "checkout_url": null,
      "checkout_expires_at": "2026-11-17T10:16:10Z",
      "paid_at": "2026-11-17T09:17:02Z",
      "created_at": "2026-11-17T09:16:10Z"
    }
  ],
  "next_cursor": null
}
```

### POST /events

**Receive platform events.** Where other services' signed events arrive. In version 1 Payment acts on one: a user's account was deleted.

Access: **Service** · Scope: None: HMAC signature · Story: `MVP1-E1-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `X-01scale-Signature` | header | string | Yes | HMAC-SHA256 of the raw body, compared in constant time. | Proves the event came from the platform. |
| `event_id, type, data` | body | uuid, string, object | Yes | Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`. | The event. |

**Behaviour**

- Keeps the user's orders as payment records (`MVP1-E1-05`: orders are kept, anonymized) but removes the link to the person: `owner_id` becomes empty.

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
POST /api/payment/v1/events HTTP/1.1
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
| Events Payment announces | `payment.order.paid`, `payment.order.expired` and `payment.order.failed`, with `{order_id, app, reference, amount, currency}`, signed and delivered with retries from the outbox to the app that created the order. |
| The checkout page (MVP1-E6-01) | Stripe's hosted page. 01scale never receives card details. |
| DocFlow's checkout endpoint | `POST /api/docflow/v1/documents/{documentId}/checkout` belongs to the DocFlow app, which sets the $5.00 price and calls `POST /orders` from its server. Designed with the DocFlow app shell (`MVP1-E0-09`). |
| AI agents | Each read endpoint is a tool on Payment's MCP server, `POST /api/payment/mcp`. An agent can receive a checkout address to hand to the person, but can never complete a payment itself. |
| Health and contract | `GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`). |

## Constraints at the API level

- Only an app's server can create an order; the price is never taken from a browser.
- Amount 50 to 100,000 minor units, in USD; return addresses on 01scale.com only.
- One open or paid order per app and reference: asking again returns the open one or refuses with `already_paid`.
- Stripe events must carry a valid signature no older than 5 minutes, and are processed once per event ID.
- Another user's order answers `404 order_not_found`.
- Only test-mode Stripe keys are accepted in version 1.
