# Gateway service — developer guide

> **Version 1 · `apps/web` at 01scale.com/api.** Status: designed, not built. Stories: `MVP1-E0-08`, `MVP1-E1-06`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md).

## What this service is

The gateway is the platform's one address: every browser, app and agent calls `01scale.com/api/…`, and the gateway sends each request to the service that owns it.

It also turns a session cookie or an API key into a short-lived access token, so the services only ever check one kind of credential, and it combines every service's contract and MCP tools into one.

## Why it exists

| Reason | In plain terms |
|---|---|
| One address | Callers do not need to know where each service runs, and services can move without breaking anyone. |
| Services never see cookies or keys | Only a 5-minute token reaches a service, so a leak from one service is short-lived. |
| Agents discover everything at once | One OpenAPI document and one MCP server for the whole platform. |

## What is in this version

**In scope**

- Routing by path, for browsers, agents, apps and services alike
- Cookie and API key to access token; service and delegated tokens passed through
- Combined OpenAPI and MCP
- Rate limits, Origin check, request IDs
- Platform health

**Not in this version**

- Business logic or data: never
- OAuth for agents: later
- Caching responses: not planned

## How it works

| Step | Who | What happens |
|---|---|---|
| 1 | Gateway | Adds a request ID and applies the rate limit. |
| 2 | Gateway | Checks Origin for cookie writes; exchanges the cookie or API key at Identity for an access token. |
| 3 | Gateway | Forwards to the owning service without the cookie or key. |
| 4 | Service | Verifies the token itself and answers. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Access token | The 5-minute JWT Identity signs; the only credential services accept. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Discover the platform

No sign-in needed.

```bash
curl https://01scale.com/api/openapi.json
```

### 2. Connect an agent

With an API key from the account page.

```json
{
  "mcpServers": {
    "01scale": {
      "url": "https://01scale.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ${ZEROONE_API_KEY}"
      }
    }
  }
}
```

## Endpoints at a glance

Base address: `https://01scale.com/api`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `GET` | `/health` | Public | None | Platform health |
| `GET` | `/openapi.json` | Public | None | The whole platform's contract |
| `POST` | `/mcp` | Signed in | Per tool: each tool needs the scope of the endpoint it mirrors | The whole platform's MCP server |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `GATEWAY_ROUTES` | Each service's deployment address, as JSON | No |
| `GATEWAY_SERVICE_KEY` | Proves the gateway to Identity's `POST /token` and to services | Yes |

## Open questions

- Where rate-limit counters live on Vercel (Vercel's firewall rules, or a small store such as Upstash). The gateway has no database by design.
- Whether services are on their own Vercel projects from the start, or one project until a second deployment is needed.
