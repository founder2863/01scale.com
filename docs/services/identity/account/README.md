# Account management service — developer guide

> **Version 1 · Identity, second part.** Status: designed, not built. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/account-management/readme`.

## What this service is

Account management lets a person see their account, change their password, delete their account, and give AI agents their own keys to act for them.

It is the second part of the Identity service, after Login. It adds one table (API keys), the endpoint that announces a deleted account to every other service, and the lookup Delivery uses to find a person's email.

## Why it exists

| Reason | In plain terms |
|---|---|
| People own their data | Deleting an account really deletes it, everywhere, and keeps only anonymized orders for the accounts. |
| Agents are first-class users | An agent gets its own key with narrow scopes, instead of a person's password or cookie, and every call it makes is audited as that key. |
| A key can be cut off on its own | Revoking one agent's key leaves the person and their other agents signed in. |
| Dangerous actions keep a person in the loop | Only a browser session can create keys, change the password or delete the account; agents cannot pay. |

## What is in this version

**In scope**

- `GET /me`, password change through Cognito, account deletion with `identity.user.deleted`
- API keys: create, list, revoke, scopes, expiry, exchange at the gateway
- A service lookup of a user's email for Delivery
- Components for any app's account page

**Not in this version**

- Changing the email address: not planned for MVP1
- OAuth for agents instead of keys: later, after MVP2
- A password change on our own page: `MVP2-E8`, when identity is built by hand
- Exporting my data: not planned

## How it works

| Step | Who | What happens |
|---|---|---|
| 1 | Browser | The account page shows Identity's components with DocFlow's totals and Payment's orders. |
| 2 | This service | Change password: starts a login and sends the person to Cognito's page, which returns them to `/account`. |
| 3 | This service | Delete: deletes the Cognito user, then the account, and puts `identity.user.deleted` in the outbox for every service. |
| 4 | Other services | Delete or anonymize their own rows for that user when the event arrives. |
| 5 | Browser | Creates an API key; the secret is shown once and only its hash is kept. |
| 6 | Gateway | Exchanges an agent's key for a 5-minute access token carrying the key's scopes. |

## Words used in this guide

| Term | Meaning |
|---|---|
| API key | A secret starting `sk_01s_` that an agent sends instead of a cookie. Only its SHA-256 hash is stored. |
| Scope | One thing a key may do, such as `upload:write`. A key has one or more. |
| Session only | An endpoint that refuses API keys: managing keys, the password and the account. |
| Outbox | Events are written in the same transaction as the change, then delivered, so `identity.user.deleted` is never lost. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Create a key

From the account page, or as a signed-in browser:

```bash
curl -X POST https://01scale.com/api/identity/v1/api-keys \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"name":"Claude Desktop","scopes":["upload:write","docflow:read","docflow:write"]}'
```

### 2. Use the key from an agent

Any endpoint the key's scopes allow:

```bash
curl https://01scale.com/api/docflow/v1/documents \
  -H "Authorization: Bearer $ZEROONE_API_KEY"
```

### 3. Delete an account

Session only:

```bash
curl -X DELETE https://01scale.com/api/identity/v1/me \
  -H 'Content-Type: application/json' -H 'Origin: https://01scale.com' -b cookies.txt \
  -d '{"confirm":"DELETE"}'
```

## Endpoints at a glance

Base address: `https://01scale.com/api/identity/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `GET` | `/me` | Signed in | Any: a session, an API key or a delegated token | My account |
| `POST` | `/me/password-change` | Signed in | Session only: refused for API keys and service tokens | Start a password change |
| `DELETE` | `/me` | Signed in | Session only: refused for API keys and service tokens | Delete my account |
| `GET` | `/api-keys` | Signed in | Session only: refused for API keys and service tokens | List my API keys |
| `POST` | `/api-keys` | Signed in | Session only: refused for API keys and service tokens | Create an API key |
| `DELETE` | `/api-keys/{keyId}` | Signed in | Session only: refused for API keys and service tokens | Revoke an API key |
| `POST` | `/token` | Service | None: the gateway's service credential | Exchange an API key for an access token |
| `GET` | `/users/{userId}` | Service | `identity:users.read`, on a service token | Look up a user's email |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `COGNITO_USER_POOL_ID` | From the Cognito setup, for `AdminDeleteUser` | No |
| `AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY` | An IAM user allowed only `cognito-idp:AdminDeleteUser` on the pool | Yes |
| `EVENT_ROUTES` | From the service template; `identity.user.deleted` is platform-wide, so it goes to every service and app | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64 | Yes |

## Open questions

- Decided by Nikhil on 20 Nov 2026 (#70): the password change goes through Cognito's forgot-password page (a code by email) in MVP1; our own screens come with MVP2 (`MVP2-E8-10`).
- Decided (#70): the column is `user_id`, as in `identity.sessions`; story `MVP1-E0-06` is updated.
- Decided (#70): the key prefix is the first 8 characters after `sk_01s_`, since every key starts with `sk_01s_`.
- Decided (#70): `GET /users/{userId}` is listed in `MVP1-E1-05` (Identity, which owns it) and `MVP1-E7-03` (Delivery, which calls it).
- Decided by Nikhil on 20 Nov 2026 (#70): in MVP1, deleting an account deletes it at once, as designed here. Deactivation with a 30-day restore window is MVP2 story `MVP2-E8-11`, and only Identity changes.
- API keys have no `payment:write` scope: only a person, through Stripe's page, completes a payment (`MVP1-E0-06` AC5).
- `docs/infra/cognito.md` needs a step for the IAM user that may call `AdminDeleteUser`.
- Starting limits: 10 active keys per person, 90-day default expiry, 1 year at most.
