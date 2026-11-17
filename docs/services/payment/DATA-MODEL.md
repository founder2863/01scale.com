# Payment service — data model

> **Version 1 · Stripe Checkout, test mode.** Status: designed, not built. Stories: `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`.

What the service keeps, how the pieces relate, and what every field means. The SQL is in [`SCHEMA.md`](SCHEMA.md); shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).

## Entities

| Entity | Table | What it is | How it relates |
|---|---|---|---|
| Order | `payment.orders` | One request for payment. | Belongs to one user and one app, by ID and name. Matches one Stripe checkout session. |
| Stripe event | `payment.stripe_events` | A message from Stripe already processed. | Refers to an order by ID. |
| Processed event | `payment.inbound_events` | A platform event already acted on. | Stands alone. |

## Life of each record

| Record | Life |
|---|---|
| Order | `pending` when created → `paid` when Stripe confirms, `expired` when Stripe closes the page unpaid, or `failed` when a delayed payment fails. A paid order never changes again; an expired or failed one is replaced by a new order if the person pays later. |
| Checkout address | Kept while the order is pending, so Pay can reuse it; cleared when the order settles. |

## `payment.orders`

One row per request for payment. The order, not Stripe, is the record an app checks before unlocking anything.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `id` | `uuid` | No |  | Primary key. UUIDv7 | The order's ID; also Stripe's `client_reference_id` and idempotency key. |
| `owner_id` | `uuid` | Yes |  | Empty only after the owner's account is deleted | Who pays. A plain ID. |
| `app` | `text` | No |  | 1 to 50 characters, from the calling app's service token | Which app asked for payment, for example `docflow`. |
| `reference` | `text` | No |  | 1 to 200 characters | What is paid for, in the app's terms. |
| `description` | `text` | No |  | 1 to 200 characters | Shown on the checkout page and the receipt. |
| `amount` | `integer` | No |  | 50 to 100,000 | The price in minor units (cents). Never a decimal. |
| `currency` | `text` | No |  | `USD` in version 1 | ISO 4217 code. |
| `status` | `text` | No | 'pending' | `pending`, `paid`, `expired` or `failed` | Where the payment is. |
| `stripe_session_id` | `text` | Yes |  | Unique. Starts `cs_` | Stripe's checkout session, to match its events to this order. |
| `checkout_url` | `text` | Yes |  | Stripe's address; kept only while pending | Where the person pays; returned again if they click Pay twice. |
| `checkout_expires_at` | `timestamptz` | Yes |  | 1 hour after creation | When Stripe closes the checkout page. |
| `paid_at` | `timestamptz` | Yes |  | Set exactly when paid | When Stripe confirmed payment. |
| `created_at` | `timestamptz` | No | now() |  | When the order was created. |

## `payment.stripe_events`

One row per Stripe event received, written before the event is acted on, so a repeat changes nothing.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `text` | No |  | Primary key. Starts `evt_` | Stripe's event ID. |
| `type` | `text` | No |  | 1 to 100 characters | Stripe's event type. |
| `order_id` | `uuid` | Yes |  |  | The order it concerned, when there was one. |
| `created_at` | `timestamptz` | No | now() |  | When Payment processed it. |

## `payment.inbound_events`

One row per platform event Payment has acted on, so a repeat has no effect.

| Field | Type | Empty allowed | Default | Constraints | What it means |
|---|---|---|---|---|---|
| `event_id` | `uuid` | No |  | Primary key | The event's ID. |
| `type` | `text` | No |  | 1 to 100 characters | What happened. |
| `created_at` | `timestamptz` | No | now() |  | When Payment processed it. |

## Other tables in this schema

The service template also gives Payment `audit_events`, `idempotency_keys` and `outbound_events`. Payment writes `order.created`, `order.paid`, `order.expired` and `order.failed` to `audit_events` and announces the same through `outbound_events`.

## Business rules

- An order becomes paid only from a verified Stripe event, never from the browser's return.
- A paid order never changes status again.
- Charging twice for the same reference is impossible, even when requests or events repeat.
- An app learns of every change through a signed event, and can always confirm by reading the order.
- Deleting an account keeps its orders as payment records without the link to the person.

## What is deliberately not stored

- Card numbers, expiry dates and CVCs: they go to Stripe only.
- Stripe's full event bodies: only the event ID and type.
- Prices: each app's server sets its own, per order.
