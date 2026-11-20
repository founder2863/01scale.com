# Gateway service — user journeys

> **Version 1 · `apps/web` at 01scale.com/api.** Status: designed, not built. Stories: `MVP1-E0-08`, `MVP1-E1-06`.

The gateway has no screens; these are the paths requests take through it.

## A browser calls the platform

**Who:** A signed-in person · **Starts when:** A page calls an API. · **Stories:** `MVP1-E0-08`, `MVP1-E1-06`

| Step | The person | The system |
|---|---|---|
| 1 | Uses a page; the page calls `/api/upload/v1/files`. | The gateway checks Origin and the rate limit, exchanges the cookie for an access token, and forwards. |
| 2 | Sees the result. | The service verified the token itself and answered; the gateway added `X-Request-Id`. |

**Result:** Services never saw the cookie.

## An agent connects

**Who:** An AI agent with an API key · **Starts when:** Is set up with the platform's MCP address. · **Stories:** `MVP1-E0-08`, `MVP1-E0-06`

| Step | The person | The system |
|---|---|---|
| 1 | Connects to `POST /api/mcp` and lists tools. | The gateway exchanges the key, merges every service's tools. |
| 2 | Calls `docflow.listDocuments`. | The gateway forwards to DocFlow's MCP server with an access token limited to the key's scopes. |

**Result:** One address for the whole platform.

## Open a protected page while signed out

**Who:** Anyone with a link · **Starts when:** Opens `/documents`. · **Stories:** `MVP1-E1-06`

| Step | The person | The system |
|---|---|---|
| 1 | Opens the link. | Middleware redirects to sign-in with `return_to=/documents`. |
| 2 | Signs in and lands on `/documents`. | Identity returns them to the page. |

**Result:** No dead ends.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| A service is down | That service's features fail with 'Try again in a moment'; others keep working. | `dependency_unavailable` |
| Too many requests | 'Slow down', and the agent waits for `Retry-After`. | `rate_limited` |
| A cookie write from another site | Refused. | `origin_not_allowed` |
| Session expired | Pages redirect to sign-in; API calls get 401. | `not_authenticated` |
