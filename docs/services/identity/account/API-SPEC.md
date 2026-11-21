# Account management service — API specification

> **Version 1 · Identity, second part.** Status: designed, not built. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

Base address: `https://01scale.com/api/identity/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/session_required",
  "title": "Session required",
  "status": 403,
  "detail": "Only a person signed in with a browser can manage API keys.",
  "code": "session_required",
  "request_id": "req_0193a61f9c2e"
}
```

## Token

Claims added to Login's access token when the caller used an API key.

| Claim | Example | Meaning |
|---|---|---|
| `auth` | `api_key` | How the caller authenticated: `session` or `api_key`. |
| `akid` | `0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f` | The API key's ID, only when `auth` is `api_key`. Services write it to their audit events. |
| `scopes` | `["upload:write", "docflow:read"]` | The key's scopes. A browser session has `["*"]`. |

## Endpoints

### GET /me

**My account.** The signed-in person's email and when they joined.

Access: **Signed in** · Scope: Any: a session, an API key or a delegated token · Story: `MVP1-E1-05`

**Inputs:** none.

**Behaviour**

- Read only. Works with a session or an API key with any scope.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `id`, `email`, `created_at`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
GET /api/identity/v1/me HTTP/1.1
Host: 01scale.com
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
  "email": "priya@example.com",
  "created_at": "2026-11-12T08:01:44Z"
}
```

### POST /me/password-change

**Start a password change.** Sends the person to Cognito's hosted page to set a new password, and back to the account page afterwards.

Access: **Signed in** · Scope: Session only: refused for API keys and service tokens · Story: `MVP1-E1-05`

**Inputs:** none.

**Behaviour**

- Session only.
- Starts a login exactly as `GET /auth/login` does (state, nonce and PKCE in the login cookie), with `return_to` = `/account?password_changed=1`.
- Returns the address of Cognito's hosted forgot-password page for this app. The person receives a code by email, sets a new password, then signs in.
- On that sign-in, Login's callback revokes every older session (as for a reset, `MVP1-E1-04`) and records `auth.password_changed`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `redirect_url`, and the login cookie is set. |

**Errors**

| Status | Code | When |
|---|---|---|
| `403` | `session_required` | Called with an API key. Only a person signed in with a browser can do this. |
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
POST /api/identity/v1/me/password-change HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=<session token>
Origin: https://01scale.com
```

**Sample response**

```json
{
  "redirect_url": "https://01scale-prod.auth.us-east-1.amazoncognito.com/forgotPassword?client_id=\u2026&response_type=code&scope=openid+email&redirect_uri=https%3A%2F%2F01scale.com%2Fapi%2Fidentity%2Fv1%2Fauth%2Fcallback&state=\u2026"
}
```

### DELETE /me

**Delete my account.** Deletes the person's account; every service then deletes that person's data.

Access: **Signed in** · Scope: Session only: refused for API keys and service tokens · Story: `MVP1-E1-05`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `confirm` | body | string | Yes | Exactly `DELETE`. | The person typed DELETE to confirm. |

**Behaviour**

- Session only, with an `Origin` from 01scale.com.
- Deletes the user in Cognito (`AdminDeleteUser`). If Cognito cannot be reached, answers `503` and nothing changes. A user Cognito no longer has counts as deleted, so a retry is safe.
- Then, in one database transaction: deletes the `identity.users` row (its sessions and API keys go with it), records `auth.account_deleted` with the user's ID and no email, and writes one `identity.user.deleted` event per subscribing service to the outbox.
- Clears the session cookie. Each service deletes, or for Payment anonymizes, its own rows for that `owner_id` when the event arrives.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `202` | Deletion accepted | `logout_url` (Cognito's logout address, to end its own session); the session cookie is cleared. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `confirmation_mismatch` | `confirm` is not exactly `DELETE`. |
| `403` | `session_required` | Called with an API key. Only a person signed in with a browser can do this. |
| `503` | `dependency_unavailable` | Cognito could not be reached. Nothing was deleted; safe to retry. |
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
DELETE /api/identity/v1/me HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=<session token>
Origin: https://01scale.com
Content-Type: application/json

{
  "confirm": "DELETE"
}
```

**Sample response**

```json
{
  "logout_url": "https://01scale-prod.auth.us-east-1.amazoncognito.com/logout?client_id=\u2026&logout_uri=https%3A%2F%2F01scale.com%2F"
}
```

### GET /api-keys

**List my API keys.** The person's keys with name, prefix, scopes and when each was last used. Never the secret.

Access: **Signed in** · Scope: Session only: refused for API keys and service tokens · Story: `MVP1-E0-06`

**Inputs:** none.

**Behaviour**

- Session only. Revoked keys are not listed; expired keys are listed as expired.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `data[]` of API keys. |

**Errors**

| Status | Code | When |
|---|---|---|
| `403` | `session_required` | Called with an API key. Only a person signed in with a browser can do this. |
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
GET /api/identity/v1/api-keys HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=<session token>
Origin: https://01scale.com
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
      "name": "Claude Desktop",
      "prefix": "sk_01s_Hq7vT2mX",
      "scopes": [
        "upload:write",
        "extraction:read",
        "docflow:read",
        "docflow:write"
      ],
      "last_used_at": "2026-11-17T10:02:11Z",
      "expires_at": "2027-02-15T00:00:00Z",
      "created_at": "2026-11-17T09:40:00Z"
    }
  ]
}
```

### POST /api-keys

**Create an API key.** A key an agent or script uses instead of a browser. The secret is shown once.

Access: **Signed in** · Scope: Session only: refused for API keys and service tokens · Story: `MVP1-E0-06`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `name` | body | string | Yes | 1 to 100 characters. | What the key is for, such as 'Claude Desktop'. |
| `scopes` | body | string[] | Yes | 1 or more of: `upload:read`, `upload:write`, `extraction:read`, `extraction:write`, `review:read`, `review:write`, `payment:read`, `delivery:read`, `docflow:read`, `docflow:write`. No duplicates. | What the key may do. |
| `expires_at` | body | date-time | No | In the future, at most 1 year away. Default: 90 days. | When it stops working. |
| `Idempotency-Key` | header | string | No | 1 to 255 characters. | A retry returns the same key, without the secret, instead of making a second one. |

**Behaviour**

- Session only: a key cannot create keys.
- At most 10 active keys per person.
- Generates 32 random bytes; the secret is `sk_01s_` followed by 43 base64url characters. Stores only its SHA-256 hash and the first 8 characters after `sk_01s_`.
- Records `auth.api_key_created` with the key's ID, name and scopes.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `201` | Created | `api_key` and `secret` (shown this once). |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | A name, scope or expiry is not allowed; `errors[]` says which. |
| `409` | `too_many_keys` | 10 keys are already active. |
| `403` | `session_required` | Called with an API key. Only a person signed in with a browser can do this. |
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
POST /api/identity/v1/api-keys HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=<session token>
Origin: https://01scale.com
Content-Type: application/json
Idempotency-Key: 6f1c2a9e-key-create

{
  "name": "Claude Desktop",
  "scopes": [
    "upload:write",
    "extraction:read",
    "docflow:read",
    "docflow:write"
  ],
  "expires_at": "2027-02-15T00:00:00Z"
}
```

**Sample response**

```json
{
  "api_key": {
    "id": "0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
    "name": "Claude Desktop",
    "prefix": "sk_01s_Hq7vT2mX",
    "scopes": [
      "upload:write",
      "extraction:read",
      "docflow:read",
      "docflow:write"
    ],
    "last_used_at": null,
    "expires_at": "2027-02-15T00:00:00Z",
    "created_at": "2026-11-17T09:40:00Z"
  },
  "secret": "sk_01s_Hq7vT2mX\u2026(43 characters in all after sk_01s_)"
}
```

### DELETE /api-keys/{keyId}

**Revoke an API key.** Stops a key working at once.

Access: **Signed in** · Scope: Session only: refused for API keys and service tokens · Story: `MVP1-E0-06`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `keyId` | path | uuid | Yes | A key of the caller's. | The key. |

**Behaviour**

- Session only.
- Sets `revoked_at`; the next exchange of that key fails. An access token already issued from it lasts at most 5 more minutes.
- Records `auth.api_key_revoked`. Revoking an already revoked key answers `204` again.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `204` | Revoked | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `api_key_not_found` | No such key, or it belongs to someone else. |
| `403` | `session_required` | Called with an API key. Only a person signed in with a browser can do this. |
| `401` | `not_authenticated` | No valid session. |

**Sample request**

```http
DELETE /api/identity/v1/api-keys/0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=<session token>
Origin: https://01scale.com
```

**Sample response**

```http
HTTP/1.1 204 No Content
```

### POST /token

**Exchange an API key for an access token.** Login's `POST /token`, extended: the gateway sends either a session token or an API key.

Access: **Service** · Scope: None: the gateway's service credential · Story: `MVP1-E0-06`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `Authorization` | header | string | Yes | `Bearer <gateway service key>`. | Proves the caller is the gateway. |
| `api_key` | body | string | One of | `sk_01s_` and 43 base64url characters. Sent instead of `session_token`. | The key from the agent's `Authorization` header. |

**Behaviour**

- Hashes the key and finds it; it must not be revoked or expired.
- Signs an access token with `auth: api_key`, `akid` (the key's ID) and the key's `scopes`, never `*`.
- Updates `last_used_at` at most once a minute per key.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The key is valid | `access_token`, `token_type`, `expires_in` (300). |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_api_key` | The key is unknown, revoked or expired. The same answer in every case. |
| `401` | `invalid_service_credential` | The caller is not the gateway. |

**Sample request**

```http
POST /api/identity/v1/token HTTP/1.1
Authorization: Bearer <gateway service key>
Content-Type: application/json

{
  "api_key": "sk_01s_\u2026"
}
```

**Sample response**

```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0\u2026",
  "token_type": "Bearer",
  "expires_in": 300
}
```

### GET /users/{userId}

**Look up a user's email.** For services that write to a person, such as Delivery's emails. New: no story lists it yet.

Access: **Service** · Scope: `identity:users.read`, on a service token · Story: `MVP1-E7-01`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `userId` | path | uuid | Yes |  | The user. |
| `Authorization` | header | string | Yes | A service access token with the scope `identity:users.read`. | Only services may call it. |

**Behaviour**

- Read only. Records nothing: the calling service audits its own use.
- The caller gets its service token by signing in as a client (Service access, `docs/services/identity/service-access`).

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The user exists | `id`, `email`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `user_not_found` | No such user, including a deleted one. |
| `403` | `insufficient_scope` | The caller's token lacks `identity:users.read`. |

**Sample request**

```http
GET /api/identity/v1/users/0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e HTTP/1.1
Authorization: Bearer <service access token>
```

**Sample response**

```json
{
  "id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
  "email": "priya@example.com"
}
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| The account page (MVP1-E1-05) | Composed by the DocFlow app at `/account`: Identity's `AccountDetails`, `PasswordChangeButton`, `DeleteAccountDialog` and `ApiKeysManager`, DocFlow's documents count (`GET /api/docflow/v1/stats`) and Payment's orders (`GET /api/payment/v1/orders`). |
| Using a key (MVP1-E0-06 AC2) | The agent sends `Authorization: Bearer sk_01s_…` to the gateway, which exchanges it at `POST /token` and forwards the access token. Each service checks the token's `scopes` against the operation. |
| What a key can never do | Every endpoint on this page except `GET /me` requires `auth: session`, so a key cannot manage keys, change the password or delete the account. Payment's checkout gives an agent a `checkout_url` that a person must open (AC5). |
| MCP (MVP1-E0-06 AC3) | Identity's MCP server at `POST /api/identity/mcp` exposes `getMe` only; the session-only operations are not tools. |
| Audit (MVP1-E0-06 AC4) | Every service records `actor_type: api_key` and the `akid` claim for calls made with a key's token. |
| Event `identity.user.deleted` | Sent through the outbox to Upload, Extraction, Review, Payment, Delivery and DocFlow: `{event_id, type, occurred_at, data: {user_id}}`, HMAC-signed, retried with backoff. |

## Constraints at the API level

- Managing keys, the password and the account needs a browser session (`auth: session`).
- `DELETE /me` needs `confirm: DELETE` and an `Origin` from 01scale.com.
- Scopes come from a fixed list; at most 10 active keys; expiry at most 1 year.
- `GET /users/{userId}` needs a service token with `identity:users.read`.
