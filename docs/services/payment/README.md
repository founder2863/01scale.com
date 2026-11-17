# Payment service — developer guide

> **Version 1 · Stripe Checkout, test mode.** Status: designed, not built. Stories: `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/payment`.

## What this service is

Payment is the platform service that takes a one-time payment for something an app sells. In DocFlow it is the step where a person pays before downloading the results.

An app's server asks for an order with a price; Payment returns the address of Stripe's own checkout page, where the person pays. Card details never touch 01scale.

Stripe's signed message, not the person's browser, is what marks an order paid. Payment then tells the app, and the app unlocks what was bought. Version 1 runs in Stripe's test mode only.

## Why it exists

| Reason | In plain terms |
|---|---|
| One trusted record of who paid for what | Apps check the order's status before unlocking anything, instead of each talking to Stripe. |
| Prices are never set by a browser | Only an app's server can create an order, so nobody can change a price in their browser. |
| Charged once, even when things repeat | Clicking twice, a repeated Stripe message or a retried request never creates a second order or charge. |
| No card data to protect | Stripe's hosted page takes the card, which keeps 01scale out of most of the card-security rules. |

## What is in this version

**In scope**

- One-time payment for one item, in USD, through Stripe Checkout in test mode
- Reuse the open checkout page when Pay is clicked again
- Mark orders paid, expired or failed from Stripe's signed events, once each
- Tell the app when an order changes
- List a person's orders; keep them, anonymized, if the account is deleted

**Not in this version**

- Saved cards and one-tap payment: `MVP2-E13`
- Paying for a batch of documents: `MVP2-E13-04`
- Refunds: not designed
- Live (real-money) payments: not planned for the portfolio
- Currencies other than USD

## How a payment works

| Step | Who | What happens |
|---|---|---|
| 1 | App's server | Calls `POST /orders` with the user, a reference, a description and the price. In DocFlow, when the person taps Pay. |
| 2 | Payment | Records a `pending` order and creates a Stripe Checkout session; returns its address. A second call for the same reference returns the same order. |
| 3 | Browser | Goes to Stripe's page; the person pays there. |
| 4 | Stripe | Sends the person back to the app, and separately sends Payment a signed `checkout.session.completed` event. |
| 5 | Payment | Verifies the signature, records the event once, marks the order `paid`, and announces `payment.order.paid`. |
| 6 | App | Receives the event (or sees the order paid when polling) and unlocks what was bought. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Order | One request for payment, with its price and status. The record an app trusts. |
| Checkout session | Stripe's hosted payment page for one order, open for 1 hour. |
| Webhook | A message Stripe sends to Payment's server when something happens, signed so it can be verified. |
| Minor units | The amount in the currency's smallest unit: 500 means $5.00. |
| Reference | What is being paid for, in the app's own terms; one open or paid order per reference. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Ask for payment (app server)

Set the price on the server and send the person to the returned address.

```ts
const { order, checkout_url } = await serviceApi.post("/api/payment/v1/orders", {
  user_id: userId, reference: `myapp:${itemId}`, description: "Report export",
  amount: 500, currency: "USD",
  success_url: `https://01scale.com/items/${itemId}/paid?order={ORDER_ID}`,
  cancel_url: `https://01scale.com/items/${itemId}`,
});
return redirect(checkout_url);
```

### 2. Confirm before unlocking

Trust the order's status, never the browser arriving at the success page.

```ts
const { order } = await api.get(`/api/payment/v1/orders/${orderId}`);
if (order.status !== "paid") return status(402);
```

### 3. Show progress on a success page

The component polls until the order settles.

```tsx
import { OrderStatus } from "@01scale/ui-payment";

<OrderStatus orderId={orderId} onSettled={(o) => o.status === "paid" && unlock()} />
```

## Endpoints at a glance

Base address: `https://01scale.com/api/payment/v1`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/orders` | Service | Create an order and a checkout page |
| `POST` | `/webhooks/stripe` | Service | Receive Stripe's events |
| `GET` | `/orders/{orderId}` | Signed in | Get one order |
| `GET` | `/orders` | Signed in | List my orders |
| `POST` | `/events` | Service | Receive platform events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `PAYMENT_DATABASE_URL` | Neon connection string for the `payment_service` role | Yes |
| `STRIPE_SECRET_KEY` | A Stripe test-mode secret key (`sk_test_…`). Live keys are refused at start-up. | Yes |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the webhook endpoint (`whsec_…`) | Yes |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks` | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64: signs and verifies platform events | Yes |
| `EVENT_SUBSCRIBERS` | The webhook addresses that receive Payment's events, for example DocFlow's | No |

## Open questions

- Stripe Checkout pages are kept open for 1 hour here (Stripe allows 30 minutes to 24 hours). Is an hour right?
- Refunds are not designed. In test mode they matter only for the demo; should the admin be able to refund?
- Rate limits are starting values.
