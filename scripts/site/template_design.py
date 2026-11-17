"""Design of the service template (packages/service-kit): what every platform service gets.

Data only: scripts/site/render.py turns MODULE into docs/services/service-kit/*.md.
No product page of its own (slug ""): the template is shown through every service.
Stories: MVP1-E0-01, E0-02, E0-03, E0-05 and E0-07 (E0-06's MCP server part).
"""
import json

from render import column, endpoint, error, journey, param, problem, response

KEY = "template"
COMPLETE = True

S = "{service}"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
NOT_AUTH = error("401", "not_authenticated", "No valid access token.")

ENDPOINTS = [
    endpoint("health", "GET", f"/api/{S}/v1/health", "Public", "MVP1-E0-05", "Is the service up",
             "Liveness for the gateway's platform health check.", [],
             ["Answers without touching the database, so a slow database does not make the service look down."],
             [response("200", "Always, while the process runs", "`status` (`ok`), `service`, `version`.")], [],
             "GET /api/upload/v1/health HTTP/1.1", json.dumps({"status": "ok", "service": "upload", "version": "1.4.0"}, indent=2)),
    endpoint("openapi", "GET", f"/api/{S}/v1/openapi.json", "Public", "MVP1-E0-05", "The service's contract",
             "OpenAPI 3.1, generated from the zod schemas the handlers validate with.", [],
             ["Served from the committed file; the pipeline fails if it differs from what the code generates.", "Operations agents may use are tagged `agent`."],
             [response("200", "Always", "The OpenAPI document.")], [],
             "GET /api/upload/v1/openapi.json HTTP/1.1", json.dumps({"openapi": "3.1.0", "info": {"title": "01scale Upload", "version": "1.4.0"}, "paths": {"/api/upload/v1/files": {"post": {"operationId": "createFile", "tags": ["agent"]}}}}, indent=2)),
    endpoint("audit-events", "GET", f"/api/{S}/v1/audit-events", "Signed in", "MVP1-E0-02", "My audit events in this service",
             "What happened to the caller's things in this service; admins see everyone's.",
             [param("action", "query", "string", "No", "An action from the fixed list, or a prefix such as `auth.*`.", "Filter."),
              param("cursor, limit", "query", "string, integer", "No", "`limit` 1 to 100, default 20.", "Paging.")],
             ["Read only. Filters by `actor_id` = the caller unless the token has `is_admin`."],
             [response("200", "Always", "`data[]` of audit events and `next_cursor`.")], [error("422", "validation_failed", "Unknown action or bad cursor."), NOT_AUTH],
             "GET /api/payment/v1/audit-events?action=order.* HTTP/1.1\nAuthorization: Bearer <access token>",
             json.dumps({"data": [{"id": "0193b122-0000-7000-8000-000000000001", "actor_id": U1, "actor_type": "user", "action": "order.created", "target_type": "order", "target_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f", "metadata": {"amount": 500, "currency": "usd"}, "request_id": "req_0193b11f", "created_at": "2026-11-17T09:16:30Z"}], "next_cursor": None}, indent=2)),
    endpoint("receive-events", "POST", f"/api/{S}/v1/events", "Service", "MVP1-E0-07", "Receive platform events",
             "Where a service receives another service's signed events, such as `identity.user.deleted`. Apps use their own webhook instead.",
             [param("X-01scale-Signature", "header", "string", "Yes", "`sha256=` and the HMAC-SHA256 of the raw body, compared in constant time.", "Proves the sender."),
              param("event_id, type, occurred_at, data", "body", "uuid, string, date-time, object", "Yes", "`occurred_at` at most 1 day old.", "The event.")],
             ["Verifies the signature, then records `event_id` in `inbound_events` in the same transaction as the handler's change; a repeat changes nothing.", "Types the service does not handle are acknowledged and ignored."],
             [response("200", "Handled, ignored, or a repeat", "No body.")], [error("401", "invalid_signature", "Missing, wrong, or too old.")],
             "POST /api/upload/v1/events HTTP/1.1\nX-01scale-Signature: sha256=4be1…\nContent-Type: application/json\n\n" + json.dumps({"event_id": "0193b300-0000-7000-8000-000000000009", "type": "identity.user.deleted", "occurred_at": "2026-11-17T11:00:00Z", "data": {"user_id": U1}}, indent=2),
             "HTTP/1.1 200 OK"),
    endpoint("mcp", "POST", f"/api/{S}/mcp", "Signed in", "MVP1-E0-06", "The service's MCP server",
             "The service's `agent` operations as tools for AI agents, over Streamable HTTP.",
             [param("JSON-RPC message", "body", "object", "Yes", "MCP: `initialize`, `tools/list`, `tools/call`.", "The agent's request.")],
             ["Tools are generated from the OpenAPI document: same `operationId`, input and output schemas.", "`tools/call` runs the same service function as the REST handler, with the caller's token, so scopes and ownership apply.", "A test fails if an `agent` operation has no tool."],
             [response("200", "Always for valid JSON-RPC", "The MCP result, or a JSON-RPC error carrying the problem's `code`.")], [NOT_AUTH],
             "POST /api/upload/mcp HTTP/1.1\nAuthorization: Bearer <access token>\nContent-Type: application/json\n\n" + json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "createFile", "arguments": {"file_name": "a.pdf", "mime": "application/pdf", "size": 1000}}}, indent=2),
             json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"structuredContent": {"file": {"id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b", "status": "pending"}}}}, indent=2)),
]

NO_ENDPOINT = [
    {"topic": "Errors (E0-05 AC2)", "how": "RFC 9457 `application/problem+json`: `type`, `title`, `status`, `detail`, `code`, `request_id`, and `errors[]` (`field`, `code`, `message`) for validation. Codes shared by every service: `not_authenticated`, `insufficient_scope`, `validation_failed`, `idempotency_key_reused`, `rate_limited`, `dependency_unavailable`, `not_found`."},
    {"topic": "Access tokens (E1-06)", "how": "`requireUser(scope)` verifies the ES256 token against Identity's `GET /jwks` (cached, refreshed on an unknown `kid`), checks `aud`, `exp` and the scope, and gives the handler `{userId, isAdmin, auth, akid}`. Queries on user-owned tables always filter by `owner_id` in the data-access layer."},
    {"topic": "Idempotency (E0-05 AC4)", "how": "`withIdempotency()` on create endpoints: the same key and body returns the stored response; the same key with another body answers `422 idempotency_key_reused`. Keys expire after 24 hours."},
    {"topic": "Pagination (E0-05 AC3)", "how": "Opaque cursor (base64url of the last row's `created_at` and `id`); `limit` 1 to 100; answers `{data, next_cursor}`."},
    {"topic": "Request IDs and logs (E0-05 AC6)", "how": "Takes `X-Request-Id` from the gateway (or makes one), returns it, and passes it on every outgoing call. Logs are JSON lines with the request ID, never document contents, tokens or personal data."},
    {"topic": "Outbound events (E0-07 AC5)", "how": "`emit(type, data, subscribers)` writes one `outbound_events` row per subscriber in the caller's transaction. A delivery job sends them with an HMAC signature; retries back off 1 minute, 5, 30, 2 hours, 12 hours, then `failed`."},
    {"topic": "Calls to other services (E0-07 AC7)", "how": "`callService()`: 5-second timeout, one retry for safe or idempotent calls, and a `503 dependency_unavailable` problem when the other service cannot answer."},
    {"topic": "Audit (E0-02)", "how": "`audit(actor, action, target, metadata)` checks the action against the fixed list and the metadata against an allow-list of keys, then inserts. The role cannot update or delete audit rows."},
    {"topic": "Migrations (E0-01)", "how": "Drizzle migrations per service, run before a new version serves traffic. Each service's role can reach only its own schema; a test proves it cannot read another's."},
    {"topic": "Boundaries (E0-07 AC3)", "how": "A lint rule fails if a service imports another service's folder or names another schema in SQL. Services share only `packages/` and published contracts."},
]

AUDIT = {"name": "template.audit_events", "purpose": "Every important thing that happened in the service. Append-only.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The event's ID."),
    column("actor_id", "uuid", "Yes", "", "", "Who acted; empty for the system."),
    column("actor_type", "text", "No", "", "`user`, `api_key`, `service`, `system`", "What kind of caller acted."),
    column("action", "text", "No", "", "From the fixed list: `auth.*`, `document.*`, `review.*`, `order.*`, `delivery.*`", "What happened."),
    column("target_type", "text", "Yes", "", "", "What kind of thing it happened to."),
    column("target_id", "uuid", "Yes", "", "", "Which one. No foreign key, so the record outlives the thing."),
    column("metadata", "jsonb", "No", "'{}'", "Keys from an allow-list", "Details; never contents, tokens or full card or phone numbers."),
    column("request_id", "text", "Yes", "", "", "Links the event to logs."),
    column("created_at", "timestamptz", "No", "now()", "", "When."),
], "constraints": ["`audit_events_pkey`: primary key (`id`)", "`audit_events_actor_type_check`: the four actor types", "`audit_events_action_check`: an allowed prefix", "`audit_events_actor_idx`: index on (`actor_id`, `created_at` desc)"],
   "sampleCols": ["id", "actor_id", "actor_type", "action", "target_type", "target_id", "metadata", "request_id", "created_at"],
   "sampleRows": [["0193b122-0000-7000-8000-000000000001", U1, "user", "order.created", "order", "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f", '{"amount":500,"currency":"usd"}', "req_0193b11f", "2026-11-17 09:16:30+00"]]}

IDEM = {"name": "template.idempotency_keys", "purpose": "The first response to each idempotent request, kept 24 hours.", "columns": [
    column("owner_id", "uuid", "No", "", "Part of the primary key", "Whose request; keys are per user."),
    column("key", "text", "No", "", "1 to 255 characters; part of the primary key", "The `Idempotency-Key` header."),
    column("method", "text", "No", "", "`POST`, `PUT`, `PATCH`, `DELETE`", "The request's method."),
    column("path", "text", "No", "", "", "The request's path."),
    column("request_hash", "text", "No", "", "64 hex characters", "SHA-256 of the body, to detect a reused key."),
    column("response_status", "smallint", "No", "", "100 to 599", "The first response's status."),
    column("response_body", "jsonb", "Yes", "", "", "The first response's body."),
    column("created_at", "timestamptz", "No", "now()", "", "When; rows older than 24 hours are deleted daily."),
], "constraints": ["`idempotency_keys_pkey`: primary key (`owner_id`, `key`)", "`idempotency_keys_key_check`, `idempotency_keys_method_check`, `idempotency_keys_request_hash_check`, `idempotency_keys_status_check`"],
   "sampleCols": ["owner_id", "key", "method", "path", "request_hash", "response_status", "response_body", "created_at"],
   "sampleRows": [[U1, "6f1c2a9e-upload-1", "POST", "/api/upload/v1/files", "a3f1c9e27b4d6058e1c2b3a4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708", "201", '{"file":{"id":"0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b"}}', "2026-11-17 09:14:07+00"]]}

OUTBOX = {"name": "template.outbound_events", "purpose": "Events waiting to be delivered, one row per subscriber, written in the same transaction as the change.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The delivery's ID."),
    column("event_id", "uuid", "No", "", "Unique with `subscriber`", "The event's ID, the same for every subscriber; receivers use it to process once."),
    column("type", "text", "No", "", "`<service>.<thing>.<happened>`", "What happened."),
    column("payload", "jsonb", "No", "", "", "`data` of the event; IDs, never contents."),
    column("subscriber", "text", "No", "", "An `https://` address", "Where to deliver it."),
    column("status", "text", "No", "'pending'", "`pending`, `delivered`, `failed`", "Delivery state."),
    column("attempts", "smallint", "No", "0", "0 to 6", "Tries so far."),
    column("next_attempt_at", "timestamptz", "Yes", "now()", "Set exactly while `pending`", "When to try next."),
    column("created_at", "timestamptz", "No", "now()", "", "When the change happened."),
], "constraints": ["`outbound_events_pkey`: primary key (`id`)", "`outbound_events_event_subscriber_key`: unique (`event_id`, `subscriber`)", "`outbound_events_status_check`, `outbound_events_attempts_check`, `outbound_events_subscriber_check`, `outbound_events_next_attempt_check`", "`outbound_events_due_idx`: partial index on `next_attempt_at` where `pending`, for the delivery job"],
   "sampleCols": ["id", "event_id", "type", "payload", "subscriber", "status", "attempts", "next_attempt_at", "created_at"],
   "sampleRows": [["0193b301-0000-7000-8000-000000000001", "0193b300-0000-7000-8000-000000000009", "identity.user.deleted", '{"user_id":"' + U1 + '"}', "https://01scale.com/api/upload/v1/events", "delivered", "1", "(empty)", "2026-11-17 11:00:00+00"],
                  ["0193b301-0000-7000-8000-000000000002", "0193b300-0000-7000-8000-000000000009", "identity.user.deleted", '{"user_id":"' + U1 + '"}', "https://01scale.com/api/payment/v1/events", "pending", "2", "2026-11-17 11:36:00+00", "2026-11-17 11:00:00+00"]]}

INBOX = {"name": "template.inbound_events", "purpose": "Events from other services already handled, so each is handled once.", "columns": [
    column("event_id", "uuid", "No", "", "Primary key", "The event's ID."),
    column("type", "text", "No", "", "", "What happened."),
    column("created_at", "timestamptz", "No", "now()", "", "When it was handled."),
], "constraints": ["`inbound_events_pkey`: primary key (`event_id`)"], "sampleCols": ["event_id", "type", "created_at"],
   "sampleRows": [["0193b300-0000-7000-8000-000000000009", "identity.user.deleted", "2026-11-17 11:00:02+00"]]}

DDL = """-- Service template. Every service gets these tables in its own schema;
-- they are shown here in a schema named `template`. The service's own tables come from its stories.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists template;

create table template.audit_events (
  id          uuid        primary key,
  actor_id    uuid,
  actor_type  text        not null,
  action      text        not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb       not null default '{}',
  request_id  text,
  created_at  timestamptz not null default now(),

  constraint audit_events_actor_type_check check (actor_type in ('user', 'api_key', 'service', 'system')),
  constraint audit_events_action_check check (action ~ '^(auth|document|review|order|delivery)\\.[a-z_]+$')
);

create index audit_events_actor_idx on template.audit_events (actor_id, created_at desc);

create table template.idempotency_keys (
  owner_id        uuid        not null,
  key             text        not null,
  method          text        not null,
  path            text        not null,
  request_hash    text        not null,
  response_status smallint    not null,
  response_body   jsonb,
  created_at      timestamptz not null default now(),

  constraint idempotency_keys_pkey primary key (owner_id, key),
  constraint idempotency_keys_key_check check (length(key) between 1 and 255),
  constraint idempotency_keys_method_check check (method in ('POST', 'PUT', 'PATCH', 'DELETE')),
  constraint idempotency_keys_request_hash_check check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint idempotency_keys_status_check check (response_status between 100 and 599)
);

create table template.outbound_events (
  id              uuid        primary key,
  event_id        uuid        not null,
  type            text        not null,
  payload         jsonb       not null,
  subscriber      text        not null,
  status          text        not null default 'pending',
  attempts        smallint    not null default 0,
  next_attempt_at timestamptz default now(),
  created_at      timestamptz not null default now(),

  constraint outbound_events_event_subscriber_key unique (event_id, subscriber),
  constraint outbound_events_status_check check (status in ('pending', 'delivered', 'failed')),
  constraint outbound_events_attempts_check check (attempts between 0 and 6),
  constraint outbound_events_subscriber_check check (subscriber like 'https://%'),
  constraint outbound_events_next_attempt_check check ((status = 'pending') = (next_attempt_at is not null))
);

create index outbound_events_due_idx on template.outbound_events (next_attempt_at) where status = 'pending';

create table template.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

-- The service's role reaches only its own schema. Audit and inbound events are never changed.
grant usage on schema template to template_service;
grant select, insert, update, delete on template.idempotency_keys, template.outbound_events to template_service;
grant select, insert on template.audit_events, template.inbound_events to template_service;
"""

JOURNEYS = [
    journey("Start a new service", "The owner, building a service", "A new service's story is picked up.", ["MVP1-E0-07"], [
        ("Copies `services/_template` to `services/<name>` and sets the name.", "The template brings health, OpenAPI, MCP, audit, events, idempotency and the four tables."),
        ("Writes the story's zod schemas, service functions and route handlers.", "OpenAPI and MCP tools are generated from the zod schemas."),
        ("Opens a pull request.", "Only that service's pipeline runs: lint, types, tests, migrations on PGlite, the boundary check and the OpenAPI diff."),
        ("Merges.", "The service deploys on its own Vercel project; migrations run first."),
    ], "A new service that behaves like every other one."),
    journey("An agent discovers and uses a service", "An AI agent with a user's API key", "Is pointed at 01scale.com.", ["MVP1-E0-05", "MVP1-E0-06"], [
        ("Reads `GET /api/openapi.json` or connects to `POST /api/mcp`.", "The gateway combines every service's contract and tools."),
        ("Calls a tool, retrying with the same idempotency key after a timeout.", "The service returns the first response again instead of acting twice."),
        ("Gets an error and branches on its `code`.", "Every service uses the same problem shape and codes."),
    ], "The agent learned the rules once."),
]

EDGE_CASES = [
    {"situation": "A retry reuses a key with a different body", "sees": "An error saying the key was already used for another request.", "code": "`idempotency_key_reused`"},
    {"situation": "Another service is down", "sees": "'Something went wrong. Try again in a moment.' Nothing half-done.", "code": "`dependency_unavailable`"},
    {"situation": "Too many requests", "sees": "Wait and retry after the time in `Retry-After`.", "code": "`rate_limited`"},
    {"situation": "An agent's key lacks a scope", "sees": "The agent is told which scope it needs.", "code": "`insufficient_scope`"},
    {"situation": "An event is sent with a wrong or old signature", "sees": "Nothing; the event is refused.", "code": "`invalid_signature`"},
]

MODULE = {
    "slug": "",
    "docsPath": "docs/services/service-kit",
    "extraDocs": [],
    "notes": {"journey": "Developer and agent journeys: the template has no screens.", "ui": "", "hosted": "", "token": "",
              "schema": "The tables every service gets, shown in a schema named `template`."},
    "overview": {
        "name": "Service template", "version": "Version 1 · `packages/service-kit` and `services/_template`", "status": "Designed, not built", "base": "/api/{service}/v1",
        "what": [
            "The service template is what every 01scale platform service starts from, so each new service is mostly copying and all of them behave the same way.",
            "It gives a service its health check, its contract and MCP tools, access-token checks, one error format, audit, idempotency, paging, signed events in and out, and safe calls to other services. The service adds only its own endpoints and tables.",
        ],
        "why": [
            {"title": "Learn the rules once", "text": "A developer or an agent who has used one service can use them all."},
            {"title": "Security is not optional", "text": "Token checks, audit and the boundary check are in the template, so no service forgets them."},
            {"title": "Independent releases", "text": "Each service has its own pipeline and deploys alone; the template is the only thing they share."},
            {"title": "Nothing lost between services", "text": "The outbox and inbox make events reliable without a message broker."},
        ],
        "scope_in": ["Health, OpenAPI and MCP endpoints", "Audit, idempotency, outbox and inbox tables in every schema", "Token checks, errors, paging, request IDs, logs, service calls", "Per-service pipelines and the boundary check (E0-03, E0-07)"],
        "scope_out": ["A message queue (SQS): MVP2, where a second consumer needs one", "OAuth for agents: later", "The eval harness: Extraction's (E0-04)"],
        "stories": ["MVP1-E0-01", "MVP1-E0-02", "MVP1-E0-03", "MVP1-E0-05", "MVP1-E0-07"],
    },
    "flow": [
        {"who": "Gateway", "what": "Forwards a request with an access token and `X-Request-Id`."},
        {"who": "This service", "what": "Verifies the token, validates the input with zod, applies idempotency."},
        {"who": "This service", "what": "Changes its data, writes audit and outbox rows in the same transaction."},
        {"who": "This service", "what": "The delivery job sends outbox events, signed, to subscribers' `POST /events`."},
    ],
    "concepts": [
        {"term": "Outbox", "meaning": "Events stored with the change, then delivered, so an event is never lost or sent for a rolled-back change."},
        {"term": "Inbox", "meaning": "`inbound_events`: the IDs of events already handled, so a repeat does nothing."},
        {"term": "Boundary check", "meaning": "A lint rule that fails if a service reaches into another service's code or schema."},
    ],
    "quickstart": [
        {"title": "A handler", "text": "Every endpoint looks like this once the template exists.", "lang": "ts",
         "code": "export const POST = route({\n  scope: \"upload:write\", idempotent: true, input: CreateFile, output: FileCreated,\n  async handler({ user, input, tx }) {\n    const file = await files.create(tx, user.userId, input);\n    await audit(tx, user, \"document.uploaded\", { type: \"file\", id: file.id });\n    return { status: 201, body: { file } };\n  },\n});"},
        {"title": "Emit an event", "text": "In the same transaction as the change.", "lang": "ts", "code": "await emit(tx, \"identity.user.deleted\", { user_id }, subscribers);"},
    ],
    "env": [
        {"name": "<SERVICE>_DATABASE_URL", "value": "Neon connection string for that service's role", "secret": "Yes"},
        {"name": "IDENTITY_JWKS_URL", "value": "`https://01scale.com/api/identity/v1/jwks`", "secret": "No"},
        {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64; shared by the platform's services", "secret": "Yes"},
    ],
    "openQuestions": [
        "One signing key for all events is simplest; a key per sender would limit what one leaked key can forge. I chose one key for MVP1.",
        "How the outbox delivery job runs on Vercel: a cron every minute plus an immediate attempt after the transaction commits.",
    ],
    "errorSample": problem("idempotency_key_reused", "Idempotency key reused", 422, "This Idempotency-Key was used with a different request body."),
    "endpoints": ENDPOINTS,
    "noEndpoint": NO_ENDPOINT,
    "tables": [AUDIT, IDEM, OUTBOX, INBOX],
    "entities": [
        {"name": "Audit event", "table": "`audit_events`", "what": "A permanent record of an important action.", "relations": "Refers to actor and target by ID only."},
        {"name": "Idempotency record", "table": "`idempotency_keys`", "what": "The first response to a retried request.", "relations": "Per user and key."},
        {"name": "Outbound event", "table": "`outbound_events`", "what": "One event for one subscriber, until delivered.", "relations": "One row per subscriber of an event."},
        {"name": "Inbound event", "table": "`inbound_events`", "what": "An event already handled.", "relations": "Stands alone."},
    ],
    "lifecycles": [{"name": "Outbound event", "text": "`pending` → `delivered`; or after 6 attempts `failed`, which an admin can retry."},
                   {"name": "Idempotency record", "text": "Created by the first request; deleted after 24 hours."}],
    "notStored": ["Request or response bodies outside idempotency records.", "Document contents or personal data in audit metadata or logs."],
    "ddl": DDL,
    "queries": [{"title": "Events due for delivery", "sql": "select * from template.outbound_events\nwhere status = 'pending' and next_attempt_at <= now()\norder by next_attempt_at\nlimit 50\nfor update skip locked;"}],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": ["Every non-public endpoint verifies the access token and its scope.", "Inputs are validated with the same zod schemas that generate the contract.", "Events are accepted only with a valid, recent signature."]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": ["Audit rows cannot be changed or deleted by the service's role.", "One idempotency record per user and key; one outbox row per event and subscriber.", "Each role reaches only its own schema."]},
        {"level": "Data model level: business rules the service guarantees", "items": ["Events are written in the change's transaction.", "Each inbound event is handled once.", "No service reads another's tables."]},
    ],
}
