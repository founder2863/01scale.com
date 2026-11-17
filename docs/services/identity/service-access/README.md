# Service access service — developer guide

> **Version 1 · Identity, third part.** Status: designed, not built. Stories: `MVP1-E1-03`, `MVP1-E0-07`, `MVP1-E0-09`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md).

## What this service is

Service access is how a platform service or an app proves who it is, and how it does work for a user when that user is not there, such as DocFlow sending fields to Review after an extraction finishes at night.

It adds two ways to use Login's `POST /token`: sign in as a service with a client secret, and exchange that service token for a 5-minute token for one user, marked with who is acting.

## Why it exists

| Reason | In plain terms |
|---|---|
| One ownership rule everywhere | A service acting for a user carries that user's token, so no service needs a second way to decide who owns what. |
| Always know who acted | Audit records the user and the acting service, so 'DocFlow did this for Priya' is visible. |
| Control in one place | Which services may act for users, and with which scopes, is set in Identity only. Turning one off is one change. |
| The standard model | Client credentials and token exchange are OAuth 2.0 (RFC 6749 §4.4, RFC 8693), the same model agents' OAuth will use later. |

## What is in this version

**In scope**

- Client-credentials sign-in for services and apps
- Delegated tokens for one user (`on_behalf_of`)
- Claims `auth: service|delegated`, `app`, `act`
- The `service_clients` table, filled by migrations

**Not in this version**

- OAuth for third-party agents: later
- Rotating secrets without a deployment: later
- Delegated tokens with Identity scopes: never

## How it works

| Step | Who | What happens |
|---|---|---|
| 1 | Service | Signs in with its client ID and secret; gets a 5-minute service token. |
| 2 | Service | If it may act for users, exchanges it for a 5-minute token for one user. |
| 3 | Gateway | Passes the token through unchanged to the service being called. |
| 4 | Called service | Verifies it like any token, applies its ownership checks, audits the user and `act`. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Service token | A token for a service acting as itself (`auth: service`). |
| Delegated token | A token for a user, issued to a service acting for them (`auth: delegated`, with `act`). |
| Client | A service or app registered in `identity.service_clients`. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Act for a user

What `callService()` does for a step with no person present.

```ts
const svc = await identity.token({ grant_type: "client_credentials", client_id: "docflow", client_secret: env.DOCFLOW_CLIENT_SECRET });
const user = await identity.token(
  { grant_type: "urn:ietf:params:oauth:grant-type:token-exchange", on_behalf_of: doc.owner_id, scope: "extraction:read review:write" },
  svc.access_token,
);
await review.post("/tasks", body, user.access_token);
```

## Endpoints at a glance

Base address: `https://01scale.com/api/identity/v1`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/token` | Public (client credentials) | Sign in as a service |
| `POST` | `/token` | Service | Act for a user |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `<CLIENT>_CLIENT_SECRET` | `cs_01s_` and 43 base64url characters, one per service or app | Yes |

## Open questions

- Secrets change only with a migration and a deployment in MVP1. A second, overlapping secret per client would allow rotation without downtime.
- Starting scopes for each client are in the sample rows; each service's spec still has to name the scope of each endpoint (review finding M3).
