# Service template service — user journeys

> **Version 1 · `packages/service-kit` and `services/_template`.** Status: in design. Stories: `MVP1-E0-01`, `MVP1-E0-02`, `MVP1-E0-03`, `MVP1-E0-05`, `MVP1-E0-07`.

Developer and agent journeys: the template has no screens.

## Start a new service

**Who:** The owner, building a service · **Starts when:** A new service's story is picked up. · **Stories:** `MVP1-E0-07`

| Step | The person | The system |
|---|---|---|
| 1 | Copies `services/_template` to `services/<name>` and sets the name. | The template brings health, OpenAPI, MCP, audit, events, idempotency and the four tables. |
| 2 | Writes the story's zod schemas, service functions and route handlers. | OpenAPI and MCP tools are generated from the zod schemas. |
| 3 | Opens a pull request. | Only that service's pipeline runs: lint, types, tests, migrations on PGlite, the boundary check and the OpenAPI diff. |
| 4 | Merges. | The service deploys on its own Vercel project; migrations run first. |

**Result:** A new service that behaves like every other one.

## An agent discovers and uses a service

**Who:** An AI agent with a user's API key · **Starts when:** Is pointed at 01scale.com. · **Stories:** `MVP1-E0-05`, `MVP1-E0-06`

| Step | The person | The system |
|---|---|---|
| 1 | Reads `GET /api/openapi.json` or connects to `POST /api/mcp`. | The gateway combines every service's contract and tools. |
| 2 | Calls a tool, retrying with the same idempotency key after a timeout. | The service returns the first response again instead of acting twice. |
| 3 | Gets an error and branches on its `code`. | Every service uses the same problem shape and codes. |

**Result:** The agent learned the rules once.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| A retry reuses a key with a different body | An error saying the key was already used for another request. | `idempotency_key_reused` |
| Another service is down | 'Something went wrong. Try again in a moment.' Nothing half-done. | `dependency_unavailable` |
| Too many requests | Wait and retry after the time in `Retry-After`. | `rate_limited` |
| An agent's key lacks a scope | The agent is told which scope it needs. | `insufficient_scope` |
| An event is sent with a wrong or old signature | Nothing; the event is refused. | `invalid_signature` |
