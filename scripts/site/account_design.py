"""Design of Account management: Identity service, version 1, second part.

Data only: scripts/site/render.py turns MODULE into docs/services/identity/account/*.md
and app/products/account.ts. Run `npm run site:data` after any change.
Stories: MVP1-E1-05 (account page) and MVP1-E0-06 (API keys for agents).
Builds on Login using AWS (docs/services/identity): same service, same schema.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "account"
COMPLETE = True

BASE = "/api/identity/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
K1 = "0193b200-1a2b-7c3d-8e4f-5a6b7c8d9e0f"
K2 = "0193b201-2b3c-7d4e-8f5a-6b7c8d9e0f1a"
H = "Host: 01scale.com\nCookie: __Host-01s_session=<session token>\nOrigin: https://01scale.com"
SCOPES = ["upload:read", "upload:write", "extraction:read", "extraction:write", "review:read", "review:write",
          "payment:read", "delivery:read", "docflow:read", "docflow:write"]
SCOPE_TEXT = ", ".join(f"`{s}`" for s in SCOPES)
NOT_AUTH = error("401", "not_authenticated", "No valid session.")
SESSION_ONLY = error("403", "session_required", "Called with an API key. Only a person signed in with a browser can do this.")
KEY_SAMPLE = {"id": K1, "name": "Claude Desktop", "prefix": "sk_01s_Hq7vT2mX", "scopes": ["upload:write", "extraction:read", "docflow:read", "docflow:write"],
              "last_used_at": "2026-11-17T10:02:11Z", "expires_at": "2027-02-15T00:00:00Z", "created_at": "2026-11-17T09:40:00Z"}


def ep(id, method, path, access, story, title, summary, params, behaviour, responses, errors, req, resp):
    return endpoint(id, method, f"{BASE}{path}", access, story, title, summary, params, behaviour, responses, errors, req, resp)


ENDPOINTS = [
    ep("get-me", "GET", "/me", "Signed in", "MVP1-E1-05", "My account",
       "The signed-in person's email and when they joined.", [],
       ["Read only. Works with a session or an API key with any scope."],
       [response("200", "Always", "`id`, `email`, `created_at`.")], [NOT_AUTH],
       f"GET {BASE}/me HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
       json.dumps({"id": U1, "email": "priya@example.com", "created_at": "2026-11-12T08:01:44Z"}, indent=2)),
    ep("start-password-change", "POST", "/me/password-change", "Signed in", "MVP1-E1-05", "Start a password change",
       "Sends the person to Cognito's hosted page to set a new password, and back to the account page afterwards.", [],
       ["Session only.", "Starts a login exactly as `GET /auth/login` does (state, nonce and PKCE in the login cookie), with `return_to` = `/account?password_changed=1`.",
        "Returns the address of Cognito's hosted forgot-password page for this app. The person receives a code by email, sets a new password, then signs in.",
        "On that sign-in, Login's callback revokes every older session (as for a reset, `MVP1-E1-04`) and records `auth.password_changed`."],
       [response("200", "Always", "`redirect_url`, and the login cookie is set.")], [SESSION_ONLY, NOT_AUTH],
       f"POST {BASE}/me/password-change HTTP/1.1\n{H}",
       json.dumps({"redirect_url": "https://01scale-prod.auth.us-east-1.amazoncognito.com/forgotPassword?client_id=…&response_type=code&scope=openid+email&redirect_uri=https%3A%2F%2F01scale.com%2Fapi%2Fidentity%2Fv1%2Fauth%2Fcallback&state=…"}, indent=2)),
    ep("delete-me", "DELETE", "/me", "Signed in", "MVP1-E1-05", "Delete my account",
       "Deletes the person's account; every service then deletes that person's data.",
       [param("confirm", "body", "string", "Yes", "Exactly `DELETE`.", "The person typed DELETE to confirm.")],
       ["Session only, with an `Origin` from 01scale.com.",
        "Deletes the user in Cognito (`AdminDeleteUser`). If Cognito cannot be reached, answers `503` and nothing changes. A user Cognito no longer has counts as deleted, so a retry is safe.",
        "Then, in one database transaction: deletes the `identity.users` row (its sessions and API keys go with it), records `auth.account_deleted` with the user's ID and no email, and writes one `identity.user.deleted` event per subscribing service to the outbox.",
        "Clears the session cookie. Each service deletes, or for Payment anonymizes, its own rows for that `owner_id` when the event arrives."],
       [response("202", "Deletion accepted", "`logout_url` (Cognito's logout address, to end its own session); the session cookie is cleared.")],
       [error("422", "confirmation_mismatch", "`confirm` is not exactly `DELETE`."), SESSION_ONLY, error("503", "dependency_unavailable", "Cognito could not be reached. Nothing was deleted; safe to retry."), NOT_AUTH],
       f"DELETE {BASE}/me HTTP/1.1\n{H}\nContent-Type: application/json\n\n" + json.dumps({"confirm": "DELETE"}, indent=2),
       json.dumps({"logout_url": "https://01scale-prod.auth.us-east-1.amazoncognito.com/logout?client_id=…&logout_uri=https%3A%2F%2F01scale.com%2F"}, indent=2)),
    ep("list-api-keys", "GET", "/api-keys", "Signed in", "MVP1-E0-06", "List my API keys",
       "The person's keys with name, prefix, scopes and when each was last used. Never the secret.", [],
       ["Session only. Revoked keys are not listed; expired keys are listed as expired."],
       [response("200", "Always", "`data[]` of API keys.")], [SESSION_ONLY, NOT_AUTH],
       f"GET {BASE}/api-keys HTTP/1.1\n{H}", json.dumps({"data": [KEY_SAMPLE]}, indent=2)),
    ep("create-api-key", "POST", "/api-keys", "Signed in", "MVP1-E0-06", "Create an API key",
       "A key an agent or script uses instead of a browser. The secret is shown once.",
       [param("name", "body", "string", "Yes", "1 to 100 characters.", "What the key is for, such as 'Claude Desktop'."),
        param("scopes", "body", "string[]", "Yes", f"1 or more of: {SCOPE_TEXT}. No duplicates.", "What the key may do."),
        param("expires_at", "body", "date-time", "No", "In the future, at most 1 year away. Default: 90 days.", "When it stops working."),
        param("Idempotency-Key", "header", "string", "No", "1 to 255 characters.", "A retry returns the same key, without the secret, instead of making a second one.")],
       ["Session only: a key cannot create keys.", "At most 10 active keys per person.",
        "Generates 32 random bytes; the secret is `sk_01s_` followed by 43 base64url characters. Stores only its SHA-256 hash and the first 8 characters after `sk_01s_`.",
        "Records `auth.api_key_created` with the key's ID, name and scopes."],
       [response("201", "Created", "`api_key` and `secret` (shown this once).")],
       [error("422", "validation_failed", "A name, scope or expiry is not allowed; `errors[]` says which."), error("409", "too_many_keys", "10 keys are already active."), SESSION_ONLY, NOT_AUTH],
       f"POST {BASE}/api-keys HTTP/1.1\n{H}\nContent-Type: application/json\nIdempotency-Key: 6f1c2a9e-key-create\n\n" + json.dumps({"name": "Claude Desktop", "scopes": KEY_SAMPLE["scopes"], "expires_at": "2027-02-15T00:00:00Z"}, indent=2),
       json.dumps({"api_key": {**KEY_SAMPLE, "last_used_at": None}, "secret": "sk_01s_Hq7vT2mX…(43 characters in all after sk_01s_)"}, indent=2)),
    ep("revoke-api-key", "DELETE", "/api-keys/{keyId}", "Signed in", "MVP1-E0-06", "Revoke an API key",
       "Stops a key working at once.",
       [param("keyId", "path", "uuid", "Yes", "A key of the caller's.", "The key.")],
       ["Session only.", "Sets `revoked_at`; the next exchange of that key fails. An access token already issued from it lasts at most 5 more minutes.", "Records `auth.api_key_revoked`. Revoking an already revoked key answers `204` again."],
       [response("204", "Revoked", "No body.")], [error("404", "api_key_not_found", "No such key, or it belongs to someone else."), SESSION_ONLY, NOT_AUTH],
       f"DELETE {BASE}/api-keys/{K1} HTTP/1.1\n{H}", "HTTP/1.1 204 No Content"),
    ep("exchange-api-key", "POST", "/token", "Service", "MVP1-E0-06", "Exchange an API key for an access token",
       "Login's `POST /token`, extended: the gateway sends either a session token or an API key.",
       [param("Authorization", "header", "string", "Yes", "`Bearer <gateway service key>`.", "Proves the caller is the gateway."),
        param("api_key", "body", "string", "One of", "`sk_01s_` and 43 base64url characters. Sent instead of `session_token`.", "The key from the agent's `Authorization` header.")],
       ["Hashes the key and finds it; it must not be revoked or expired.", "Signs an access token with `auth: api_key`, `akid` (the key's ID) and the key's `scopes`, never `*`.", "Updates `last_used_at` at most once a minute per key."],
       [response("200", "The key is valid", "`access_token`, `token_type`, `expires_in` (300).")],
       [error("401", "invalid_api_key", "The key is unknown, revoked or expired. The same answer in every case."), error("401", "invalid_service_credential", "The caller is not the gateway.")],
       f"POST {BASE}/token HTTP/1.1\nAuthorization: Bearer <gateway service key>\nContent-Type: application/json\n\n" + json.dumps({"api_key": "sk_01s_…"}, indent=2),
       json.dumps({"access_token": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0…", "token_type": "Bearer", "expires_in": 300}, indent=2)),
    ep("get-user", "GET", "/users/{userId}", "Service", "MVP1-E7-01", "Look up a user's email",
       "For services that write to a person, such as Delivery's emails. New: no story lists it yet.",
       [param("userId", "path", "uuid", "Yes", "", "The user."), param("Authorization", "header", "string", "Yes", "A service access token with the scope `identity:users.read`.", "Only services may call it.")],
       ["Read only. Records nothing: the calling service audits its own use.", "The caller gets its service token by signing in as a client (Service access, `docs/services/identity/service-access`)."],
       [response("200", "The user exists", "`id`, `email`.")],
       [error("404", "user_not_found", "No such user, including a deleted one."), error("403", "insufficient_scope", "The caller's token lacks `identity:users.read`.")],
       f"GET {BASE}/users/{U1} HTTP/1.1\nAuthorization: Bearer <service access token>",
       json.dumps({"id": U1, "email": "priya@example.com"}, indent=2)),
]

SCOPE_OVERRIDES = {
    "get-me": "Any: a session, an API key or a delegated token",
    "start-password-change": "Session only: refused for API keys and service tokens",
    "delete-me": "Session only: refused for API keys and service tokens",
    "list-api-keys": "Session only: refused for API keys and service tokens",
    "create-api-key": "Session only: refused for API keys and service tokens",
    "revoke-api-key": "Session only: refused for API keys and service tokens",
    "exchange-api-key": "None: the gateway's service credential",
    "get-user": "`identity:users.read`, on a service token",
}
for _e in ENDPOINTS:
    if _e["id"] in SCOPE_OVERRIDES:
        _e["scope"] = SCOPE_OVERRIDES[_e["id"]]

NO_ENDPOINT = [
    {"topic": "The account page (MVP1-E1-05)", "how": "Composed by the DocFlow app at `/account`: Identity's `AccountDetails`, `PasswordChangeButton`, `DeleteAccountDialog` and `ApiKeysManager`, DocFlow's documents count (`GET /api/docflow/v1/stats`) and Payment's orders (`GET /api/payment/v1/orders`)."},
    {"topic": "Using a key (MVP1-E0-06 AC2)", "how": "The agent sends `Authorization: Bearer sk_01s_…` to the gateway, which exchanges it at `POST /token` and forwards the access token. Each service checks the token's `scopes` against the operation."},
    {"topic": "What a key can never do", "how": "Every endpoint on this page except `GET /me` requires `auth: session`, so a key cannot manage keys, change the password or delete the account. Payment's checkout gives an agent a `checkout_url` that a person must open (AC5)."},
    {"topic": "MCP (MVP1-E0-06 AC3)", "how": "Identity's MCP server at `POST /api/identity/mcp` exposes `getMe` only; the session-only operations are not tools."},
    {"topic": "Audit (MVP1-E0-06 AC4)", "how": "Every service records `actor_type: api_key` and the `akid` claim for calls made with a key's token."},
    {"topic": "Event `identity.user.deleted`", "how": "Sent through the outbox to Upload, Extraction, Review, Payment, Delivery and DocFlow: `{event_id, type, occurred_at, data: {user_id}}`, HMAC-signed, retried with backoff."},
]

CLAIMS = [
    {"claim": "`auth`", "example": "`api_key`", "meaning": "How the caller authenticated: `session` or `api_key`."},
    {"claim": "`akid`", "example": f"`{K1}`", "meaning": "The API key's ID, only when `auth` is `api_key`. Services write it to their audit events."},
    {"claim": "`scopes`", "example": '`["upload:write", "docflow:read"]`', "meaning": "The key's scopes. A browser session has `[\"*\"]`."},
]

API_KEYS = {"name": "identity.api_keys", "purpose": "One row per API key a person created for an agent or script.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The key's ID; appears in access tokens as `akid` and in audit events."),
    column("user_id", "uuid", "No", "", "Foreign key to `identity.users`, delete cascades", "Whose key it is."),
    column("name", "text", "No", "", "1 to 100 characters", "What the key is for, chosen by the person."),
    column("prefix", "text", "No", "", "8 base64url characters", "The first 8 characters after `sk_01s_`, so the person can recognise the key in the list."),
    column("key_hash", "text", "No", "", "64 hex characters; unique", "SHA-256 of the whole secret. A 256-bit random secret needs no slow hash: it cannot be guessed."),
    column("scopes", "text[]", "No", "", "1 or more, each from the allowed list", "What the key may do."),
    column("last_used_at", "timestamptz", "Yes", "", "", "Last exchange, updated at most once a minute."),
    column("expires_at", "timestamptz", "No", "", "After `created_at`, at most 1 year later", "When it stops working."),
    column("revoked_at", "timestamptz", "Yes", "", "Not before `created_at`", "When the person revoked it."),
    column("created_at", "timestamptz", "No", "now()", "", "When it was created."),
], "constraints": [
    "`api_keys_pkey`: primary key (`id`)",
    "`api_keys_user_id_fkey`: foreign key to `identity.users`, delete cascades",
    "`api_keys_key_hash_key`: unique (`key_hash`)",
    "`api_keys_name_check`, `api_keys_prefix_check`, `api_keys_key_hash_check`: lengths and formats",
    "`api_keys_scopes_check`: at least one scope, each from the allowed list",
    "`api_keys_dates_check`: expiry after creation and within a year; revocation not before creation",
    "`api_keys_user_id_idx`: index on (`user_id`, `created_at` desc), for the list and the 10-key limit",
], "sampleCols": ["id", "user_id", "name", "prefix", "key_hash", "scopes", "last_used_at", "expires_at", "revoked_at", "created_at"],
   "sampleRows": [[K1, U1, "Claude Desktop", "Hq7vT2mX", "3b9f0c2d7e41a8c56f0e9d2b4a7c1e8f3d6b9a0c2e5f8a1b4c7d0e3f6a9b2c5d", "{upload:write,extraction:read,docflow:read,docflow:write}", "2026-11-17 10:02:11+00", "2027-02-15 00:00:00+00", "(empty)", "2026-11-17 09:40:00+00"],
                  [K2, U1, "Old script", "pL4kZ9wE", "7e2a5c8f1b4d7a0e3c6f9b2d5a8e1c4f7b0d3a6e9c2f5b8d1a4e7c0f3b6d9a2c", "{docflow:read}", "(empty)", "2027-01-01 00:00:00+00", "2026-11-17 09:55:00+00", "2026-11-14 12:00:00+00"]]}

SCOPE_SQL = ", ".join(f"'{s}'" for s in SCOPES)
DDL = f"""-- Identity service, version 1, Account management. Schema: identity.
-- Loaded after Login's schema (docs/services/identity/schema.sql), which creates identity.users.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create table identity.api_keys (
  id           uuid        primary key,
  user_id      uuid        not null,
  name         text        not null,
  prefix       text        not null,
  key_hash     text        not null,
  scopes       text[]      not null,
  last_used_at timestamptz,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),

  constraint api_keys_user_id_fkey foreign key (user_id)
    references identity.users (id) on delete cascade,
  constraint api_keys_key_hash_key unique (key_hash),
  constraint api_keys_name_check check (length(name) between 1 and 100),
  constraint api_keys_prefix_check check (prefix ~ '^[A-Za-z0-9_-]{{8}}$'),
  constraint api_keys_key_hash_check check (key_hash ~ '^[0-9a-f]{{64}}$'),
  constraint api_keys_scopes_check check (
    cardinality(scopes) >= 1
    and scopes <@ array[{SCOPE_SQL}]::text[]
  ),
  constraint api_keys_dates_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '1 year'
    and (revoked_at is null or revoked_at >= created_at)
  )
);

create index api_keys_user_id_idx on identity.api_keys (user_id, created_at desc);

grant select, insert, update, delete on identity.api_keys to identity_service;
"""

JOURNEYS = [
    journey("See my account", "A signed-in user", "Opens Account from the user menu.", ["MVP1-E1-05"], [
        ("Sees their email, the date they joined, how many documents they have processed, and their orders.", "The page reads Identity `GET /me`, DocFlow's totals and Payment's orders."),
    ], "Nothing changes."),
    journey("Change my password", "A signed-in user", "Taps Change password on the account page.", ["MVP1-E1-05"], [
        ("Taps Change password.", "Identity starts a login and returns the address of Cognito's page."),
        ("On Cognito's page (not ours): receives a code by email, enters it and a new password.", "Cognito changes the password."),
        ("Signs in with the new password on Cognito's page.", "Identity signs them in, revokes their older sessions and records `auth.password_changed`."),
        ("Lands on the account page with 'Your password was changed'.", "The page reads `password_changed=1`."),
    ], "Only this browser stays signed in."),
    journey("Delete my account", "A signed-in user", "Taps Delete account on the account page.", ["MVP1-E1-05"], [
        ("Reads what will be deleted (documents, results, keys) and what is kept anonymized (orders, for records).", "Nothing is sent yet."),
        ("Types DELETE; the button becomes active; taps it.", "Identity deletes the Cognito user, then the account, and tells every service."),
        ("Lands on the home page, signed out, with 'Your account was deleted'.", "Each service deletes or anonymizes that person's data as the event arrives."),
    ], "The account is gone and cannot sign in. Signing up again with the same email creates a new, empty account."),
    journey("Give an agent access", "A user who uses an AI agent", "Opens API keys on the account page.", ["MVP1-E0-06"], [
        ("Taps New key, names it, picks what it may do and when it expires.", "Nothing is sent until they confirm."),
        ("Taps Create; sees the secret once, with Copy and 'You won't see this again'.", "Identity stores only the key's hash and records `auth.api_key_created`."),
        ("Pastes the key into the agent's settings.", "The agent's calls go through the gateway, which exchanges the key for a 5-minute token."),
        ("Later sees 'Last used 2 minutes ago' beside the key.", "Identity updates the key's last use at most once a minute."),
    ], "The agent can do what the scopes allow and nothing else; paying still needs the person."),
    journey("Revoke a key", "A user", "Taps Revoke beside a key.", ["MVP1-E0-06"], [
        ("Confirms Revoke.", "Identity revokes the key and records `auth.api_key_revoked`."),
        ("The key leaves the list.", "The agent's next call fails with `invalid_api_key` within 5 minutes."),
    ], "The key never works again."),
]

EDGE_CASES = [
    {"situation": "Types something other than DELETE", "sees": "The button stays inactive; if sent anyway, 'Type DELETE to confirm.'", "code": "`confirmation_mismatch`"},
    {"situation": "Cognito is down while deleting", "sees": "'We couldn't delete your account right now. Nothing was deleted. Try again in a moment.'", "code": "`dependency_unavailable`"},
    {"situation": "An agent tries to create a key, change the password or delete the account", "sees": "The agent is told a person must do this in a browser.", "code": "`session_required`"},
    {"situation": "Already has 10 keys", "sees": "'You have 10 keys. Revoke one to create another.'", "code": "`too_many_keys`"},
    {"situation": "Leaves the name empty or picks no scope", "sees": "The field is marked with what to fix.", "code": "`validation_failed`"},
    {"situation": "Closes the dialog before copying the secret", "sees": "The key is listed, but the secret cannot be shown again: revoke it and create another.", "code": "None"},
    {"situation": "An agent uses a revoked or expired key", "sees": "The agent is told the key is not valid.", "code": "`invalid_api_key`"},
    {"situation": "Opens the account page after the session ended", "sees": "Sign-in, then back to the account page.", "code": "`not_authenticated`"},
]

COMPONENTS = [
    component("AccountDetails", "Component", "The person's email and the date they joined.", [], ["Loading (fixed-height placeholder)", "Shown", "Failed: Retry"], ["`GET /me`"]),
    component("PasswordChangeButton", "Component", "Change password, and the success message on return.",
              [("changed", "boolean, optional", "Show 'Your password was changed'; the page sets it from `password_changed=1`.")], ["Default", "Working", "Changed", "Failed: Retry"], ["`POST /me/password-change`"]),
    component("DeleteAccountDialog", "Component", "Explains what is deleted and kept, and asks the person to type DELETE.",
              [("onDeleted", "function, optional", "Default: go to the home page with 'Your account was deleted'.")],
              ["Closed", "Open, button inactive", "Open, DELETE typed", "Working", "Failed: message and Try again"], ["`DELETE /me`"]),
    component("ApiKeysManager", "Component", "Lists keys and creates and revokes them; shows a new secret once with Copy.",
              [("scopes", "string[], optional", "Which scopes to offer. Default: all.")],
              ["Loading", "Empty: 'No keys yet' and what keys are for", "Listed", "Creating", "Secret shown once", "Revoking", "Limit reached", "Failed: Retry"],
              ["`GET /api-keys`", "`POST /api-keys`", "`DELETE /api-keys/{keyId}`"]),
]

MODULE = {
    "slug": "account-management",
    "docsPath": "docs/services/identity/account",
    "extraDocs": [],
    "labels": {"flow": "How it works", "hosted": "Pages provided by an outside service"},
    "notes": {"journey": "What a person sees on the account page, and how they let an agent act for them.",
              "ui": "Identity's account components, in the package `packages/ui-identity` with Login's. Any app can place them on its account page.",
              "hosted": "In this version, setting a new password happens on Cognito's hosted page.", "token": "Claims added to Login's access token when the caller used an API key.",
              "schema": "The SQL for Account management, added to the `identity` schema after Login's tables."},
    "overview": {
        "name": "Account management", "version": "Version 1 · Identity, second part", "status": "Designed, not built", "base": BASE,
        "what": [
            "Account management lets a person see their account, change their password, delete their account, and give AI agents their own keys to act for them.",
            "It is the second part of the Identity service, after Login. It adds one table (API keys), the endpoint that announces a deleted account to every other service, and the lookup Delivery uses to find a person's email.",
        ],
        "why": [
            {"title": "People own their data", "text": "Deleting an account really deletes it, everywhere, and keeps only anonymized orders for the accounts."},
            {"title": "Agents are first-class users", "text": "An agent gets its own key with narrow scopes, instead of a person's password or cookie, and every call it makes is audited as that key."},
            {"title": "A key can be cut off on its own", "text": "Revoking one agent's key leaves the person and their other agents signed in."},
            {"title": "Dangerous actions keep a person in the loop", "text": "Only a browser session can create keys, change the password or delete the account; agents cannot pay."},
        ],
        "scope_in": ["`GET /me`, password change through Cognito, account deletion with `identity.user.deleted`", "API keys: create, list, revoke, scopes, expiry, exchange at the gateway", "A service lookup of a user's email for Delivery", "Components for any app's account page"],
        "scope_out": ["Changing the email address: not planned for MVP1", "OAuth for agents instead of keys: later, after MVP2", "A password change on our own page: `MVP2-E8`, when identity is built by hand", "Exporting my data: not planned"],
        "stories": ["MVP1-E1-05", "MVP1-E0-06"],
    },
    "flow": [
        {"who": "Browser", "what": "The account page shows Identity's components with DocFlow's totals and Payment's orders."},
        {"who": "This service", "what": "Change password: starts a login and sends the person to Cognito's page, which returns them to `/account`."},
        {"who": "This service", "what": "Delete: deletes the Cognito user, then the account, and puts `identity.user.deleted` in the outbox for every service."},
        {"who": "Other services", "what": "Delete or anonymize their own rows for that user when the event arrives."},
        {"who": "Browser", "what": "Creates an API key; the secret is shown once and only its hash is kept."},
        {"who": "Gateway", "what": "Exchanges an agent's key for a 5-minute access token carrying the key's scopes."},
    ],
    "concepts": [
        {"term": "API key", "meaning": "A secret starting `sk_01s_` that an agent sends instead of a cookie. Only its SHA-256 hash is stored."},
        {"term": "Scope", "meaning": "One thing a key may do, such as `upload:write`. A key has one or more."},
        {"term": "Session only", "meaning": "An endpoint that refuses API keys: managing keys, the password and the account."},
        {"term": "Outbox", "meaning": "Events are written in the same transaction as the change, then delivered, so `identity.user.deleted` is never lost."},
    ],
    "quickstart": [
        {"title": "Create a key", "text": "From the account page, or as a signed-in browser:", "lang": "bash",
         "code": "curl -X POST https://01scale.com/api/identity/v1/api-keys \\\n  -H 'Content-Type: application/json' -b cookies.txt \\\n  -d '{\"name\":\"Claude Desktop\",\"scopes\":[\"upload:write\",\"docflow:read\",\"docflow:write\"]}'"},
        {"title": "Use the key from an agent", "text": "Any endpoint the key's scopes allow:", "lang": "bash",
         "code": "curl https://01scale.com/api/docflow/v1/documents \\\n  -H \"Authorization: Bearer $ZEROONE_API_KEY\""},
        {"title": "Delete an account", "text": "Session only:", "lang": "bash",
         "code": "curl -X DELETE https://01scale.com/api/identity/v1/me \\\n  -H 'Content-Type: application/json' -H 'Origin: https://01scale.com' -b cookies.txt \\\n  -d '{\"confirm\":\"DELETE\"}'"},
    ],
    "env": [
        {"name": "COGNITO_USER_POOL_ID", "value": "From the Cognito setup, for `AdminDeleteUser`", "secret": "No"},
        {"name": "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY", "value": "An IAM user allowed only `cognito-idp:AdminDeleteUser` on the pool", "secret": "Yes"},
        {"name": "IDENTITY_EVENT_SUBSCRIBERS", "value": "The services' event addresses, comma-separated", "secret": "No"},
        {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64", "secret": "Yes"},
    ],
    "openQuestions": [
        "Decided by Nikhil on 20 Nov 2026 (#70): the password change goes through Cognito's forgot-password page (a code by email) in MVP1; our own screens come with MVP2 (`MVP2-E8-10`).",
        "Decided (#70): the column is `user_id`, as in `identity.sessions`; story `MVP1-E0-06` is updated.",
        "Decided (#70): the key prefix is the first 8 characters after `sk_01s_`, since every key starts with `sk_01s_`.",
        "Decided (#70): `GET /users/{userId}` is listed in `MVP1-E1-05` (Identity, which owns it) and `MVP1-E7-03` (Delivery, which calls it).",
        "Decided by Nikhil on 20 Nov 2026 (#70): in MVP1, deleting an account deletes it at once, as designed here. Deactivation with a 30-day restore window is MVP2 story `MVP2-E8-11`, and only Identity changes.",
        "API keys have no `payment:write` scope: only a person, through Stripe's page, completes a payment (`MVP1-E0-06` AC5).",
        "`docs/infra/cognito.md` needs a step for the IAM user that may call `AdminDeleteUser`.",
        "Starting limits: 10 active keys per person, 90-day default expiry, 1 year at most.",
    ],
    "errorSample": problem("session_required", "Session required", 403, "Only a person signed in with a browser can manage API keys."),
    "endpoints": ENDPOINTS,
    "noEndpoint": NO_ENDPOINT,
    "claims": CLAIMS,
    "tables": [API_KEYS],
    "entities": [
        {"name": "API key", "table": "`identity.api_keys`", "what": "A secret an agent uses to act for a person, within its scopes.", "relations": "Belongs to one user; deleted with the user."},
        {"name": "User (from Login)", "table": "`identity.users`", "what": "Deleted by `DELETE /me`.", "relations": "Its sessions and API keys are deleted with it; its audit events stay, with no foreign key."},
    ],
    "lifecycles": [
        {"name": "API key", "text": "Created by the person → used (last use recorded) → ends when revoked, when it expires, or when the account is deleted. Revoked and expired keys stay until the account is deleted, so audit events can name them."},
        {"name": "Account deletion", "text": "Cognito user deleted → user row deleted with its sessions and keys → `auth.account_deleted` kept without the email → `identity.user.deleted` sent to every service."},
    ],
    "otherTables": "Account management also writes to Login's `identity.audit_events` and to the template's `identity.outbound_events`.",
    "notStored": ["The API key secret: only its hash.", "The new password: it stays in Cognito.", "Anything about the person after deletion except audit events by ID."],
    "ddl": DDL,
    "queries": [
        {"title": "Exchange a key", "sql": "select id, user_id, scopes\nfrom identity.api_keys\nwhere key_hash = $1\n  and revoked_at is null\n  and expires_at > now();"},
        {"title": "Count active keys before creating one", "sql": "select count(*) from identity.api_keys\nwhere user_id = $1 and revoked_at is null and expires_at > now();"},
        {"title": "Delete an account", "sql": "delete from identity.users where id = $1;  -- sessions and api_keys cascade"},
    ],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "uiRules": ["Components call only Identity's API; the account page adds DocFlow's and Payment's components beside them.", "A secret is shown once, in a box with Copy, and never stored in the browser.", "Destructive buttons say exactly what they do and need a second step.", "Same accessibility and size rules as every 01scale page."],
    "components": COMPONENTS,
    "hostedPages": [{"page": "Cognito: forgot password", "what": "Sends a code by email and sets the new password, then shows Cognito's sign-in."}],
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "Managing keys, the password and the account needs a browser session (`auth: session`).", "`DELETE /me` needs `confirm: DELETE` and an `Origin` from 01scale.com.",
            "Scopes come from a fixed list; at most 10 active keys; expiry at most 1 year.", "`GET /users/{userId}` needs a service token with `identity:users.read`."]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": [
            "A key belongs to an existing user and is deleted with them.", "Each key hash is unique and 64 hex characters.", "Every scope is from the allowed list; expiry within a year of creation."]},
        {"level": "Data model level: business rules the service guarantees", "items": [
            "A key works only if not revoked and not expired.", "A key's access token never has more than the key's scopes.",
            "Deleting an account deletes the Cognito user first, so a failure leaves everything as it was.", "Every service learns of a deletion through the outbox, never by being called in turn."]},
    ],
}
