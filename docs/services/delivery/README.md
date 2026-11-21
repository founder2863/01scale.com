# Delivery service — developer guide

> **Version 1 · Email through Resend.** Status: designed, not built. Stories: `MVP1-E7-01`, `MVP1-E7-02`, `MVP1-E7-03`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/download-and-email-delivery/readme`.

## What this service is

Delivery is the platform service that sends messages to users on an app's behalf. In DocFlow it sends the email that confirms a payment and links back to the results.

An app's server names the user, a template and the template's values; Delivery looks up the user's verified address, fills the template, sends it through Resend and retries if sending fails. Apps never handle email addresses.

In this module the downloads themselves and the success page belong to the DocFlow app: it checks that the order is paid and hands out a 5-minute link to the file. Delivery's part is the email.

## Why it exists

| Reason | In plain terms |
|---|---|
| One way to reach a person | Every app sends through the same service, with the same templates, retries and records, and MVP2 adds SMS and push behind the same request. |
| Addresses stay in Identity | Apps pass a user ID, never an email address, so personal data is not copied around the platform. |
| Sent once, by the server | Emails are triggered by verified server events and an idempotency key, so a repeated event or a closed browser never duplicates or loses one. |
| Trustworthy mail | Fixed templates, links that can only point at 01scale.com, and a verified sending domain keep the email out of spam and out of phishing. |

## What is in this version

**In scope**

- Send the `order_paid` email, in plain text and HTML, through Resend
- Look up the verified address at send time
- Retry 3 times with backoff, then record the failure and announce it
- Show a person the status of their messages
- Cancel and delete a deleted account's messages

**Not in this version**

- The success page and secure downloads: the DocFlow app (`MVP1-E7-01`, `MVP1-E7-02`), designed with the DocFlow app shell
- SMS, push and notification preferences: `MVP2-E14`
- Marketing email: not planned

## How an email is delivered

| Step | Who | What happens |
|---|---|---|
| 1 | Payment | Marks the order paid from Stripe's verified event and tells DocFlow. |
| 2 | DocFlow's server | Calls `POST /messages` with the user, `order_paid`, the document name, amount and the success page's path, keyed by the payment event's ID. |
| 3 | Delivery | Records the message `queued` and answers at once. |
| 4 | Delivery | Looks up the user's verified address through Identity, renders the template and sends it through Resend from receipts@01scale.com. |
| 5 | Resend | Accepts the email for delivery, signed for SPF and DKIM. |
| 6 | Delivery | Marks it `sent`; or after 3 failed retries `failed`, and announces `delivery.message.failed`. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Template | A fixed email with named blanks. Version 1 has one: `order_paid`. |
| Idempotency key | A value that makes the same request send only one email, however often it is repeated. |
| SPF and DKIM | DNS records that let mailboxes verify an email really came from 01scale.com. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Send an email from an app's server

Name the user and the template; never an address.

```ts
await callService("/api/delivery/v1/messages", { onBehalfOf: userId }, {
  template: "order_paid", reference: `docflow:${documentId}`,
  data: { document_name: "invoice.pdf", amount: 500, currency: "USD", link_path: `/documents/${documentId}/success` },
}, { headers: { "Idempotency-Key": paymentEventId } });
```

### 2. Show the email's status

On a page the person is looking at.

```tsx
import { MessageStatus } from "@01scale/ui-delivery";

<MessageStatus reference={`docflow:${documentId}`} />
```

## Endpoints at a glance

Base address: `https://01scale.com/api/delivery/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `POST` | `/messages` | Service | `delivery:write`, on a delegated token only | Send a templated email to a user |
| `GET` | `/messages` | Signed in | `delivery:read` | My messages and their status |
| `POST` | `/events` | Service | None: HMAC signature | Receive platform events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `DELIVERY_DATABASE_URL` | Neon connection string for the `delivery_service` role | Yes |
| `RESEND_API_KEY` | The Resend API key | Yes |
| `EMAIL_FROM` | `DocFlow <receipts@01scale.com>`, on a domain verified in Resend | No |
| `IDENTITY_API_URL` | Where Delivery looks up a user's verified email | No |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks` | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64 | Yes |

## Open questions

- Decided by Nikhil on 20 Nov 2026 (#68): Delivery reads the verified address with Identity `GET /api/identity/v1/users/{userId}`, a service-only endpoint that needs the scope `identity:users.read`. It is designed with Account management (`MVP1-E1-05`, PR #70). The event that triggers an email never carries the address.
- Resend can report bounces and complaints by webhook. Version 1 records only whether Resend accepted the email; should a later bounce mark it failed?
