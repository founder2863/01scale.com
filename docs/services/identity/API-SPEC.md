# Identity service — API specification

> **Version 1 · Login with AWS Cognito.** Status: designed, not built. Stories: `MVP1-E1-01`, `MVP1-E1-02`, `MVP1-E1-03`, `MVP1-E1-04`, `MVP1-E1-06`.

Login endpoints only. Base address: `https://01scale.com/api/identity/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Conventions

| Topic | Rule |
|---|---|
| Format | JSON responses, `snake_case` names, ISO 8601 UTC timestamps. |
| Errors | `application/problem+json` with `type`, `title`, `status`, `detail`, `code` and `request_id`. Branch on `code`, never on the text. |
| Access: Public | No credentials needed. |
| Access: Signed in | The `__Host-01s_session` cookie. |
| Access: Service | The gateway's service key. Not reachable from a browser. |
| Tracing | Every response carries `X-Request-Id`. |

Sample error:

```json
{
  "type": "https://01scale.com/errors/not_authenticated",
  "title": "Not signed in",
  "status": 401,
  "detail": "Sign in to continue.",
  "code": "not_authenticated",
  "request_id": "req_0193a61f9c2e"
}
```

## Cookies

| Cookie | Holds | Lifetime | Attributes |
|---|---|---|---|
| `__Host-01s_login` | Holds `state`, `nonce`, the PKCE verifier, `mode` and `return_to` while the user is at Cognito | 10 minutes | Encrypted (JWE). HttpOnly, Secure, SameSite=Lax, Path=/. Deleted on callback. |
| `__Host-01s_session` | The session token | 7 days | 32 random bytes, base64url (43 characters). HttpOnly, Secure, SameSite=Lax, Path=/. Only its SHA-256 hash is stored. |

## Access token

A JWT signed with ES256. The header carries `kid`, the name of the signing key.

| Claim | Example | Meaning |
|---|---|---|
| `iss` | `https://01scale.com/api/identity/v1` | Who issued the token |
| `sub` | `0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e` | The user's ID |
| `aud` | `01scale` | Who the token is for; services reject any other value |
| `iat`, `exp` | Unix seconds; `exp` = `iat` + 300 | Issued at and expiry (5 minutes) |
| `jti` | A UUID | Unique ID of this token, for logs |
| `sid` | `0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f` | The session it came from |
| `auth` | `session` | How the user authenticated (`api_key` arrives with story MVP1-E0-06) |
| `scopes` | `["*"]` | What the caller may do; a browser session has full access to the user's own data |
| `is_admin` | `false` | Whether admin-only endpoints are allowed |

## Endpoints

### GET /auth/login

**Start sign-in or sign-up.** Redirects the browser to Cognito's hosted page. This is a link the browser follows, not a call made from code.

Access: **Public** · Story: `MVP1-E1-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `mode` | query | string | No | `signin` or `signup`. Default `signin`. | Which Cognito screen opens first. |
| `return_to` | query | string | No | A path on 01scale.com: starts with one `/`, not `//`, no scheme or host, at most 512 characters. Default `/`. | Where to send the user after a successful sign-in. |

**Behaviour**

- Creates `state` (32 random bytes), `nonce` (32 random bytes) and a PKCE code verifier (43 to 128 characters) with its S256 challenge.
- Stores them with `mode` and `return_to` in the encrypted `__Host-01s_login` cookie for 10 minutes.
- Redirects to Cognito's authorize endpoint with `response_type=code`, `scope=openid email`, the client ID, the callback URL, `state`, `nonce` and the code challenge.
- If the browser already has a valid session, redirects straight to `return_to`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `302` | Always on success | `Location`: the Cognito authorize URL (or `return_to` if already signed in). `Set-Cookie`: `__Host-01s_login`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `invalid_mode` | `mode` is not `signin` or `signup`. |
| `422` | `invalid_return_to` | `return_to` is not a same-site path. This blocks open redirects. |
| `429` | `rate_limited` | More than 20 requests a minute from one IP address. |

**Sample request**

```http
GET /api/identity/v1/auth/login?mode=signup&return_to=%2Fdocuments HTTP/1.1
Host: 01scale.com
```

**Sample response**

```http
HTTP/1.1 302 Found
Location: https://01scale.auth.us-east-1.amazoncognito.com/oauth2/authorize?response_type=code&client_id=4h8example2k&redirect_uri=https%3A%2F%2F01scale.com%2Fapi%2Fidentity%2Fv1%2Fauth%2Fcallback&scope=openid+email&state=Zk3...&nonce=p9Q...&code_challenge=E9M...&code_challenge_method=S256
Set-Cookie: __Host-01s_login=eyJhbGciOiJkaXIi...; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax
```

### GET /auth/callback

**Finish sign-in.** Cognito sends the browser here after the user signs in. Identity checks the response, creates the user if new, and creates the session.

Access: **Public** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `code` | query | string | Yes, unless `error` is present | At most 2,048 characters. Single use, valid a few minutes. | The one-time code from Cognito. |
| `state` | query | string | Yes | Must equal the `state` in the `__Host-01s_login` cookie, compared in constant time. | Proves this response belongs to the login this browser started. |
| `error` | query | string | No | Set by Cognito when the user cancels or sign-in fails. | The provider's error code. |
| `__Host-01s_login` | cookie | string | Yes | Present, not expired, decrypts correctly. | The values saved when login started. |

**Behaviour**

- Checks `state`, then exchanges `code` with Cognito's token endpoint using the client secret and the PKCE code verifier.
- Validates the ID token: signature against Cognito's keys, issuer, audience (the client ID), expiry, and `nonce`.
- Requires `email_verified` to be true, and an email of at most 254 characters (the longest a mail server accepts). Both are checked before anything is stored.
- Finds the user by `cognito_sub`. If none exists, creates one and records `auth.signup`.
- Revokes that user's sessions created before the token's `auth_time` when the password was just reset (story MVP1-E1-04).
- Creates a session, sets `__Host-01s_session`, deletes `__Host-01s_login`, records `auth.signin` and redirects to `return_to`.
- Cognito's tokens are used once here and then discarded. They are never stored or sent to the browser.
- On any failure, a browser (a request that accepts `text/html`) is redirected to the friendly page `/sign-in-error?code=<code>`, which explains the problem in plain language with one button to start again. Any other client, such as an app or an AI agent, gets the `application/problem+json` error below.
- Every failure is recorded as `auth.signin_failed` with the code as its reason.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `302` | Sign-in succeeded | `Location`: `return_to`. `Set-Cookie`: `__Host-01s_session`, and `__Host-01s_login` cleared. |
| `302` | Sign-in failed, and the caller is a browser | `Location`: `/sign-in-error?code=<code>`, with `__Host-01s_login` cleared. |

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `login_expired` | The login cookie is missing or older than 10 minutes. The user starts again. |
| `400` | `login_state_mismatch` | `state` does not match, or the ID token's `nonce` does not match. |
| `400` | `email_not_verified` | Cognito reports the email as unverified. |
| `422` | `email_not_supported` | The email is longer than 254 characters, so no user is created. Practically never happens, since Cognito has just sent mail to the address. |
| `400` | `provider_error` | Cognito returned `error` (for example the user cancelled), or rejected the code. |
| `502` | `provider_unavailable` | Cognito could not be reached. Safe to start again. |

**Sample request**

```http
GET /api/identity/v1/auth/callback?code=4f1c9a7e-example&state=Zk3... HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_login=eyJhbGciOiJkaXIi...
```

**Sample response**

```http
HTTP/1.1 302 Found
Location: /documents
Set-Cookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax
Set-Cookie: __Host-01s_login=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax
```

### GET /session

**Who am I.** Returns the signed-in user and when the session ends. Apps call this to decide whether to show Sign in or the user's email.

Access: **Signed in** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `__Host-01s_session` | cookie | string | Yes | 43 base64url characters; must match a session that is not revoked and not expired. | The session token. Sent by the browser automatically. |

**Behaviour**

- Read-only. Does not extend the session in version 1.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | A valid session exists | The user, the session's expiry, how they authenticated and their scopes. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No cookie, an unknown token, or a session that is expired or revoked. The same answer in every case. |
| `429` | `rate_limited` | More than 120 requests a minute for one session. |

**Sample request**

```http
GET /api/identity/v1/session HTTP/1.1
Host: 01scale.com
Cookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM
```

**Sample response**

```json
{
  "user": {
    "id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
    "email": "priya@example.com"
  },
  "session": {
    "id": "0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f",
    "expires_at": "2026-11-23T09:14:07Z"
  },
  "auth": "session",
  "scopes": [
    "*"
  ]
}
```

### POST /auth/logout

**Sign out.** Ends the current session and returns the address that also signs the user out of Cognito.

Access: **Signed in** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `__Host-01s_session` | cookie | string | Yes | A valid session. | The session to end. |
| `Origin` | header | string | Yes | Must be `https://01scale.com` (or localhost in development). | Blocks other sites from signing the user out. |

**Behaviour**

- Sets `revoked_at` on the session, clears the cookie and records `auth.signout`.
- The client then sends the browser to `logout_url`, which clears Cognito's own session so the next sign-in shows the login form.
- No request body.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The session was ended | `logout_url`: Cognito's logout address, which returns the user to the home page. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | There is no valid session to end. |
| `403` | `origin_not_allowed` | The `Origin` header is missing or from another site. |

**Sample request**

```http
POST /api/identity/v1/auth/logout HTTP/1.1
Host: 01scale.com
Origin: https://01scale.com
Cookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM
```

**Sample response**

```json
{
  "logout_url": "https://01scale.auth.us-east-1.amazoncognito.com/logout?client_id=4h8example2k&logout_uri=https%3A%2F%2F01scale.com%2F"
}
```

### POST /token

**Exchange a session for an access token.** Called only by the gateway. Turns the session token from the browser's cookie into a 5-minute access token that the other services accept.

Access: **Service** · Story: `MVP1-E1-03`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `Authorization` | header | string | Yes | `Bearer <gateway service key>`. Compared in constant time. | Proves the caller is the gateway. Browsers cannot reach this endpoint. |
| `session_token` | body | string | Yes | Exactly 43 base64url characters. | The value of the `__Host-01s_session` cookie. |

**Behaviour**

- Hashes the token, looks up the session and checks it is not revoked or expired.
- Signs a JWT with the active signing key (algorithm ES256) and the claims listed under Access token.
- The gateway may cache the access token until 30 seconds before it expires.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The session is valid | `access_token`, `token_type` (always `Bearer`) and `expires_in` (always `300`). |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_service_credential` | The gateway key is missing or wrong. |
| `401` | `invalid_credential` | The session token is unknown, expired or revoked. |
| `422` | `validation_failed` | `session_token` is missing or malformed. |

**Sample request**

```http
POST /api/identity/v1/token HTTP/1.1
Authorization: Bearer <gateway service key>
Content-Type: application/json

{
  "session_token": "q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM"
}
```

**Sample response**

```json
{
  "access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0.eyJpc3MiOiJodHRwczovLzAxc2NhbGUuY29tL2FwaS9pZGVudGl0eS92MSIsInN1YiI6IjAxOTNhNWIyLi4uIn0.MEUCIQ...",
  "token_type": "Bearer",
  "expires_in": 300
}
```

### GET /jwks

**Public keys.** The public keys that verify access tokens. Every service fetches this once and caches it.

Access: **Public** · Story: `MVP1-E1-03`

**Inputs:** none.

**Behaviour**

- Returns the active key and any key retired less than 10 minutes ago, so tokens signed just before a rotation still verify.
- Sent with `Cache-Control: public, max-age=300`.
- Never contains private key material.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | A JSON Web Key Set: one entry per public key. |

**Sample request**

```http
GET /api/identity/v1/jwks HTTP/1.1
Host: 01scale.com
```

**Sample response**

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "kid": "k2026-11",
      "use": "sig",
      "alg": "ES256",
      "x": "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
      "y": "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0"
    }
  ]
}
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| Forgot and reset password (MVP1-E1-04) | Handled entirely on Cognito's hosted page, which answers the same way whether or not the account exists. On the next sign-in, Identity revokes that user's older sessions. |
| Route protection (MVP1-E1-06) | Not an Identity endpoint. The gateway redirects signed-out visitors to `/auth/login` with `return_to` set, returns `401` for API calls without a session, and each service returns `404` for another user's data. |
| Health and contract | Like every service, Identity also serves `GET /health` and `GET /openapi.json` from the service template (MVP1-E0-05). |

## Constraints at the API level

- `mode` must be `signin` or `signup`.
- `return_to` must be a path on 01scale.com (starts with one `/`, not `//`, at most 512 characters).
- `state` and `nonce` must match the values in the login cookie, compared in constant time.
- The email from Cognito must be verified and at most 254 characters.
- The login cookie must be present and less than 10 minutes old.
- `session_token` must be exactly 43 base64url characters.
- `POST /auth/logout` must carry an `Origin` header from 01scale.com.
- `POST /token` must carry the gateway's service key.
- Rate limits at the gateway: 20 a minute per IP on `/auth/login` and `/auth/callback`; 120 a minute per session on `/session`.
- Every error uses the same shape, `application/problem+json`, with a stable `code`.
