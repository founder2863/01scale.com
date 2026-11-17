# Gateway service — API specification

> **Version 1 · `apps/web` at 01scale.com/api.** Status: in design. Stories: `MVP1-E0-08`, `MVP1-E1-06`.

Base address: `https://01scale.com/api`. Shared rules for every 01scale API (errors, versioning, tracing) are in [`docs/architecture/API-DESIGN.md`](../../architecture/API-DESIGN.md).

## Errors

Every error uses `application/problem+json` with a stable `code`. Branch on `code`, never on the text.

```json
{
  "type": "https://01scale.com/errors/rate_limited",
  "title": "Too many requests",
  "status": 429,
  "detail": "Try again in 12 seconds.",
  "code": "rate_limited",
  "request_id": "req_0193a61f9c2e"
}
```

## Endpoints

### GET /health

**Platform health.** The gateway and every service behind it.

Access: **Public** · Story: `MVP1-E0-08`

**Inputs:** none.

**Behaviour**

- Calls each service's `GET /api/{service}/v1/health` in parallel with a 2-second timeout.
- A slow or failing service is `down`; the platform still answers `200` while the gateway itself is up.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | The gateway is up | `status` (`ok` or `degraded`) and `services` (each `ok` or `down`, with its version). |

**Errors**

| Status | Code | When |
|---|---|---|
| `503` | `gateway_unhealthy` | The gateway cannot serve requests. |

**Sample request**

```http
GET /api/health HTTP/1.1
```

**Sample response**

```json
{
  "status": "degraded",
  "services": {
    "identity": {
      "status": "ok",
      "version": "1.2.0"
    },
    "upload": {
      "status": "ok",
      "version": "1.4.0"
    },
    "extraction": {
      "status": "down"
    },
    "review": {
      "status": "ok",
      "version": "1.0.3"
    },
    "payment": {
      "status": "ok",
      "version": "1.1.0"
    },
    "delivery": {
      "status": "ok",
      "version": "1.0.1"
    },
    "docflow": {
      "status": "ok",
      "version": "1.0.0"
    }
  }
}
```

### GET /openapi.json

**The whole platform's contract.** One OpenAPI 3.1 document merged from every service's own.

Access: **Public** · Story: `MVP1-E0-08`

**Inputs:** none.

**Behaviour**

- Fetches each service's `openapi.json`, prefixes component names with the service, and merges. Cached for 5 minutes.
- A service that is down is left out, and listed in `x-missing-services`.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Always | The combined OpenAPI document. |

**Sample request**

```http
GET /api/openapi.json HTTP/1.1
```

**Sample response**

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "01scale platform",
    "version": "2026-11-17"
  },
  "paths": {
    "/api/upload/v1/files": {
      "post": {
        "operationId": "upload.createFile"
      }
    }
  },
  "x-missing-services": []
}
```

### POST /mcp

**The whole platform's MCP server.** Every service's tools in one MCP server, named `<service>.<operationId>`.

Access: **Signed in** · Story: `MVP1-E0-08`

**Inputs**

| Name | In | Type | Required | Constraints | Meaning |
|---|---|---|---|---|---|
| `Authorization` | header | string | Yes | `Bearer sk_01s_…` (an API key) or the session cookie. | Who the agent acts for. |
| `JSON-RPC message` | body | object | Yes | MCP over Streamable HTTP. | The agent's request. |

**Behaviour**

- `tools/list` merges each service's tools and adds the service prefix.
- `tools/call` strips the prefix and forwards to `POST /api/{service}/mcp` with the access token.

**Responses**

| Status | When | Body or headers |
|---|---|---|
| `200` | Valid JSON-RPC | The MCP result. |

**Errors**

| Status | Code | When |
|---|---|---|
| `401` | `not_authenticated` | No valid session or API key. |
| `429` | `rate_limited` | Over the limit; see `Retry-After`. |

**Sample request**

```http
POST /api/mcp HTTP/1.1
Authorization: Bearer sk_01s_…
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Sample response**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "upload.createFile"
      },
      {
        "name": "docflow.listDocuments"
      },
      {
        "name": "identity.getMe"
      }
    ]
  }
}
```

## Behaviour with no endpoint of its own

| Topic | How it works |
|---|---|
| Routing (AC1) | `/api/{service}/…` is forwarded to that service's Vercel deployment, set by `GATEWAY_ROUTES`. Services accept requests only with the gateway's shared header (`X-01scale-Gateway`), so they cannot be reached at their own addresses from a browser. |
| Who is calling (AC2, E1-06) | A session cookie or `Authorization: Bearer sk_01s_…` is exchanged at Identity's `POST /token` for a 5-minute access token, cached until 30 seconds before expiry, and forwarded as `Authorization: Bearer <access token>`. Cookies and API keys are removed before forwarding. Without either, public endpoints pass through and the rest answer `401`. |
| Pages (E1-06 AC1) | Middleware sends signed-out visitors of `/documents`, `/review`, `/pay`, `/success` and `/account` to `GET /api/identity/v1/auth/login?return_to=…`. |
| Origin check (AC4) | Writes made with a cookie need `Origin: https://01scale.com`; otherwise `403 origin_not_allowed`. Calls with an API key are not checked, as they come from no browser. |
| Rate limits (AC4) | Per IP: 300 a minute; per user: 600 a minute; tighter limits on login endpoints (set in Identity's spec). Over the limit: `429 rate_limited` with `Retry-After`. Starting values. |
| Request IDs (AC4) | Adds `X-Request-Id` (`req_` and a UUIDv7) to every request and response. |
| No logic, no data (AC5) | The gateway has no database and no business rules; it only routes, authenticates, limits and combines contracts. |

## Constraints at the API level

- Every request gets a request ID and a rate limit.
- Cookie writes need a 01scale Origin.
- Services receive only access tokens.
