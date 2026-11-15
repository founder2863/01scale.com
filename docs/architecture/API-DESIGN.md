# API design — 01scale

01scale is built **API first** and **agents first**. This file holds the rules every endpoint follows and an index of all 92 designed endpoints. The full contract for each endpoint (request, response, errors) lives in its story in `docs/epics/`, next to the database design for that story.

**Status: design only.** No endpoint here is built until its story is picked up.

## What the two principles mean

- **API first.** The API is the product; the website is one client of it. An endpoint is designed in its story before any code is written, every user-visible capability has an endpoint, and pages never read the database directly.
- **Agents first.** Anything a person can do in the UI, an AI agent can do through the API with the user's permission. That needs four things: authentication without a browser (API keys), a machine-readable contract (OpenAPI), tools an agent can call directly (an MCP server), and responses an agent can act on (stable error codes, idempotent writes, explicit `next_action` fields).

## Conventions

| Topic | Rule |
|---|---|
| Base path | `/api/v1`. Breaking changes go to `/api/v2`; additive changes stay in v1. |
| Format | JSON in and out, `snake_case` field names, ISO 8601 UTC timestamps, money as integer minor units plus an ISO 4217 `currency`. |
| IDs | UUIDv7 strings. |
| Contract | OpenAPI 3.1 at `GET /api/v1/openapi.json`, generated from the zod schemas the handlers validate with. Each operation has a stable `operationId`. |
| Authentication | A session cookie (browser) or `Authorization: Bearer <API key>` (agents and scripts). Both resolve to the same user through one guard. |
| Authorization | A user sees only their own resources. Other users' resources return `404`, not `403`, so IDs cannot be probed. API keys are limited to their scopes. |
| Errors | RFC 9457 `application/problem+json`: `{type, title, status, detail, code, request_id, errors[]}`. `code` is stable and machine-readable. |
| Lists | Cursor pagination: `cursor`, `limit` (max 100) → `{data, next_cursor}`. |
| Writes | `POST` endpoints that create things accept `Idempotency-Key`. State changes that can be retried are idempotent by design. |
| Long-running work | Return `202` with a job resource; the client polls a `GET` that sends `Retry-After`. |
| Files | Never proxied through the API. Uploads and downloads use short-lived presigned S3 URLs. |
| Webhooks in | Signature verified, idempotent on the provider's event ID. |
| CSRF | Cookie-authenticated writes check the `Origin` header. API-key requests are exempt because they carry no ambient credentials. |
| Rate limits | `429` with `Retry-After`. Auth endpoints answer the same way whether or not an account exists. |
| Audit | Auth, review, payment, delivery and every API-key call write an audit event with the actor type. |

## Access levels

| Label | Meaning |
|---|---|
| Public | No credentials needed. |
| Signed in | Session cookie or API key. Some account-security endpoints accept a session only; the story says so. |
| Admin | Signed in with `users.is_admin`. Others get `404`. |
| Service | Called by another system (Stripe, the SMS provider, the Lambda pipeline) and verified by signature. |

## Agent access

- **API keys** (`MVP1-E0-06`): created by a signed-in user, shown once, stored as a hash, scoped, revocable.
- **MCP server** at `POST /api/mcp`: exposes the operations as tools with the same names and schemas as the OpenAPI document, so an agent needs no custom integration.
- **Humans stay in the loop where it matters**: an agent can create an order but receives a `checkout_url` for the user to pay; it cannot manage keys, change the password or delete the account.
- **Later**: OAuth for agent identity (so an agent acts under its own identity with delegated consent) replaces long-lived keys for third-party agents.

## Endpoint index

### MVP1 · E0 · Foundation

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/audit-events` | Signed in | List audit events for the signed-in user (admins: all users). | `MVP1-E0-02` |
| `GET` | `/api/v1/health` | Public | Liveness check for uptime monitors and agents. | `MVP1-E0-05` |
| `GET` | `/api/v1/openapi.json` | Public | The OpenAPI 3.1 description of every endpoint. | `MVP1-E0-05` |
| `GET` | `/api/v1/api-keys` | Signed in | List my API keys (name, prefix, scopes, last used). Never returns the secret. | `MVP1-E0-06` |
| `POST` | `/api/v1/api-keys` | Signed in | Create an API key for an agent or script. The secret is shown once. | `MVP1-E0-06` |
| `DELETE` | `/api/v1/api-keys/{keyId}` | Signed in | Revoke an API key immediately. | `MVP1-E0-06` |
| `POST` | `/api/mcp` | Signed in | MCP server (Streamable HTTP): the same operations exposed as tools for AI agents. | `MVP1-E0-06` |

### MVP1 · E1 · Accounts

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/auth/login` | Public | Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE). | `MVP1-E1-02` |
| `GET` | `/api/v1/auth/callback` | Public | OIDC redirect target: exchanges the code, creates the app session. | `MVP1-E1-03` |
| `POST` | `/api/v1/auth/logout` | Signed in | End the current session and sign out of the identity provider. | `MVP1-E1-03` |
| `GET` | `/api/v1/session` | Signed in | Who am I: the current session and user, or 401. | `MVP1-E1-03` |
| `GET` | `/api/v1/me` | Signed in | My account: email, joined date, documents processed. | `MVP1-E1-05` |
| `POST` | `/api/v1/me/password-change` | Signed in | Start a password change through the identity provider. | `MVP1-E1-05` |
| `DELETE` | `/api/v1/me` | Signed in | Delete my account, files and data (orders kept, anonymized). | `MVP1-E1-05` |

### MVP1 · E2 · Document upload

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/documents` | Signed in | Create a document and get a presigned upload URL. | `MVP1-E2-02` |
| `POST` | `/api/v1/documents/{documentId}/complete-upload` | Signed in | Confirm the upload; the server verifies the file and queues extraction. | `MVP1-E2-03` |
| `GET` | `/api/v1/documents` | Signed in | List my documents with status and the next action. | `MVP1-E2-05` |
| `GET` | `/api/v1/documents/{documentId}` | Signed in | Get one document. | `MVP1-E2-05` |

### MVP1 · E3 · Extraction

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/documents/{documentId}/extraction` | Signed in | Start (or retry) extraction. Safe to call twice. | `MVP1-E3-01` |
| `GET` | `/api/v1/documents/{documentId}/extraction` | Signed in | Extraction job status, for polling. | `MVP1-E3-01` |
| `GET` | `/api/v1/documents/{documentId}/fields` | Signed in | The extracted fields with value, confidence and evidence. | `MVP1-E3-02` |
| `GET` | `/api/v1/documents/{documentId}/file` | Signed in | A short-lived link to view the original document. | `MVP1-E3-04` |
| `GET` | `/api/v1/admin/jobs` | Admin | Last 100 extraction jobs with tokens, cost, duration and failure rate. | `MVP1-E3-05` |

### MVP1 · E4 · Human review

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/documents/{documentId}/review` | Signed in | The review queue: flagged fields first, lowest confidence first. | `MVP1-E4-01` |
| `PATCH` | `/api/v1/documents/{documentId}/fields/{fieldId}` | Signed in | Accept, edit or mark a field as not on the document. | `MVP1-E4-02` |
| `POST` | `/api/v1/documents/{documentId}/review/complete` | Signed in | Complete the review; rule checks run again on the corrected data. | `MVP1-E4-03` |
| `GET` | `/api/v1/admin/eval-candidates` | Admin | Human corrections waiting for approval as eval cases. | `MVP1-E4-04` |
| `POST` | `/api/v1/admin/eval-candidates/export` | Admin | Export approved corrections as ground-truth files. | `MVP1-E4-04` |

### MVP1 · E5 · JSON and CSV output

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/documents/{documentId}/outputs` | Signed in | The outputs available for a document, and whether download is unlocked. | `MVP1-E5-01` |
| `GET` | `/api/v1/documents/{documentId}/outputs/{format}/preview` | Signed in | Preview the JSON or CSV on screen before paying. | `MVP1-E5-01` |
| `GET` | `/api/v1/documents/{documentId}/outputs/{format}/download` | Signed in | Download an output. Locked until the order is paid. | `MVP1-E5-03` |

### MVP1 · E6 · Payment

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/orders` | Signed in | Create an order and a Stripe Checkout session for a document. | `MVP1-E6-01` |
| `POST` | `/api/v1/webhooks/stripe` | Service | Stripe webhook: marks orders paid, expired or failed. | `MVP1-E6-02` |
| `GET` | `/api/v1/orders` | Signed in | List my orders. | `MVP1-E6-03` |
| `GET` | `/api/v1/orders/{orderId}` | Signed in | Get one order, for the payment and success pages to poll. | `MVP1-E6-03` |

### MVP1 · E7 · Delivery

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/orders/{orderId}/deliveries` | Signed in | Delivery attempts for an order (email status). | `MVP1-E7-03` |

### MVP2 · E8 · Passwordless identity

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/magic-links` | Public | Request a sign-in email. Always answers the same way. | `MVP2-E8-02` |
| `POST` | `/api/v1/auth/magic-links/confirm` | Public | Exchange a magic-link token for a session (deliberate POST). | `MVP2-E8-02` |
| `POST` | `/api/v1/auth/email-codes/verify` | Public | Sign in with the 6-digit code from the same email. | `MVP2-E8-03` |
| `POST` | `/api/v1/passkeys/registration-options` | Signed in | WebAuthn options to register a new passkey. | `MVP2-E8-04` |
| `POST` | `/api/v1/passkeys` | Signed in | Verify the registration and save the passkey. | `MVP2-E8-04` |
| `GET` | `/api/v1/passkeys` | Signed in | List my passkeys. | `MVP2-E8-04` |
| `PATCH` | `/api/v1/passkeys/{passkeyId}` | Signed in | Rename a passkey. | `MVP2-E8-04` |
| `DELETE` | `/api/v1/passkeys/{passkeyId}` | Signed in | Remove a passkey (needs recent re-authentication). | `MVP2-E8-04` |
| `POST` | `/api/v1/auth/passkeys/authentication-options` | Public | WebAuthn options to sign in with a passkey (no email needed). | `MVP2-E8-04` |
| `POST` | `/api/v1/auth/passkeys/verify` | Public | Verify a passkey assertion and create a session. | `MVP2-E8-04` |
| `POST` | `/api/v1/recovery-codes` | Signed in | Regenerate recovery codes; the old set stops working. | `MVP2-E8-05` |
| `POST` | `/api/v1/auth/recovery-codes/verify` | Public | Sign in with a single-use recovery code. | `MVP2-E8-05` |
| `GET` | `/api/v1/sessions` | Signed in | List my active sessions with device and last active time. | `MVP2-E8-06` |
| `DELETE` | `/api/v1/sessions/{sessionId}` | Signed in | Revoke one session. | `MVP2-E8-06` |
| `DELETE` | `/api/v1/sessions` | Signed in | Sign out everywhere else. | `MVP2-E8-06` |
| `POST` | `/api/v1/auth/reauthentication` | Signed in | Start re-authentication for a sensitive action. | `MVP2-E8-07` |
| `POST` | `/api/v1/auth/reauthentication/verify` | Signed in | Finish re-authentication; valid for 5 minutes. | `MVP2-E8-07` |
| `POST` | `/api/v1/me/email-change` | Signed in | Ask to change my email (confirmation goes to the new address). | `MVP2-E8-07` |
| `POST` | `/api/v1/me/email-change/confirm` | Signed in | Confirm the new email address. | `MVP2-E8-07` |
| `GET` | `/api/v1/admin/migration-report` | Admin | Users migrated from Cognito vs not yet migrated. | `MVP2-E8-08` |

### MVP2 · E9 · Multi-document pipeline

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/batches` | Signed in | Create a batch of up to 10 documents; each file is checked on its own. | `MVP2-E9-01` |
| `POST` | `/api/v1/batches/{batchId}/process` | Signed in | Start the pipeline once the uploads are confirmed. | `MVP2-E9-01` |
| `GET` | `/api/v1/batches` | Signed in | List my batches. | `MVP2-E9-03` |
| `GET` | `/api/v1/batches/{batchId}` | Signed in | Batch status with each document's step and status. | `MVP2-E9-03` |
| `POST` | `/api/v1/internal/pipeline-events` | Service | Progress events from the Lambda pipeline. | `MVP2-E9-02` |

### MVP2 · E10 · LLM as judge

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/quality` | Admin | Judge vs human: agreement, confusion matrix, weakest fields (30 days). | `MVP2-E10-03` |
| `POST` | `/api/v1/admin/quality/export` | Admin | Export judge/human disagreements as eval candidates. | `MVP2-E10-03` |

### MVP2 · E11 · Enrichment and chat correction

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/documents/{documentId}/enrichment` | Signed in | Web-sourced vendor metadata with citations. | `MVP2-E11-02` |
| `PATCH` | `/api/v1/documents/{documentId}/enrichment/{enrichmentId}` | Signed in | Accept or reject one enrichment value. | `MVP2-E11-02` |
| `GET` | `/api/v1/documents/{documentId}/chat/messages` | Signed in | The correction chat history for a document. | `MVP2-E11-03` |
| `POST` | `/api/v1/documents/{documentId}/chat/messages` | Signed in | Ask the correction agent to fix data in plain language. | `MVP2-E11-03` |
| `POST` | `/api/v1/documents/{documentId}/proposals/{proposalId}/apply` | Signed in | Apply a proposed change. | `MVP2-E11-03` |
| `POST` | `/api/v1/documents/{documentId}/proposals/{proposalId}/reject` | Signed in | Reject a proposed change. | `MVP2-E11-03` |
| `POST` | `/api/v1/documents/{documentId}/proposals/{proposalId}/undo` | Signed in | Undo an applied change. | `MVP2-E11-03` |

### MVP2 · E12 · Multi-document review and outputs

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/batches/{batchId}/review` | Signed in | Review state across a batch: flagged fields left per document. | `MVP2-E12-01` |
| `PATCH` | `/api/v1/batches/{batchId}/documents/{documentId}` | Signed in | Leave a document out of the batch (or put it back). | `MVP2-E12-01` |
| `POST` | `/api/v1/batches/{batchId}/review/complete` | Signed in | Complete the batch review. | `MVP2-E12-01` |
| `GET` | `/api/v1/batches/{batchId}/outputs` | Signed in | The outputs available for a batch. | `MVP2-E12-02` |
| `GET` | `/api/v1/batches/{batchId}/outputs/{format}/preview` | Signed in | Preview the combined JSON or CSV. | `MVP2-E12-02` |
| `GET` | `/api/v1/batches/{batchId}/outputs/{format}/download` | Signed in | Download batch.json, batch.csv or batch.zip. | `MVP2-E12-02` |

### MVP2 · E13 · Saved payment methods

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `POST` | `/api/v1/payment-methods/setup-intents` | Signed in | Start saving a card (Stripe SetupIntent). | `MVP2-E13-02` |
| `GET` | `/api/v1/payment-methods` | Signed in | List my saved cards. | `MVP2-E13-03` |
| `PATCH` | `/api/v1/payment-methods/{paymentMethodId}` | Signed in | Make a card the default. | `MVP2-E13-03` |
| `DELETE` | `/api/v1/payment-methods/{paymentMethodId}` | Signed in | Remove a saved card (needs recent re-authentication). | `MVP2-E13-03` |
| `POST` | `/api/v1/payments` | Signed in | Pay for a batch or document with a saved card. | `MVP2-E13-04` |
| `GET` | `/api/v1/payments` | Signed in | Payment history, newest first. | `MVP2-E13-05` |

### MVP2 · E14 · Notifications

| Method | Path | Access | What it does | Story |
|---|---|---|---|---|
| `GET` | `/api/v1/notification-preferences` | Signed in | My notification settings per channel and event. | `MVP2-E14-01` |
| `PUT` | `/api/v1/notification-preferences` | Signed in | Replace my notification settings. | `MVP2-E14-01` |
| `POST` | `/api/v1/me/phone` | Signed in | Add a phone number; sends a 6-digit code. | `MVP2-E14-02` |
| `POST` | `/api/v1/me/phone/verify` | Signed in | Verify the phone number. | `MVP2-E14-02` |
| `DELETE` | `/api/v1/me/phone` | Signed in | Remove my phone number and turn SMS off. | `MVP2-E14-02` |
| `POST` | `/api/v1/webhooks/sms` | Service | Inbound SMS webhook: handles STOP opt-outs. | `MVP2-E14-02` |
| `GET` | `/api/v1/push/public-key` | Public | The VAPID public key for web push. | `MVP2-E14-03` |
| `POST` | `/api/v1/push-subscriptions` | Signed in | Register this device for push notifications. | `MVP2-E14-03` |
| `DELETE` | `/api/v1/push-subscriptions/{subscriptionId}` | Signed in | Remove a device. | `MVP2-E14-03` |
| `GET` | `/api/v1/notifications` | Signed in | My notification log: each attempt per channel. | `MVP2-E14-04` |
