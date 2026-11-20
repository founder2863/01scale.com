"""Design of Service access: Identity service, version 1, third part.

How a platform service or an app proves who it is, and how it acts for a user
when no person is present (decision on issue #24, docs/decisions/MVP1-E1.md).
Data only: scripts/site/render.py turns MODULE into docs/services/identity/service-access/*.md.
No product page of its own (slug ""): it extends Login's `POST /token`.
Stories: MVP1-E1-03 (POST /token), MVP1-E0-07 (service template), MVP1-E0-09 (DocFlow).
"""
import json

from render import column, endpoint, error, journey, param, problem, response

KEY = "service_access"
COMPLETE = True

BASE = "/api/identity/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
TOKEN = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0…"
EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange"
SERVICES = ["identity", "upload", "extraction", "review", "payment", "delivery", "docflow"]

ENDPOINTS = [
    endpoint("service-token", "POST", f"{BASE}/token", "Public (client credentials)", "MVP1-E1-03", "Sign in as a service",
             "A service or app proves who it is with its client ID and secret, and gets a 5-minute service token.",
             [param("grant_type", "body", "string", "Yes", "`client_credentials`.", "Which kind of token."),
              param("client_id", "body", "string", "Yes", "A registered client's name, such as `docflow`.", "Who is asking."),
              param("client_secret", "body", "string", "Yes", "`cs_01s_` and 43 base64url characters. Compared by hash, in constant time.", "Proves it. Held only in the client's environment variables."),
              param("scope", "body", "string", "No", "Space-separated; each must be in the client's `scopes`. Default: all of them.", "What the token may do.")],
             ["Finds the client, checks it is not revoked, and compares the SHA-256 of the secret.",
              "Signs a token with `sub: service:<client_id>`, `auth: service`, `app: <client_id>` and the granted scopes. No `sid`, no `is_admin`.",
              "Failures are rate-limited (10 a minute per client ID) and recorded as `auth.client_signin_failed`; successes are not audited, as they happen every few minutes."],
             [response("200", "Valid client", "`access_token`, `token_type` (`Bearer`), `expires_in` (300), `scope`.")],
             [error("401", "invalid_client", "Unknown or revoked client, or wrong secret. The same answer in every case."),
              error("400", "invalid_scope", "A requested scope is not allowed for this client."),
              error("429", "rate_limited", "Too many failures; see `Retry-After`.")],
             f"POST {BASE}/token HTTP/1.1\nHost: 01scale.com\nContent-Type: application/json\n\n" + json.dumps({"grant_type": "client_credentials", "client_id": "delivery", "client_secret": "cs_01s_…", "scope": "identity:users.read"}, indent=2),
             json.dumps({"access_token": TOKEN, "token_type": "Bearer", "expires_in": 300, "scope": "identity:users.read"}, indent=2)),
    endpoint("delegated-token", "POST", f"{BASE}/token", "Service", "MVP1-E1-03", "Act for a user",
             "A service that may act for users exchanges its service token for a 5-minute token for one user, so the work it does with no person present is still that user's.",
             [param("Authorization", "header", "string", "Yes", "`Bearer <service token>`.", "The service asking."),
              param("grant_type", "body", "string", "Yes", f"`{EXCHANGE}`.", "Token exchange, as in RFC 8693."),
              param("on_behalf_of", "body", "uuid", "Yes", "An existing user.", "The user the work is for. RFC 8693 would send the user's own token; here the user may have no session, so the trusted service names them."),
              param("scope", "body", "string", "No", "Space-separated; each must be in the client's `act_scopes`. Default: all of them.", "What the token may do for that user.")],
             ["Checks the service token, and that its client may act for users (`act_scopes` is not empty).",
              "Checks the user exists. A deleted user answers `404`, so work for a deleted account stops.",
              "Signs a token with the user's `sub`, `auth: delegated`, `act: {\"sub\": \"service:<client_id>\"}`, `app` and the granted scopes. Never `*`, `is_admin`, or scopes for keys, passwords or accounts.",
              "Services treat it as that user's token, so their ownership checks apply unchanged, and record both the user and `act` in their audit events."],
             [response("200", "Allowed", "`access_token`, `token_type`, `expires_in` (300), `scope`, `issued_token_type` (`urn:ietf:params:oauth:token-type:access_token`).")],
             [error("401", "not_authenticated", "No valid service token."),
              error("403", "delegation_not_allowed", "This client may not act for users."),
              error("400", "invalid_scope", "A requested scope is not in the client's `act_scopes`."),
              error("404", "user_not_found", "No such user, including a deleted one.")],
             f"POST {BASE}/token HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <DocFlow service token>\nContent-Type: application/json\n\n" + json.dumps({"grant_type": EXCHANGE, "on_behalf_of": U1, "scope": "extraction:read review:write"}, indent=2),
             json.dumps({"access_token": TOKEN, "token_type": "Bearer", "expires_in": 300, "scope": "extraction:read review:write", "issued_token_type": "urn:ietf:params:oauth:token-type:access_token"}, indent=2)),
]

ENDPOINTS[0]["scope"] = "None: the client secret"
ENDPOINTS[1]["scope"] = "A service token from a client with `act_scopes`; grants a subset of them"

CLAIMS = [
    {"claim": "`auth`", "example": "`service` or `delegated`", "meaning": "Adds two values to Login's `session` and `api_key`: a service acting as itself, or acting for a user."},
    {"claim": "`sub`", "example": "`service:delivery`", "meaning": "For `auth: service`, the client. For `delegated`, the user, as in any user token."},
    {"claim": "`app`", "example": "`docflow`", "meaning": "The client that asked; present on `service` and `delegated` tokens. Payment and Delivery record it as the calling app."},
    {"claim": "`act`", "example": '`{"sub": "service:docflow"}`', "meaning": "Only on `delegated` tokens: who is acting for the user (RFC 8693 §4.1)."},
]

NO_ENDPOINT = [
    {"topic": "Checking a caller (service template)", "how": "`requireUser(scope)` accepts `session`, `api_key` and `delegated` tokens; `requireService(scope)` accepts only `auth: service`. A delegated token passes every ownership check for its user, and the service audits `actor_type: service` with the user as `actor_id` and `act.sub` in metadata."},
    {"topic": "Where the token comes from (service template)", "how": "`callService()` gets and caches a service token (until 30 seconds before expiry), and a delegated token per user when asked, then calls `https://01scale.com/api/…` through the gateway."},
    {"topic": "Through the gateway (decision on issue #21)", "how": "Service and delegated tokens are already access tokens: the gateway checks their signature and expiry and passes them on unchanged."},
    {"topic": "Registering clients", "how": "Clients are rows in `identity.service_clients`, added by a migration: there is no endpoint, so no caller can grant itself access. A new secret is generated outside the repository, set in the client's Vercel environment, and only its hash is put in the migration's input."},
]

CLIENTS = {"name": "identity.service_clients", "purpose": "One row per service or app allowed to get tokens, with what it may do as itself and for users.", "columns": [
    column("id", "text", "No", "", "Primary key. 1 to 50 lowercase letters, digits or hyphens", "The client's name, such as `docflow`; used as `client_id` and `app`."),
    column("secret_hash", "text", "No", "", "64 hex characters; unique", "SHA-256 of the client secret. The secret is 32 random bytes, so a fast hash is enough."),
    column("scopes", "text[]", "No", "'{}'", "Each `<service>:<right>`", "What the client may do as itself."),
    column("act_scopes", "text[]", "No", "'{}'", "Each `<service>:<right>`; never `identity:*`", "What it may do for a user. Empty: it may not act for users."),
    column("created_at", "timestamptz", "No", "now()", "", "When it was registered."),
    column("rotated_at", "timestamptz", "Yes", "", "", "When the secret was last changed."),
    column("revoked_at", "timestamptz", "Yes", "", "", "When it was turned off; it then gets no tokens."),
], "constraints": [
    "`service_clients_pkey`: primary key (`id`)",
    "`service_clients_secret_hash_key`: unique (`secret_hash`)",
    "`service_clients_id_check`, `service_clients_secret_hash_check`: formats",
    "`service_clients_scopes_check`: every scope names a platform service; no act scope is an Identity scope",
], "sampleCols": ["id", "secret_hash", "scopes", "act_scopes", "created_at", "rotated_at", "revoked_at"],
   "sampleRows": [
       ["docflow", "1f4e7a0c3d6b9e2f5a8c1d4e7b0a3f6c9e2d5b8a1c4f7e0d3a6b9c2e5f8a1d4b", "{payment:write,delivery:write}", "{upload:read,upload:write,extraction:read,extraction:write,review:read,review:write,payment:read,payment:write,delivery:read}", "2026-11-17 12:00:00+00", "(empty)", "(empty)"],
       ["extraction", "2a5d8b1e4c7f0a3d6b9e2c5f8a1d4b7e0c3f6a9d2b5e8c1f4a7d0b3e6c9f2a5d", "{}", "{upload:read}", "2026-11-17 12:00:00+00", "(empty)", "(empty)"],
       ["delivery", "3b6e9c2f5a8d1b4e7c0f3a6d9b2e5c8f1a4d7b0e3c6f9a2d5b8e1c4f7a0d3b6e", "{identity:users.read}", "{}", "2026-11-17 12:00:00+00", "(empty)", "(empty)"]]}

SVC = "|".join(SERVICES)
DDL = f"""-- Identity service, version 1, Service access. Schema: identity.
-- Loaded after Login's schema (docs/services/identity/schema.sql).
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create table identity.service_clients (
  id          text        primary key,
  secret_hash text        not null,
  scopes      text[]      not null default '{{}}',
  act_scopes  text[]      not null default '{{}}',
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz,
  revoked_at  timestamptz,

  constraint service_clients_secret_hash_key unique (secret_hash),
  constraint service_clients_id_check check (id ~ '^[a-z0-9-]{{1,50}}$'),
  constraint service_clients_secret_hash_check check (secret_hash ~ '^[0-9a-f]{{64}}$'),
  constraint service_clients_scopes_check check (
    array_to_string(scopes || act_scopes, ' ') ~ '^((({SVC}):[a-z_.]+)( |$))*$'
    and array_to_string(act_scopes, ' ') !~ '(^| )identity:'
  )
);

-- Clients are added by migrations only: the service's role may read them and record use, never insert.
grant select, update on identity.service_clients to identity_service;
"""

JOURNEYS = [
    journey("DocFlow moves a document on after extraction", "DocFlow, with no person present", "Receives `extraction.job.completed`.", ["MVP1-E0-09", "MVP1-E1-03"], [
        ("Reads the document's owner from its process record.", "Nothing is sent yet."),
        ("Asks Identity for a token for that owner (`on_behalf_of`).", "Identity checks DocFlow may act for users and signs a 5-minute token with `act: service:docflow`."),
        ("Reads the fields from Extraction and creates the Review task with that token.", "Extraction and Review check ownership as for any user, and audit the user and DocFlow."),
    ], "The same rules apply as when the person clicks, and the audit says DocFlow did it for them."),
    journey("Delivery looks up an email", "Delivery, sending a paid-order email", "Has a queued message for a user.", ["MVP1-E7-01", "MVP1-E1-03"], [
        ("Signs in as itself with its client secret.", "Identity returns a service token with `identity:users.read`."),
        ("Calls `GET /users/{userId}`.", "Identity returns the verified email."),
    ], "Delivery knows the address at send time and stores none."),
]

EDGE_CASES = [
    {"situation": "A service's secret is wrong or revoked", "sees": "The service's calls fail; its logs show the error.", "code": "`invalid_client`"},
    {"situation": "A service that may not act for users tries to", "sees": "Refused.", "code": "`delegation_not_allowed`"},
    {"situation": "Work continues after the account was deleted", "sees": "The step stops; nothing is done for a deleted user.", "code": "`user_not_found`"},
    {"situation": "A service asks for a scope it was not given", "sees": "Refused.", "code": "`invalid_scope`"},
]

MODULE = {
    "slug": "",
    "docsPath": "docs/services/identity/service-access",
    "extraDocs": [],
    "notes": {"journey": "Service journeys: no person is on a screen.", "ui": "", "hosted": "", "token": "Claims added to Login's access token by this part.",
              "schema": "One table, added to the `identity` schema after Login's tables."},
    "overview": {
        "name": "Service access", "version": "Version 1 · Identity, third part", "status": "Designed, not built", "base": BASE,
        "what": [
            "Service access is how a platform service or an app proves who it is, and how it does work for a user when that user is not there, such as DocFlow sending fields to Review after an extraction finishes at night.",
            "It adds two ways to use Login's `POST /token`: sign in as a service with a client secret, and exchange that service token for a 5-minute token for one user, marked with who is acting.",
        ],
        "why": [
            {"title": "One ownership rule everywhere", "text": "A service acting for a user carries that user's token, so no service needs a second way to decide who owns what."},
            {"title": "Always know who acted", "text": "Audit records the user and the acting service, so 'DocFlow did this for Priya' is visible."},
            {"title": "Control in one place", "text": "Which services may act for users, and with which scopes, is set in Identity only. Turning one off is one change."},
            {"title": "The standard model", "text": "Client credentials and token exchange are OAuth 2.0 (RFC 6749 §4.4, RFC 8693), the same model agents' OAuth will use later."},
        ],
        "scope_in": ["Client-credentials sign-in for services and apps", "Delegated tokens for one user (`on_behalf_of`)", "Claims `auth: service|delegated`, `app`, `act`", "The `service_clients` table, filled by migrations"],
        "scope_out": ["OAuth for third-party agents: later", "Rotating secrets without a deployment: later", "Delegated tokens with Identity scopes: never"],
        "stories": ["MVP1-E1-03", "MVP1-E0-07", "MVP1-E0-09"],
    },
    "flow": [
        {"who": "Service", "what": "Signs in with its client ID and secret; gets a 5-minute service token."},
        {"who": "Service", "what": "If it may act for users, exchanges it for a 5-minute token for one user."},
        {"who": "Gateway", "what": "Passes the token through unchanged to the service being called."},
        {"who": "Called service", "what": "Verifies it like any token, applies its ownership checks, audits the user and `act`."},
    ],
    "concepts": [
        {"term": "Service token", "meaning": "A token for a service acting as itself (`auth: service`)."},
        {"term": "Delegated token", "meaning": "A token for a user, issued to a service acting for them (`auth: delegated`, with `act`)."},
        {"term": "Client", "meaning": "A service or app registered in `identity.service_clients`."},
    ],
    "quickstart": [
        {"title": "Act for a user", "text": "What `callService()` does for a step with no person present.", "lang": "ts",
         "code": "const svc = await identity.token({ grant_type: \"client_credentials\", client_id: \"docflow\", client_secret: env.DOCFLOW_CLIENT_SECRET });\nconst user = await identity.token(\n  { grant_type: \"urn:ietf:params:oauth:grant-type:token-exchange\", on_behalf_of: doc.owner_id, scope: \"extraction:read review:write\" },\n  svc.access_token,\n);\nawait review.post(\"/tasks\", body, user.access_token);"},
    ],
    "env": [
        {"name": "<CLIENT>_CLIENT_SECRET", "value": "`cs_01s_` and 43 base64url characters, one per service or app", "secret": "Yes"},
    ],
    "openQuestions": [
        "Decided by Nikhil on 20 Nov 2026 (#73): in MVP1 a client secret changes only with a migration and a deployment. Rotation without downtime (two overlapping secrets per client) is MVP2 story `MVP2-E8-12`.",
        "Starting scopes for each client are in the sample rows; each service's spec still has to name the scope of each endpoint (review finding M3).",
    ],
    "errorSample": problem("delegation_not_allowed", "Delegation not allowed", 403, "This client may not act for users."),
    "endpoints": ENDPOINTS,
    "noEndpoint": NO_ENDPOINT,
    "claims": CLAIMS,
    "tables": [CLIENTS],
    "entities": [{"name": "Client", "table": "`identity.service_clients`", "what": "A service or app that may get tokens.", "relations": "Stands alone; named in tokens as `app` and `act.sub`."}],
    "lifecycles": [{"name": "Client", "text": "Added by a migration → secret rotated by a migration → revoked (kept, so audit events can name it)."}],
    "otherTables": "Failed sign-ins are recorded in Login's `identity.audit_events`.",
    "notStored": ["Client secrets: only their hashes.", "Issued tokens: they are signed and short-lived, so none is stored."],
    "ddl": DDL,
    "queries": [{"title": "Sign in a client", "sql": "select scopes, act_scopes from identity.service_clients\nwhere id = $1 and secret_hash = $2 and revoked_at is null;"}],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": ["Secrets are compared by hash in constant time; failures are rate-limited.", "Granted scopes are a subset of the client's.", "A delegated token never carries `*`, `is_admin` or Identity scopes."]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": ["Every scope names a platform service.", "No client may act for users with an Identity scope.", "Identity's role cannot add clients."]},
        {"level": "Data model level: business rules the service guarantees", "items": ["A delegated token is issued only for an existing user.", "Every token lasts 5 minutes; none is stored."]},
    ],
}
