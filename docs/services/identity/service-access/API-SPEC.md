# Service access service — API specification

> **Version 1 · Identity, third part.** Status: in design. Stories: `MVP1-E1-03`, `MVP1-E0-07`, `MVP1-E0-09`.

Base address: `https://01scale.com/api/identity/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/delegation_not_allowed",
  "title": "Delegation not allowed",
  "status": 403,
  "detail": "This client may not act for users.",
  "code": "delegation_not_allowed",
  "request_id": "req_0193a61f9c2e"
}
```

## Token

Claims added to Login's access token by this part.

| Claim | Example | Meaning |
|---|---|---|
| `auth` | `service` or `delegated` | Adds two values to Login's `session` and `api_key`: a service acting as itself, or acting for a user. |
| `sub` | `service:delivery` | For `auth: service`, the client. For `delegated`, the user, as in any user token. |
| `app` | `docflow` | The client that asked; present on `service` and `delegated` tokens. Payment and Delivery record it as the calling app. |
| `act` | `{"sub": "service:docflow"}` | Only on `delegated` tokens: who is acting for the user (RFC 8693 §4.1). |

## Endpoints

### POST /token

**Sign in as a service.** A service or app proves who it is with its client ID and secret, and gets a 5-minute service token.

Access: **Public (client credentials)** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `grant_type` | body | string | Yes | `client_credentials`. | Which kind of token. |
| `client_id` | body | string | Yes | A registered client's name, such as `docflow`. | Who is asking. |
| `client_secret` | body | string | Yes | `cs_01s_` and 43 base64url characters. Compared by hash, in constant time. | Proves it. Held only in the client's environment variables. |
| `scope` | body | string | No | Space-separated; each must be in the client's `scopes`. Default: all of them. | What the token may do. |

**Behaviour**

- Finds the client, checks it is not revoked, and compares the SHA-256 of the secret.
- Signs a token with `sub: service:<client_id>`, `auth: service`, `app: <client_id>` and the granted scopes. No `sid`, no `is_admin`.
- Failures are rate-limited (10 a minute per client ID) and recorded as `auth.client_signin_failed`; successes are not audited, as they happen every few minutes.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Valid client | `access_token`, `token_type` (`Bearer`), `expires_in` (300), `scope`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_client` | Unknown or revoked client, or wrong secret. The same answer in every case. |
| `400` | `invalid_scope` | A requested scope is not allowed for this client. |
| `429` | `rate_limited` | Too many failures; see `Retry-After`. |

**Sample request**

```http
POST /api/identity/v1/token HTTP/1.1
Host: 01scale.com
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "delivery",
  "client_secret": "cs_01s_\u2026",
  "scope": "identity:users.read"
}
```

**Sample response**

```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0\u2026",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "identity:users.read"
}
```

### POST /token

**Act for a user.** A service that may act for users exchanges its service token for a 5-minute token for one user, so the work it does with no person present is still that user's.

Access: **Service** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `Authorization` | header | string | Yes | `Bearer <service token>`. | The service asking. |
| `grant_type` | body | string | Yes | `urn:ietf:params:oauth:grant-type:token-exchange`. | Token exchange, as in RFC 8693. |
| `on_behalf_of` | body | uuid | Yes | An existing user. | The user the work is for. RFC 8693 would send the user's own token; here the user may have no session, so the trusted service names them. |
| `scope` | body | string | No | Space-separated; each must be in the client's `act_scopes`. Default: all of them. | What the token may do for that user. |

**Behaviour**

- Checks the service token, and that its client may act for users (`act_scopes` is not empty).
- Checks the user exists. A deleted user answers `404`, so work for a deleted account stops.
- Signs a token with the user's `sub`, `auth: delegated`, `act: {"sub": "service:<client_id>"}`, `app` and the granted scopes. Never `*`, `is_admin`, or scopes for keys, passwords or accounts.
- Services treat it as that user's token, so their ownership checks apply unchanged, and record both the user and `act` in their audit events.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Allowed | `access_token`, `token_type`, `expires_in` (300), `scope`, `issued_token_type` (`urn:ietf:params:oauth:token-type:access_token`). |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid service token. |
| `403` | `delegation_not_allowed` | This client may not act for users. |
| `400` | `invalid_scope` | A requested scope is not in the client's `act_scopes`. |
| `404` | `user_not_found` | No such user, including a deleted one. |

**Sample request**

```http
POST /api/identity/v1/token HTTP/1.1
Host: 01scale.com
Authorization: Bearer <DocFlow service token>
Content-Type: application/json

{
  "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
  "on_behalf_of": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
  "scope": "extraction:read review:write"
}
```

**Sample response**

```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0\u2026",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "extraction:read review:write",
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token"
}
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| Checking a caller (service template) | `requireUser(scope)` accepts `session`, `api_key` and `delegated` tokens; `requireService(scope)` accepts only `auth: service`. A delegated token passes every ownership check for its user, and the service audits `actor_type: service` with the user as `actor_id` and `act.sub` in metadata. |
| Where the token comes from (service template) | `callService()` gets and caches a service token (until 30 seconds before expiry), and a delegated token per user when asked, then calls `https://01scale.com/api/…` through the gateway. |
| Through the gateway (decision on issue #21) | Service and delegated tokens are already access tokens: the gateway checks their signature and expiry and passes them on unchanged. |
| Registering clients | Clients are rows in `identity.service_clients`, added by a migration: there is no endpoint, so no caller can grant itself access. A new secret is generated outside the repository, set in the client's Vercel environment, and only its hash is put in the migration's input. |

## Constraints at the API level

- Secrets are compared by hash in constant time; failures are rate-limited.
- Granted scopes are a subset of the client's.
- A delegated token never carries `*`, `is_admin` or Identity scopes.
