# Service template service — developer guide

> **Version 1 · `packages/service-kit` and `services/_template`.** Status: designed, not built. Stories: `MVP1-E0-01`, `MVP1-E0-02`, `MVP1-E0-03`, `MVP1-E0-05`, `MVP1-E0-07`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md).

## What this service is

The service template is what every 01scale platform service starts from, so each new service is mostly copying and all of them behave the same way.

It gives a service its health check, its contract and MCP tools, access-token checks, one error format, audit, idempotency, paging, signed events in and out, and safe calls to other services. The service adds only its own endpoints and tables.

## Why it exists

| Reason | In plain terms |
|---|---|
| Learn the rules once | A developer or an agent who has used one service can use them all. |
| Security is not optional | Token checks, audit and the boundary check are in the template, so no service forgets them. |
| Independent releases | Each service has its own pipeline and deploys alone; the template is the only thing they share. |
| Nothing lost between services | The outbox and inbox make events reliable without a message broker. |

## What is in this version

**In scope**

- Health, OpenAPI and MCP endpoints
- Audit, idempotency, outbox and inbox tables in every schema
- Token checks, errors, paging, request IDs, logs, service calls
- Per-service pipelines and the boundary check (E0-03, E0-07)

**Not in this version**

- A message queue (SQS): MVP2, where a second consumer needs one
- OAuth for agents: later
- The eval harness: Extraction's (E0-04)

## How it works

| Step | Who | What happens |
|---|---|---|
| 1 | Gateway | Forwards a request with an access token and `X-Request-Id`. |
| 2 | This service | Verifies the token, validates the input with zod, applies idempotency. |
| 3 | This service | Changes its data, writes audit and outbox rows in the same transaction. |
| 4 | This service | The delivery job sends outbox events, signed, to subscribers' `POST /events`. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Outbox | Events stored with the change, then delivered, so an event is never lost or sent for a rolled-back change. |
| Inbox | `inbound_events`: the IDs of events already handled, so a repeat does nothing. |
| Boundary check | A lint rule that fails if a service reaches into another service's code or schema. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. A handler

Every endpoint looks like this once the template exists.

```ts
export const POST = route({
  scope: "upload:write", idempotent: true, input: CreateFile, output: FileCreated,
  async handler({ user, input, tx }) {
    const file = await files.create(tx, user.userId, input);
    await audit(tx, user, "document.uploaded", { type: "file", id: file.id });
    return { status: 201, body: { file } };
  },
});
```

### 2. Emit an event

In the same transaction as the change.

```ts
await emit(tx, "identity.user.deleted", { user_id }, subscribers);
```

## Endpoints at a glance

Base address: `https://01scale.com/api/{service}/v1`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Is the service up |
| `GET` | `/openapi.json` | Public | The service's contract |
| `GET` | `/audit-events` | Signed in | My audit events in this service |
| `POST` | `/events` | Service | Receive platform events |
| `POST` | `/api/{service}/mcp` | Signed in | The service's MCP server |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `<SERVICE>_DATABASE_URL` | Neon connection string for that service's role | Yes |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks` | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64; shared by the platform's services | Yes |

## Open questions

- One signing key for all events is simplest; a key per sender would limit what one leaked key can forge. I chose one key for MVP1.
- How the outbox delivery job runs on Vercel: a cron every minute plus an immediate attempt after the transaction commits.
