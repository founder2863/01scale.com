# Service template service — API specification

> **Version 1 · `packages/service-kit` and `services/_template`.** Status: in design. Stories: `MVP1-E0-01`, `MVP1-E0-02`, `MVP1-E0-03`, `MVP1-E0-05`, `MVP1-E0-07`.

Base address: `https://01scale.com/api/{service}/v1`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/idempotency_key_reused",
  "title": "Idempotency key reused",
  "status": 422,
  "detail": "This Idempotency-Key was used with a different request body.",
  "code": "idempotency_key_reused",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### GET /health

**Is the service up.** Liveness for the gateway's platform health check.

Access: **Public** · Story: `MVP1-E0-05`

**Inputs:** none.

**Behaviour**

- Answers without touching the database, so a slow database does not make the service look down.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always, while the process runs | `status` (`ok`), `service`, `version`. |

**Sample request**

```http
GET /api/upload/v1/health HTTP/1.1
```

**Sample response**

```json
{
  "status": "ok",
  "service": "upload",
  "version": "1.4.0"
}
```

### GET /openapi.json

**The service's contract.** OpenAPI 3.1, generated from the zod schemas the handlers validate with.

Access: **Public** · Story: `MVP1-E0-05`

**Inputs:** none.

**Behaviour**

- Served from the committed file; the pipeline fails if it differs from what the code generates.
- Operations agents may use are tagged `agent`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | The OpenAPI document. |

**Sample request**

```http
GET /api/upload/v1/openapi.json HTTP/1.1
```

**Sample response**

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "01scale Upload",
    "version": "1.4.0"
  },
  "paths": {
    "/api/upload/v1/files": {
      "post": {
        "operationId": "createFile",
        "tags": [
          "agent"
        ]
      }
    }
  }
}
```

### GET /audit-events

**My audit events in this service.** What happened to the caller's things in this service; admins see everyone's.

Access: **Signed in** · Story: `MVP1-E0-02`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `action` | query | string | No | An action from the fixed list, or a prefix such as `auth.*`. | Filter. |
| `cursor, limit` | query | string, integer | No | `limit` 1 to 100, default 20. | Paging. |

**Behaviour**

- Read only. Filters by `actor_id` = the caller unless the token has `is_admin`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | `data[]` of audit events and `next_cursor`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `422` | `validation_failed` | Unknown action or bad cursor. |
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
GET /api/payment/v1/audit-events?action=order.* HTTP/1.1
Authorization: Bearer <access token>
```

**Sample response**

```json
{
  "data": [
    {
      "id": "0193b122-0000-7000-8000-000000000001",
      "actor_id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
      "actor_type": "user",
      "action": "order.created",
      "target_type": "order",
      "target_id": "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f",
      "metadata": {
        "amount": 500,
        "currency": "usd"
      },
      "request_id": "req_0193b11f",
      "created_at": "2026-11-17T09:16:30Z"
    }
  ],
  "next_cursor": null
}
```

### POST /events

**Receive platform events.** Where a service receives another service's signed events, such as `identity.user.deleted`. Apps use their own webhook instead.

Access: **Service** · Story: `MVP1-E0-07`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `X-01scale-Signature` | header | string | Yes | `sha256=` and the HMAC-SHA256 of the raw body, compared in constant time. | Proves the sender. |
| `event_id, type, occurred_at, data` | body | uuid, string, date-time, object | Yes | `occurred_at` at most 1 day old. | The event. |

**Behaviour**

- Verifies the signature, then records `event_id` in `inbound_events` in the same transaction as the handler's change; a repeat changes nothing.
- Types the service does not handle are acknowledged and ignored.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Handled, ignored, or a repeat | No body. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `invalid_signature` | Missing, wrong, or too old. |

**Sample request**

```http
POST /api/upload/v1/events HTTP/1.1
X-01scale-Signature: sha256=4be1…
Content-Type: application/json

{
  "event_id": "0193b300-0000-7000-8000-000000000009",
  "type": "identity.user.deleted",
  "occurred_at": "2026-11-17T11:00:00Z",
  "data": {
    "user_id": "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
  }
}
```

**Sample response**

```http
HTTP/1.1 200 OK
```

### POST /api/{service}/mcp

**The service's MCP server.** The service's `agent` operations as tools for AI agents, over Streamable HTTP.

Access: **Signed in** · Story: `MVP1-E0-06`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `JSON-RPC message` | body | object | Yes | MCP: `initialize`, `tools/list`, `tools/call`. | The agent's request. |

**Behaviour**

- Tools are generated from the OpenAPI document: same `operationId`, input and output schemas.
- `tools/call` runs the same service function as the REST handler, with the caller's token, so scopes and ownership apply.
- A test fails if an `agent` operation has no tool.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always for valid JSON-RPC | The MCP result, or a JSON-RPC error carrying the problem's `code`. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid access token. |

**Sample request**

```http
POST /api/upload/mcp HTTP/1.1
Authorization: Bearer <access token>
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "createFile",
    "arguments": {
      "file_name": "a.pdf",
      "mime": "application/pdf",
      "size": 1000
    }
  }
}
```

**Sample response**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "structuredContent": {
      "file": {
        "id": "0193b0c4-2a10-7e55-8d31-6c7d8e9f0a1b",
        "status": "pending"
      }
    }
  }
}
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| Errors (E0-05 AC2) | RFC 9457 `application/problem+json`: `type`, `title`, `status`, `detail`, `code`, `request_id`, and `errors[]` (`field`, `code`, `message`) for validation. Codes shared by every service: `not_authenticated`, `insufficient_scope`, `validation_failed`, `idempotency_key_reused`, `rate_limited`, `dependency_unavailable`, `not_found`. |
| Access tokens (E1-06) | `requireUser(scope)` verifies the ES256 token against Identity's `GET /jwks` (cached, refreshed on an unknown `kid`), checks `aud`, `exp` and the scope, and gives the handler `{userId, isAdmin, auth, akid}`. Queries on user-owned tables always filter by `owner_id` in the data-access layer. |
| Idempotency (E0-05 AC4) | `withIdempotency()` on create endpoints: the same key and body returns the stored response; the same key with another body answers `422 idempotency_key_reused`. Keys expire after 24 hours. |
| Pagination (E0-05 AC3) | Opaque cursor (base64url of the last row's `created_at` and `id`); `limit` 1 to 100; answers `{data, next_cursor}`. |
| Request IDs and logs (E0-05 AC6) | Takes `X-Request-Id` from the gateway (or makes one), returns it, and passes it on every outgoing call. Logs are JSON lines with the request ID, never document contents, tokens or personal data. |
| Outbound events (E0-07 AC5) | `emit(type, data, subscribers)` writes one `outbound_events` row per subscriber in the caller's transaction. A delivery job sends them with an HMAC signature; retries back off 1 minute, 5, 30, 2 hours, 12 hours, then `failed`. |
| Calls to other services (E0-07 AC7) | `callService()`: 5-second timeout, one retry for safe or idempotent calls, and a `503 dependency_unavailable` problem when the other service cannot answer. |
| Audit (E0-02) | `audit(actor, action, target, metadata)` checks the action against the fixed list and the metadata against an allow-list of keys, then inserts. The role cannot update or delete audit rows. |
| Migrations (E0-01) | Drizzle migrations per service, run before a new version serves traffic. Each service's role can reach only its own schema; a test proves it cannot read another's. |
| Boundaries (E0-07 AC3) | A lint rule fails if a service imports another service's folder or names another schema in SQL. Services share only `packages/` and published contracts. |

## Constraints at the API level

- Every non-public endpoint verifies the access token and its scope.
- Inputs are validated with the same zod schemas that generate the contract.
- Events are accepted only with a valid, recent signature.
