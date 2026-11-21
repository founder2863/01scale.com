"""Design content for the Identity service, version 1 (login with AWS Cognito).

This file is the single source for that module's design. Running it writes
docs/services/identity/README.md, API-SPEC.md and DATA-MODEL.md.
scripts/site/build_products.py reads the same data to write the remaining docs
and the site's product page data, so the docs and the site cannot drift apart.

Run from the repo root:  npm run site:data
"""
import json
import os

BASE = "/api/identity/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
U2 = "0193a5c9-11aa-7d42-8f10-2b7c9d0e1f2a"
S1 = "0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f"
S2 = "0193a61f-03b7-7e90-b1c4-6a7b8c9d0e1f"
A1 = "0193a5b2-9d41-7f02-8c55-0a1b2c3d4e5f"
A2 = "0193a5b2-9d42-7a6b-9d77-1b2c3d4e5f6a"
A3 = "0193a7d0-4410-7b3c-8e21-2c3d4e5f6a7b"
HASH1 = "9f2c1e7ab4d08c35e6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7"
HASH2 = "1b7d4e90c2a5f8361d0e9c8b7a6f5e4d3c2b1a09f8e7d6c5b4a3928170615243"

OVERVIEW = {
    "name": "Identity",
    "version": "Version 1 · Login with AWS Cognito",
    "status": "Designed, not built",
    "base": BASE,
    "what": [
        "Identity is the platform service that answers one question for every other service and app: who is making this request?",
        "In version 1 it does not store passwords or show a login form itself. It sends the user to AWS Cognito's hosted sign-in page, and when Cognito sends them back it creates a 01scale user and a 01scale session.",
        "It then issues short-lived access tokens that every other service can verify on its own, so no other service ever handles a password, a cookie or a Cognito token.",
    ],
    "why": [
        ("One place for sign-in", "Upload, Extraction, Review, Payment and Delivery must not each build login. They trust one token from Identity."),
        ("Passwords are not our problem yet", "Cognito handles sign-up, email verification, password rules and password reset. Version 1 consumes that instead of rebuilding it."),
        ("The provider can be replaced", "Cognito is used only through the open standard OIDC. Version 2 swaps in hand-built passwordless login behind the same endpoints, and no app or service changes."),
        ("Apps stay simple", "An app needs one link to sign a user in and one call to learn who they are."),
    ],
    "scope_in": [
        "Sign up with email and password, with the email verified by a code (on Cognito's page)",
        "Sign in and sign out",
        "Forgot and reset password (on Cognito's page)",
        "A 01scale session kept in a secure cookie",
        "Short-lived access tokens for the other services, and the public keys to verify them",
        "An audit record of every sign-up, sign-in, sign-out and failed sign-in",
    ],
    "scope_out": [
        "Account page, change password from the account page, delete account (the Account management module)",
        "API keys for AI agents (story MVP1-E0-06)",
        "A branded sign-in page at auth.01scale.com (pending story MVP1-E1-07)",
        "Sign in with Google (pending story MVP1-E1-08)",
        "Two-step verification",
        "Magic links, passkeys and anything else from version 2",
    ],
    "stories": ["MVP1-E1-01", "MVP1-E1-02", "MVP1-E1-03", "MVP1-E1-04", "MVP1-E1-06"],
}

FLOW = [
    ("Browser", "The user taps Sign in. The app sends them to `GET /auth/login`."),
    ("Identity", "Creates three one-time values (`state`, `nonce` and a PKCE code verifier), keeps them in a 10-minute encrypted cookie, and redirects the browser to Cognito."),
    ("Cognito", "Shows the hosted page. The user signs up (and verifies their email with a code) or signs in. Cognito redirects back with a one-time `code`."),
    ("Identity", "On `GET /auth/callback`: checks `state`, exchanges the `code` for Cognito tokens using the code verifier, checks the ID token (`nonce`, issuer, audience, expiry) and requires a verified email."),
    ("Identity", "Finds the user by Cognito's user ID or creates one, creates a session, sets the session cookie, writes an audit event and redirects to the page the user asked for."),
    ("Gateway", "On every later API request, exchanges the session cookie for a 5-minute access token (`POST /token`) and forwards the request with it."),
    ("Any service", "Verifies the access token's signature with Identity's public keys (`GET /jwks`) and reads the user ID from it. No call to Identity is needed."),
]

CONCEPTS = [
    ("User", "A person, identified inside 01scale by a `user.id`. Cognito's ID for the same person is stored as `cognito_sub`."),
    ("Session", "Proof that a browser signed in. The browser holds a random token in a cookie; Identity stores only a hash of it. Lasts 7 days."),
    ("Access token", "A signed pass valid for 5 minutes that says which user is calling. Services verify it themselves. Browsers never see it."),
    ("Signing key", "The private key Identity signs access tokens with. The matching public key is published so services can verify."),
    ("OIDC", "OpenID Connect: the open standard for 'sign in with a provider'. Identity uses its authorization code flow."),
    ("PKCE", "An extra one-time secret in that flow, so a stolen `code` cannot be exchanged by anyone else."),
    ("state and nonce", "Two one-time values that prove the response from Cognito belongs to the login this browser started."),
]

COOKIES = [
    ("`__Host-01s_login`", "Holds `state`, `nonce`, the PKCE verifier, `mode` and `return_to` while the user is at Cognito", "10 minutes", "Encrypted (JWE). HttpOnly, Secure, SameSite=Lax, Path=/. Deleted on callback."),
    ("`__Host-01s_session`", "The session token", "7 days", "32 random bytes, base64url (43 characters). HttpOnly, Secure, SameSite=Lax, Path=/. Only its SHA-256 hash is stored."),
]

CLAIMS = [
    ("`iss`", "`https://01scale.com/api/identity/v1`", "Who issued the token"),
    ("`sub`", f"`{U1}`", "The user's ID"),
    ("`aud`", "`01scale`", "Who the token is for; services reject any other value"),
    ("`iat`, `exp`", "Unix seconds; `exp` = `iat` + 300", "Issued at and expiry (5 minutes)"),
    ("`jti`", "A UUID", "Unique ID of this token, for logs"),
    ("`sid`", f"`{S1}`", "The session it came from"),
    ("`auth`", "`session`", "How the caller authenticated: `session` here; `api_key` (Account management), `service` and `delegated` (Service access, `docs/services/identity/service-access`)"),
    ("`scopes`", '`["*"]`', "What the caller may do; a browser session has full access to the user's own data"),
    ("`is_admin`", "`false`", "Whether admin-only endpoints are allowed"),
]

ENDPOINTS = [
    {
        "id": "auth-login", "method": "GET", "path": f"{BASE}/auth/login", "access": "Public", "story": "MVP1-E1-02",
        "title": "Start sign-in or sign-up",
        "summary": "Redirects the browser to Cognito's hosted page. This is a link the browser follows, not a call made from code.",
        "params": [
            ("mode", "query", "string", "No", "`signin` or `signup`. Default `signin`.", "Which Cognito screen opens first."),
            ("return_to", "query", "string", "No", "A path on 01scale.com: starts with one `/`, not `//`, no scheme or host, at most 512 characters. Default `/`.", "Where to send the user after a successful sign-in."),
        ],
        "behaviour": [
            "Creates `state` (32 random bytes), `nonce` (32 random bytes) and a PKCE code verifier (43 to 128 characters) with its S256 challenge.",
            "Stores them with `mode` and `return_to` in the encrypted `__Host-01s_login` cookie for 10 minutes.",
            "Redirects to Cognito's authorize endpoint with `response_type=code`, `scope=openid email`, the client ID, the callback URL, `state`, `nonce` and the code challenge.",
            "If the browser already has a valid session, redirects straight to `return_to`.",
        ],
        "responses": [("302", "Always on success", "`Location`: the Cognito authorize URL (or `return_to` if already signed in). `Set-Cookie`: `__Host-01s_login`.")],
        "errors": [
            ("422", "`invalid_mode`", "`mode` is not `signin` or `signup`."),
            ("422", "`invalid_return_to`", "`return_to` is not a same-site path. This blocks open redirects."),
            ("429", "`rate_limited`", "More than 20 requests a minute from one IP address."),
        ],
        "request": "GET /api/identity/v1/auth/login?mode=signup&return_to=%2Fdocuments HTTP/1.1\nHost: 01scale.com",
        "response": "HTTP/1.1 302 Found\nLocation: https://01scale.auth.us-east-1.amazoncognito.com/oauth2/authorize?response_type=code&client_id=4h8example2k&redirect_uri=https%3A%2F%2F01scale.com%2Fapi%2Fidentity%2Fv1%2Fauth%2Fcallback&scope=openid+email&state=Zk3...&nonce=p9Q...&code_challenge=E9M...&code_challenge_method=S256\nSet-Cookie: __Host-01s_login=eyJhbGciOiJkaXIi...; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax",
    },
    {
        "id": "auth-callback", "method": "GET", "path": f"{BASE}/auth/callback", "access": "Public", "story": "MVP1-E1-03",
        "title": "Finish sign-in",
        "summary": "Cognito sends the browser here after the user signs in. Identity checks the response, creates the user if new, and creates the session.",
        "params": [
            ("code", "query", "string", "Yes, unless `error` is present", "At most 2,048 characters. Single use, valid a few minutes.", "The one-time code from Cognito."),
            ("state", "query", "string", "Yes", "Must equal the `state` in the `__Host-01s_login` cookie, compared in constant time.", "Proves this response belongs to the login this browser started."),
            ("error", "query", "string", "No", "Set by Cognito when the user cancels or sign-in fails.", "The provider's error code."),
            ("__Host-01s_login", "cookie", "string", "Yes", "Present, not expired, decrypts correctly.", "The values saved when login started."),
        ],
        "behaviour": [
            "Checks `state`, then exchanges `code` with Cognito's token endpoint using the client secret and the PKCE code verifier.",
            "Validates the ID token: signature against Cognito's keys, issuer, audience (the client ID), expiry, and `nonce`.",
            "Requires `email_verified` to be true, and an email of at most 254 characters (the longest a mail server accepts). Both are checked before anything is stored.",
            "Finds the user by `cognito_sub`. If none exists, creates one and records `auth.signup`.",
            "Revokes that user's sessions created before the token's `auth_time` when the password was just reset (story MVP1-E1-04).",
            "Creates a session, sets `__Host-01s_session`, deletes `__Host-01s_login`, records `auth.signin` and redirects to `return_to`.",
            "Cognito's tokens are used once here and then discarded. They are never stored or sent to the browser.",
            "On any failure, a browser (a request that accepts `text/html`) is redirected to the friendly page `/sign-in-error?code=<code>`, which explains the problem in plain language with one button to start again. Any other client, such as an app or an AI agent, gets the `application/problem+json` error below.",
            "Every failure is recorded as `auth.signin_failed` with the code as its reason.",
        ],
        "responses": [
            ("302", "Sign-in succeeded", "`Location`: `return_to`. `Set-Cookie`: `__Host-01s_session`, and `__Host-01s_login` cleared."),
            ("302", "Sign-in failed, and the caller is a browser", "`Location`: `/sign-in-error?code=<code>`, with `__Host-01s_login` cleared."),
        ],
        "errors": [
            ("400", "`login_expired`", "The login cookie is missing or older than 10 minutes. The user starts again."),
            ("400", "`login_state_mismatch`", "`state` does not match, or the ID token's `nonce` does not match."),
            ("400", "`email_not_verified`", "Cognito reports the email as unverified."),
            ("422", "`email_not_supported`", "The email is longer than 254 characters, so no user is created. Practically never happens, since Cognito has just sent mail to the address."),
            ("400", "`provider_error`", "Cognito returned `error` (for example the user cancelled), or rejected the code."),
            ("502", "`provider_unavailable`", "Cognito could not be reached. Safe to start again."),
        ],
        "request": "GET /api/identity/v1/auth/callback?code=4f1c9a7e-example&state=Zk3... HTTP/1.1\nHost: 01scale.com\nCookie: __Host-01s_login=eyJhbGciOiJkaXIi...",
        "response": "HTTP/1.1 302 Found\nLocation: /documents\nSet-Cookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax\nSet-Cookie: __Host-01s_login=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
    },
    {
        "id": "session", "method": "GET", "path": f"{BASE}/session", "access": "Signed in", "story": "MVP1-E1-03",
        "title": "Who am I",
        "summary": "Returns the signed-in user and when the session ends. Apps call this to decide whether to show Sign in or the user's email.",
        "params": [("__Host-01s_session", "cookie", "string", "Yes", "43 base64url characters; must match a session that is not revoked and not expired.", "The session token. Sent by the browser automatically.")],
        "behaviour": ["Read-only. Does not extend the session in version 1."],
        "responses": [("200", "A valid session exists", "The user, the session's expiry, how they authenticated and their scopes.")],
        "errors": [
            ("401", "`not_authenticated`", "No cookie, an unknown token, or a session that is expired or revoked. The same answer in every case."),
            ("429", "`rate_limited`", "More than 120 requests a minute for one session."),
        ],
        "request": "GET /api/identity/v1/session HTTP/1.1\nHost: 01scale.com\nCookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM",
        "response": json.dumps({"user": {"id": U1, "email": "priya@example.com"}, "session": {"id": S1, "expires_at": "2026-11-23T09:14:07Z"}, "auth": "session", "scopes": ["*"]}, indent=2),
    },
    {
        "id": "auth-logout", "method": "POST", "path": f"{BASE}/auth/logout", "access": "Signed in", "story": "MVP1-E1-03",
        "title": "Sign out",
        "summary": "Ends the current session and returns the address that also signs the user out of Cognito.",
        "params": [
            ("__Host-01s_session", "cookie", "string", "Yes", "A valid session.", "The session to end."),
            ("Origin", "header", "string", "Yes", "Must be `https://01scale.com` (or localhost in development).", "Blocks other sites from signing the user out."),
        ],
        "behaviour": [
            "Sets `revoked_at` on the session, clears the cookie and records `auth.signout`.",
            "The client then sends the browser to `logout_url`, which clears Cognito's own session so the next sign-in shows the login form.",
            "No request body.",
        ],
        "responses": [("200", "The session was ended", "`logout_url`: Cognito's logout address, which returns the user to the home page.")],
        "errors": [
            ("401", "`not_authenticated`", "There is no valid session to end."),
            ("403", "`origin_not_allowed`", "The `Origin` header is missing or from another site."),
        ],
        "request": "POST /api/identity/v1/auth/logout HTTP/1.1\nHost: 01scale.com\nOrigin: https://01scale.com\nCookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM",
        "response": json.dumps({"logout_url": "https://01scale.auth.us-east-1.amazoncognito.com/logout?client_id=4h8example2k&logout_uri=https%3A%2F%2F01scale.com%2F"}, indent=2),
    },
    {
        "id": "token", "method": "POST", "path": f"{BASE}/token", "access": "Service", "story": "MVP1-E1-03",
        "title": "Exchange a session for an access token",
        "summary": "Called only by the gateway. Turns the session token from the browser's cookie into a 5-minute access token that the other services accept.",
        "params": [
            ("Authorization", "header", "string", "Yes", "`Bearer <gateway service key>`. Compared in constant time.", "Proves the caller is the gateway. Browsers cannot reach this endpoint."),
            ("session_token", "body", "string", "Yes", "Exactly 43 base64url characters.", "The value of the `__Host-01s_session` cookie."),
        ],
        "behaviour": [
            "Hashes the token, looks up the session and checks it is not revoked or expired.",
            "Signs a JWT with the active signing key (algorithm ES256) and the claims listed under Access token.",
            "The gateway may cache the access token until 30 seconds before it expires.",
        ],
        "responses": [("200", "The session is valid", "`access_token`, `token_type` (always `Bearer`) and `expires_in` (always `300`).")],
        "errors": [
            ("401", "`invalid_service_credential`", "The gateway key is missing or wrong."),
            ("401", "`invalid_credential`", "The session token is unknown, expired or revoked."),
            ("422", "`validation_failed`", "`session_token` is missing or malformed."),
        ],
        "request": "POST /api/identity/v1/token HTTP/1.1\nAuthorization: Bearer <gateway service key>\nContent-Type: application/json\n\n" + json.dumps({"session_token": "q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM"}, indent=2),
        "response": json.dumps({"access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0.eyJpc3MiOiJodHRwczovLzAxc2NhbGUuY29tL2FwaS9pZGVudGl0eS92MSIsInN1YiI6IjAxOTNhNWIyLi4uIn0.MEUCIQ...", "token_type": "Bearer", "expires_in": 300}, indent=2),
    },
    {
        "id": "jwks", "method": "GET", "path": f"{BASE}/jwks", "access": "Public", "story": "MVP1-E1-03",
        "title": "Public keys",
        "summary": "The public keys that verify access tokens. Every service fetches this once and caches it.",
        "params": [],
        "behaviour": [
            "Returns the active key and any key retired less than 10 minutes ago, so tokens signed just before a rotation still verify.",
            "Sent with `Cache-Control: public, max-age=300`.",
            "Never contains private key material.",
        ],
        "responses": [("200", "Always", "A JSON Web Key Set: one entry per public key.")],
        "errors": [],
        "request": "GET /api/identity/v1/jwks HTTP/1.1\nHost: 01scale.com",
        "response": json.dumps({"keys": [{"kty": "EC", "crv": "P-256", "kid": "k2026-11", "use": "sig", "alg": "ES256", "x": "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU", "y": "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0"}]}, indent=2),
    },
]

ERROR_SAMPLE = json.dumps({
    "type": "https://01scale.com/errors/not_authenticated",
    "title": "Not signed in",
    "status": 401,
    "detail": "Sign in to continue.",
    "code": "not_authenticated",
    "request_id": "req_0193a61f9c2e",
}, indent=2)

NO_ENDPOINT = [
    ("Forgot and reset password (MVP1-E1-04)", "Handled entirely on Cognito's hosted page, which answers the same way whether or not the account exists. On the next sign-in, Identity revokes that user's older sessions."),
    ("Route protection (MVP1-E1-06)", "Not an Identity endpoint. The gateway redirects signed-out visitors to `/auth/login` with `return_to` set, returns `401` for API calls without a session, and each service returns `404` for another user's data."),
    ("Health and contract", "Like every service, Identity also serves `GET /health` and `GET /openapi.json` from the service template (MVP1-E0-05)."),
]

TABLES = [
    {
        "name": "identity.users", "purpose": "One row per person. Created the first time someone completes sign-in with a verified email.",
        "columns": [
            ("id", "uuid", "No", "generated (UUIDv7)", "Primary key", "The user's ID everywhere in 01scale. Other services store it as `owner_id`. Never changes."),
            ("cognito_sub", "text", "No", "", "Unique. 1 to 255 characters", "Cognito's permanent ID for this person (the `sub` claim). Used to find the user at sign-in. Not the email, because an email can change."),
            ("email", "text", "No", "", "Unique ignoring case. Stored lower-cased. 3 to 254 characters and contains `@`", "The verified email address from Cognito. Shown in the UI and used by Delivery to send email."),
            ("email_verified_at", "timestamptz", "No", "", "", "When Identity first saw this email as verified. Always set, because unverified emails are refused."),
            ("is_admin", "boolean", "No", "false", "", "Allows admin-only pages and endpoints. Set by hand in the database; there is no API to change it."),
            ("created_at", "timestamptz", "No", "now()", "", "When the user first signed in. Shown as 'joined'."),
        ],
        "constraints": [
            "`users_pkey`: primary key (`id`)",
            "`users_cognito_sub_key`: unique (`cognito_sub`)",
            "`users_email_lower_key`: unique index on `lower(email)`",
            "`users_email_format_check`: `email = lower(email)` and `email like '%_@_%'` and `length(email) between 3 and 254`",
        ],
        "sample_cols": ["id", "cognito_sub", "email", "email_verified_at", "is_admin", "created_at"],
        "sample_rows": [
            [U1, "a1b2c3d4-5e6f-7081-92a3-b4c5d6e7f809", "priya@example.com", "2026-11-16 09:14:07+00", "false", "2026-11-16 09:14:07+00"],
            [U2, "0f9e8d7c-6b5a-4938-2716-0a1b2c3d4e5f", "owner@example.com", "2026-11-16 10:02:41+00", "true", "2026-11-16 10:02:41+00"],
        ],
    },
    {
        "name": "identity.sessions", "purpose": "One row per browser sign-in. A request is signed in if its cookie matches a row that is neither revoked nor expired.",
        "columns": [
            ("id", "uuid", "No", "generated (UUIDv7)", "Primary key", "The session's ID. Appears in access tokens as `sid` and in audit events."),
            ("user_id", "uuid", "No", "", "Foreign key to `identity.users(id)`, delete cascades", "Whose session this is."),
            ("token_hash", "text", "No", "", "Unique. Exactly 64 lower-case hex characters", "SHA-256 of the cookie's token. The token itself is never stored, so a database leak cannot be used to sign in."),
            ("created_at", "timestamptz", "No", "now()", "", "When the user signed in."),
            ("expires_at", "timestamptz", "No", "", "Later than `created_at`", "When the session stops working: 7 days after `created_at`."),
            ("revoked_at", "timestamptz", "Yes", "", "Not earlier than `created_at`", "Set when the user signs out or their sessions are revoked after a password reset. Empty means still active."),
        ],
        "constraints": [
            "`sessions_pkey`: primary key (`id`)",
            "`sessions_user_id_fkey`: foreign key (`user_id`) references `identity.users(id)` on delete cascade",
            "`sessions_token_hash_key`: unique (`token_hash`)",
            "`sessions_token_hash_check`: `token_hash ~ '^[0-9a-f]{64}$'`",
            "`sessions_expiry_check`: `expires_at > created_at`",
            "`sessions_revoked_check`: `revoked_at is null or revoked_at >= created_at`",
            "`sessions_user_id_idx`: index on (`user_id`, `created_at` desc)",
        ],
        "sample_cols": ["id", "user_id", "token_hash", "created_at", "expires_at", "revoked_at"],
        "sample_rows": [
            [S1, U1, HASH1, "2026-11-16 09:14:07+00", "2026-11-23 09:14:07+00", "(empty)"],
            [S2, U1, HASH2, "2026-11-10 18:30:00+00", "2026-11-17 18:30:00+00", "2026-11-12 08:05:19+00"],
        ],
    },
    {
        "name": "identity.signing_keys", "purpose": "The keys that sign access tokens. Usually one row; two for a few minutes during a rotation.",
        "columns": [
            ("kid", "text", "No", "", "Primary key. 1 to 64 characters", "The key's name, for example `k2026-11`. Written into every token so a service knows which public key to use."),
            ("public_jwk", "jsonb", "No", "", "Must contain `kty`, `crv`, `x`, `y` and must not contain `d`", "The public half, in the format served by `GET /jwks`."),
            ("private_key_encrypted", "text", "No", "", "", "The private half, encrypted with a key held only in the service's environment. Never leaves the service."),
            ("created_at", "timestamptz", "No", "now()", "", "When the key was created."),
            ("retired_at", "timestamptz", "Yes", "", "Not earlier than `created_at`", "When the key stopped signing new tokens. Empty means it is the active key."),
        ],
        "constraints": [
            "`signing_keys_pkey`: primary key (`kid`)",
            "`signing_keys_public_only_check`: `public_jwk ?& array['kty','crv','x','y']` and not `public_jwk ? 'd'`",
            "`signing_keys_one_active_idx`: unique index on (`(true)`) where `retired_at is null`, so only one key can be active",
            "`signing_keys_retired_check`: `retired_at is null or retired_at >= created_at`",
        ],
        "sample_cols": ["kid", "public_jwk", "private_key_encrypted", "created_at", "retired_at"],
        "sample_rows": [
            ["k2026-11", '{"kty":"EC","crv":"P-256","x":"f83OJ3D2…","y":"x_FEzRu9…"}', "v1:AES-GCM:9c1f…(encrypted)", "2026-11-01 00:00:00+00", "(empty)"],
        ],
    },
    {
        "name": "identity.audit_events", "purpose": "An append-only record of what happened. Every service has this table from the service template; these are the events login writes.",
        "columns": [
            ("id", "uuid", "No", "generated (UUIDv7)", "Primary key", "The event's ID."),
            ("actor_id", "uuid", "Yes", "", "", "The user who acted. Empty when sign-in failed before a user was known."),
            ("actor_type", "text", "No", "", "One of `user`, `api_key`, `service`, `system`", "What kind of caller acted."),
            ("action", "text", "No", "", "For login: `auth.signup`, `auth.signin`, `auth.signout`, `auth.signin_failed`, `auth.sessions_revoked`", "What happened."),
            ("target_type", "text", "Yes", "", "", "The kind of thing acted on, for example `session`."),
            ("target_id", "uuid", "Yes", "", "", "Its ID."),
            ("metadata", "jsonb", "No", "'{}'", "Allow-listed keys only: `reason`, `mode`, `count`. Never tokens, codes, passwords or email addresses", "Small extra facts about the event."),
            ("request_id", "text", "Yes", "", "", "The request that caused it, to trace across services."),
            ("created_at", "timestamptz", "No", "now()", "", "When it happened."),
        ],
        "constraints": [
            "`audit_events_pkey`: primary key (`id`)",
            "`audit_events_actor_type_check`: `actor_type in ('user','api_key','service','system')`",
            "The service's database login has `INSERT` and `SELECT` only on this table: no `UPDATE`, no `DELETE`",
            "`audit_events_actor_idx`: index on (`actor_id`, `created_at` desc)",
        ],
        "sample_cols": ["id", "actor_id", "actor_type", "action", "target_type", "target_id", "metadata", "created_at"],
        "sample_rows": [
            [A1, U1, "user", "auth.signup", "user", U1, "{}", "2026-11-16 09:14:07+00"],
            [A2, U1, "user", "auth.signin", "session", S1, '{"mode":"signup"}', "2026-11-16 09:14:07+00"],
            [A3, "(empty)", "system", "auth.signin_failed", "(empty)", "(empty)", '{"reason":"login_state_mismatch"}', "2026-11-16 11:40:52+00"],
        ],
    },
]

OTHER_TABLES = "The service template also gives Identity `idempotency_keys` and `outbound_events`. Login does not use them: its endpoints are redirects and reads, and the only event Identity announces (`identity.user.deleted`) belongs to Account management."

RULES = {
    "API level: checked on every request before anything is stored": [
        "`mode` must be `signin` or `signup`.",
        "`return_to` must be a path on 01scale.com (starts with one `/`, not `//`, at most 512 characters).",
        "`state` and `nonce` must match the values in the login cookie, compared in constant time.",
        "The email from Cognito must be verified and at most 254 characters.",
        "The login cookie must be present and less than 10 minutes old.",
        "`session_token` must be exactly 43 base64url characters.",
        "`POST /auth/logout` must carry an `Origin` header from 01scale.com.",
        "`POST /token` must carry the gateway's service key.",
        "Rate limits at the gateway: 20 a minute per IP on `/auth/login` and `/auth/callback`; 120 a minute per session on `/session`.",
        "Every error uses the same shape, `application/problem+json`, with a stable `code`.",
    ],
    "Schema level: enforced by the database, whatever the code does": [
        "Primary keys on every table; `cognito_sub`, `lower(email)` and `token_hash` are unique.",
        "A session cannot exist without its user (foreign key), and is deleted with the user.",
        "`token_hash` must be 64 hex characters; `expires_at` must be after `created_at`.",
        "`email` must be lower-case, contain `@`, and be 3 to 254 characters, the longest address a mail server accepts.",
        "Only one signing key can be active; a stored public key can never contain private material.",
        "Audit events can be added and read but never changed or deleted.",
        "Identity's database login can reach only the `identity` schema. No other service can read these tables.",
    ],
    "Data model level: business rules the service guarantees": [
        "A user exists only for a verified email. Unverified sign-ins create nothing.",
        "One person is one user: matched by Cognito's permanent ID, never by email alone.",
        "A session is valid only if it is not revoked and not past `expires_at`. Both are checked on every use.",
        "Session lifetime is 7 days and is not extended by use (sliding expiry arrives in version 2).",
        "Access tokens live 5 minutes and are never stored. Signing out stops new tokens at once; an already-issued token works for at most 5 more minutes.",
        "Only hashes of session tokens are stored. Cognito's tokens and the user's password are never stored at all.",
        "After a password reset, all of that user's older sessions are revoked at the next sign-in.",
        "Unknown, expired and revoked sessions all get the same `401`, so an attacker learns nothing.",
        "Every sign-up, sign-in, sign-out and failed sign-in writes an audit event in the same transaction as the change.",
    ],
}

ENV = [
    ("COGNITO_ISSUER", "`https://cognito-idp.us-east-1.amazonaws.com/<user pool ID>`", "No"),
    ("COGNITO_DOMAIN", "`https://<prefix>.auth.us-east-1.amazoncognito.com`", "No"),
    ("COGNITO_CLIENT_ID", "The app client's ID", "No"),
    ("COGNITO_CLIENT_SECRET", "The app client's secret", "Yes"),
    ("APP_BASE_URL", "`https://01scale.com`", "No"),
    ("IDENTITY_DATABASE_URL", "Neon connection string for the `identity` role", "Yes"),
    ("LOGIN_COOKIE_KEY", "32 random bytes, base64: encrypts the login cookie", "Yes"),
    ("SIGNING_KEY_ENCRYPTION_KEY", "32 random bytes, base64: encrypts stored private keys", "Yes"),
    ("GATEWAY_SERVICE_KEY", "32 random bytes, base64: shared with the gateway only", "Yes"),
]

QUICKSTART = [
    {
        "title": "Send the user to sign in",
        "text": "Use a plain link. Set `return_to` to the page they should land on.",
        "lang": "html",
        "code": '<a href="/api/identity/v1/auth/login?mode=signin&return_to=/documents">Sign in</a>\n<a href="/api/identity/v1/auth/login?mode=signup&return_to=/documents">Create account</a>',
    },
    {
        "title": "Find out who is signed in",
        "text": "From the browser, the cookie is sent automatically. A `401` means nobody is signed in.",
        "lang": "ts",
        "code": 'const res = await fetch("/api/identity/v1/session");\nif (res.status === 401) {\n  // show the Sign in link\n} else {\n  const { user } = await res.json();\n  console.log(user.email); // "priya@example.com"\n}',
    },
    {
        "title": "Trust the caller inside a service",
        "text": "The gateway has already attached an access token. Verify it with Identity's public keys; do not call Identity.",
        "lang": "ts",
        "code": 'import { createRemoteJWKSet, jwtVerify } from "jose";\n\nconst keys = createRemoteJWKSet(\n  new URL("https://01scale.com/api/identity/v1/jwks"),\n);\n\nexport async function requireUser(request: Request) {\n  const token = request.headers.get("authorization")?.replace("Bearer ", "");\n  if (!token) throw new Response(null, { status: 401 });\n  const { payload } = await jwtVerify(token, keys, {\n    issuer: "https://01scale.com/api/identity/v1",\n    audience: "01scale",\n  });\n  return { userId: payload.sub as string, isAdmin: payload.is_admin === true };\n}',
    },
    {
        "title": "Sign out",
        "text": "End the 01scale session, then follow `logout_url` so Cognito's session ends too.",
        "lang": "ts",
        "code": 'const res = await fetch("/api/identity/v1/auth/logout", { method: "POST" });\nconst { logout_url } = await res.json();\nwindow.location.href = logout_url;',
    },
]

OPEN_QUESTIONS = [
    "Rate limit numbers are starting values to be tuned once there is real traffic.",
]

# Decisions I took on questions the first draft left open.
DECISIONS = [
    ("Failed sign-in in a browser", "A browser is sent to a friendly page that explains the problem and offers one button to start again. Apps and AI agents still get the error with its code."),
    ("Session length", "7 days from sign-in, not extended by use."),
    ("Several ways to sign in for one person", "Version 1 keeps one Cognito ID on the user. A separate table of logins arrives with Sign in with Google (`MVP1-E1-08`), which moves the data then."),
    ("An email longer than 254 characters", "Sign-in checks it before saving and returns the error `email_not_supported`, instead of failing on the database's own check."),
]


# ------------------------------------------------------------------ markdown
def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|").replace("\n", " ") for c in r) + " |")
    return "\n".join(out)


def is_json(s):
    return s.lstrip().startswith("{")


os.makedirs("docs/services/identity", exist_ok=True)
HEAD = f"> **{OVERVIEW['version']}.** Status: {OVERVIEW['status'].lower()}. Stories: " + ", ".join(f"`{s}`" for s in OVERVIEW["stories"]) + ".\n"

readme = f"""# Identity service — developer guide

{HEAD}
This guide covers **login only**, as it works in version 1 with AWS Cognito. The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md), and the [AWS setup](../../infra/cognito.md). The same content is on the site at `/products/login-using-aws/readme`.

## What this service is

{chr(10).join(chr(10) + p for p in OVERVIEW['what']).strip()}

## Why it exists

{table(['Reason', 'In plain terms'], OVERVIEW['why'])}

## What is in this version

**In scope**

{chr(10).join('- ' + x for x in OVERVIEW['scope_in'])}

**Not in this guide**

{chr(10).join('- ' + x for x in OVERVIEW['scope_out'])}

## How login works

```mermaid
sequenceDiagram
  participant B as Browser
  participant I as Identity
  participant C as AWS Cognito
  participant G as Gateway
  participant S as Any service
  B->>I: GET /auth/login
  I-->>B: 302 to Cognito (+ login cookie)
  B->>C: sign up or sign in on the hosted page
  C-->>B: 302 to /auth/callback?code&state
  B->>I: GET /auth/callback
  I->>C: exchange code (with PKCE verifier)
  C-->>I: ID token
  I-->>B: 302 to return_to (+ session cookie)
  B->>G: any API request (session cookie)
  G->>I: POST /token
  I-->>G: access token (5 minutes)
  G->>S: request + access token
  S->>S: verify with public keys from /jwks
```

{table(['Step', 'Who', 'What happens'], [(i + 1, who, what) for i, (who, what) in enumerate(FLOW)])}

## Words used in this guide

{table(['Term', 'Meaning'], CONCEPTS)}

## Quick start

These examples work once the service is built and deployed behind the gateway.

""" + "\n".join(f"### {i + 1}. {q['title']}\n\n{q['text']}\n\n```{q['lang']}\n{q['code']}\n```\n" for i, q in enumerate(QUICKSTART)) + f"""
## Endpoints at a glance

Base address: `https://01scale.com{BASE}`

{table(['Method', 'Path', 'Access', 'Purpose'], [(f"`{e['method']}`", f"`{e['path'].replace(BASE, '')}`", e['access'], e['title']) for e in ENDPOINTS])}

## Configuration

Set as environment variables on the Identity service's own Vercel project. Secrets are never committed.

{table(['Variable', 'Value', 'Secret'], [(f'`{n}`', v, s) for n, v, s in ENV])}

## Decisions

{table(['Question', 'What I decided'], DECISIONS)}

## Open questions

{chr(10).join('- ' + q for q in OPEN_QUESTIONS)}
"""
open("docs/services/identity/README.md", "w").write(readme)

spec = [f"# Identity service — API specification\n\n{HEAD}\nLogin endpoints only. Base address: `https://01scale.com{BASE}`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).\n"]
spec.append("## Conventions\n\n" + table(["Topic", "Rule"], [
    ("Format", "JSON responses, `snake_case` names, ISO 8601 UTC timestamps."),
    ("Errors", "`application/problem+json` with `type`, `title`, `status`, `detail`, `code` and `request_id`. Branch on `code`, never on the text."),
    ("Access: Public", "No credentials needed."),
    ("Access: Signed in", "The `__Host-01s_session` cookie."),
    ("Access: Service", "The gateway's service key. Not reachable from a browser."),
    ("Tracing", "Every response carries `X-Request-Id`."),
]) + "\n\nSample error:\n\n```json\n" + ERROR_SAMPLE + "\n```\n")
spec.append("## Cookies\n\n" + table(["Cookie", "Holds", "Lifetime", "Attributes"], COOKIES) + "\n")
spec.append("## Access token\n\nA JWT signed with ES256. The header carries `kid`, the name of the signing key.\n\n" + table(["Claim", "Example", "Meaning"], CLAIMS) + "\n")
spec.append("## Endpoints\n")
for e in ENDPOINTS:
    s = [f"### {e['method']} {e['path'].replace(BASE, '')}\n", f"**{e['title']}.** {e['summary']}\n", f"Access: **{e['access']}** · Story: `{e['story']}`\n"]
    if e["params"]:
        s.append("**Inputs**\n\n" + table(["Name", "In", "Type", "Required", "Constraints", "Meaning"], [(f"`{p[0]}`", *p[1:]) for p in e["params"]]) + "\n")
    else:
        s.append("**Inputs:** none.\n")
    s.append("**Behaviour**\n\n" + "\n".join(f"- {b}" for b in e["behaviour"]) + "\n")
    s.append("**Responses**\n\n" + table(["Status", "When", "Body or headers"], [(f"`{a}`", b, c) for a, b, c in e["responses"]]) + "\n")
    if e["errors"]:
        s.append("**Errors**\n\n" + table(["Status", "Code", "When"], [(f"`{a}`", b, c) for a, b, c in e["errors"]]) + "\n")
    s.append("**Sample request**\n\n```http\n" + e["request"] + "\n```\n")
    s.append("**Sample response**\n\n```" + ("json" if is_json(e["response"]) else "http") + "\n" + e["response"] + "\n```\n")
    spec.append("\n".join(s))
spec.append("## Behaviour with no endpoint of its own\n\n" + table(["Topic", "How it works"], NO_ENDPOINT) + "\n")
spec.append("## Constraints at the API level\n\n" + "\n".join(f"- {r}" for r in list(RULES.values())[0]) + "\n")
open("docs/services/identity/API-SPEC.md", "w").write("\n".join(spec))

dm = [f"# Identity service — data model\n\n{HEAD}\nOnly the tables login uses, all in the `identity` schema. No other service can read them; other services refer to a user by `id` only. Shared database rules are in [`docs/architecture/DATABASE-DESIGN.md`](../../architecture/DATABASE-DESIGN.md).\n"]
dm.append("""## Diagram

```mermaid
erDiagram
  users ||--o{ sessions : "has"
  users {
    uuid id PK
    text cognito_sub UK
    text email UK
    timestamptz email_verified_at
    boolean is_admin
    timestamptz created_at
  }
  sessions {
    uuid id PK
    uuid user_id FK
    text token_hash UK
    timestamptz created_at
    timestamptz expires_at
    timestamptz revoked_at
  }
  signing_keys {
    text kid PK
    jsonb public_jwk
    text private_key_encrypted
    timestamptz created_at
    timestamptz retired_at
  }
  audit_events {
    uuid id PK
    uuid actor_id
    text actor_type
    text action
    jsonb metadata
    timestamptz created_at
  }
```
""")
for t in TABLES:
    dm.append(f"## `{t['name']}`\n\n{t['purpose']}\n\n**Fields**\n\n" + table(["Field", "Type", "Empty allowed", "Default", "Constraints", "What it means"], [(f"`{c[0]}`", f"`{c[1]}`", *c[2:]) for c in t["columns"]]) + "\n\n**Constraints and indexes**\n\n" + "\n".join(f"- {c}" for c in t["constraints"]) + "\n\n**Sample data**\n\n" + table([f"`{c}`" for c in t["sample_cols"]], [[f"`{v}`" if not str(v).startswith("(") else v for v in r] for r in t["sample_rows"]]) + "\n")
dm.append(f"## Other tables in this schema\n\n{OTHER_TABLES}\n")
for title, rules in list(RULES.items())[1:]:
    dm.append(f"## Constraints at the {title[0].lower() + title[1:]}\n\n" + "\n".join(f"- {r}" for r in rules) + "\n")
dm.append("## What is deliberately not stored\n\n- Passwords: they live only in Cognito.\n- Cognito's ID, access and refresh tokens: used once at the callback and discarded.\n- The session token itself: only its hash.\n- Access tokens: they are verified by signature, never looked up.\n")
open("docs/services/identity/DATA-MODEL.md", "w").write("\n".join(dm))

print("endpoints", len(ENDPOINTS), "tables", len(TABLES))
