"""Design of the gateway: apps/web at 01scale.com/api.

Data only: scripts/site/render.py turns MODULE into docs/services/gateway/*.md.
No product page of its own (slug ""). Story: MVP1-E0-08, with E1-06's route protection.
"""
import json

from render import endpoint, error, journey, param, response, problem

KEY = "gateway"
COMPLETE = True

ENDPOINTS = [
    endpoint("health", "GET", "/api/health", "Public", "MVP1-E0-08", "Platform health",
             "The gateway and every service behind it.", [],
             ["Calls each service's `GET /api/{service}/v1/health` in parallel with a 2-second timeout.", "A slow or failing service is `down`; the platform still answers `200` while the gateway itself is up."],
             [response("200", "The gateway is up", "`status` (`ok` or `degraded`) and `services` (each `ok` or `down`, with its version).")],
             [error("503", "gateway_unhealthy", "The gateway cannot serve requests.")],
             "GET /api/health HTTP/1.1",
             json.dumps({"status": "degraded", "services": {"identity": {"status": "ok", "version": "1.2.0"}, "upload": {"status": "ok", "version": "1.4.0"}, "extraction": {"status": "down"}, "review": {"status": "ok", "version": "1.0.3"}, "payment": {"status": "ok", "version": "1.1.0"}, "delivery": {"status": "ok", "version": "1.0.1"}, "docflow": {"status": "ok", "version": "1.0.0"}}}, indent=2)),
    endpoint("openapi", "GET", "/api/openapi.json", "Public", "MVP1-E0-08", "The whole platform's contract",
             "One OpenAPI 3.1 document merged from every service's own.", [],
             ["Fetches each service's `openapi.json`, prefixes component names with the service, and merges. Cached for 5 minutes.", "A service that is down is left out, and listed in `x-missing-services`."],
             [response("200", "Always", "The combined OpenAPI document.")], [],
             "GET /api/openapi.json HTTP/1.1",
             json.dumps({"openapi": "3.1.0", "info": {"title": "01scale platform", "version": "2026-11-17"}, "paths": {"/api/upload/v1/files": {"post": {"operationId": "upload.createFile"}}}, "x-missing-services": []}, indent=2)),
    endpoint("mcp", "POST", "/api/mcp", "Signed in", "MVP1-E0-08", "The whole platform's MCP server",
             "Every service's tools in one MCP server, named `<service>.<operationId>`.",
             [param("Authorization", "header", "string", "Yes", "`Bearer sk_01s_…` (an API key) or the session cookie.", "Who the agent acts for."),
              param("JSON-RPC message", "body", "object", "Yes", "MCP over Streamable HTTP.", "The agent's request.")],
             ["`tools/list` merges each service's tools and adds the service prefix.", "`tools/call` strips the prefix and forwards to `POST /api/{service}/mcp` with the access token."],
             [response("200", "Valid JSON-RPC", "The MCP result.")],
             [error("401", "not_authenticated", "No valid session or API key."), error("429", "rate_limited", "Over the limit; see `Retry-After`.")],
             "POST /api/mcp HTTP/1.1\nAuthorization: Bearer sk_01s_…\nContent-Type: application/json\n\n" + json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, indent=2),
             json.dumps({"jsonrpc": "2.0", "id": 1, "result": {"tools": [{"name": "upload.createFile"}, {"name": "docflow.listDocuments"}, {"name": "identity.getMe"}]}}, indent=2)),
]

ENDPOINTS[2]["scope"] = "Per tool: each tool needs the scope of the endpoint it mirrors"

NO_ENDPOINT = [
    {"topic": "Routing (AC1)", "how": "`/api/{service}/…` is forwarded to that service's Vercel deployment, set by `GATEWAY_ROUTES`. Services accept requests only with the gateway's shared header (`X-01scale-Gateway`), so they cannot be reached at their own addresses."},
    {"topic": "Calls between services (decision on #21)", "how": "Services and apps call each other through the gateway, at the same public address as every other client, because each service's API is its product. One extra hop per call is the accepted cost; the gateway stays thin."},
    {"topic": "Who is calling (AC2, E1-06)", "how": "A session cookie or `Authorization: Bearer sk_01s_…` is exchanged at Identity's `POST /token` for a 5-minute access token, cached until 30 seconds before expiry, and forwarded as `Authorization: Bearer <access token>`. Cookies and API keys are removed before forwarding. A request that already carries an access token (`Bearer eyJ…`: a service or delegated token from Identity) is checked for signature and expiry and passed on unchanged. Without any of these, public endpoints pass through and the rest answer `401`."},
    {"topic": "Pages (E1-06 AC1)", "how": "Middleware sends signed-out visitors of `/documents`, `/review`, `/pay`, `/success` and `/account` to `GET /api/identity/v1/auth/login?return_to=…`."},
    {"topic": "Origin check (AC4)", "how": "Writes made with a cookie need `Origin: https://01scale.com`; otherwise `403 origin_not_allowed`. Calls with an API key are not checked, as they come from no browser."},
    {"topic": "Rate limits (AC4)", "how": "Per user: 100 requests a minute across all endpoints, to begin with (Nikhil's decision on #64). Per IP: 300 a minute, so one address cannot exhaust the platform. Tighter limits on sign-in endpoints (set in Identity's spec). Over a limit: `429 rate_limited` with `Retry-After`. In MVP1 these are Vercel firewall rules; higher limits come with paid plans (`MVP2-E13-06`)."},
    {"topic": "Request IDs (AC4)", "how": "Adds `X-Request-Id` (`req_` and a UUIDv7) to every request and response."},
    {"topic": "No logic, no data (AC5)", "how": "The gateway has no database and no business rules; it only routes, authenticates, limits and combines contracts."},
]

JOURNEYS = [
    journey("A browser calls the platform", "A signed-in person", "A page calls an API.", ["MVP1-E0-08", "MVP1-E1-06"], [
        ("Uses a page; the page calls `/api/upload/v1/files`.", "The gateway checks Origin and the rate limit, exchanges the cookie for an access token, and forwards."),
        ("Sees the result.", "The service verified the token itself and answered; the gateway added `X-Request-Id`."),
    ], "Services never saw the cookie."),
    journey("A service calls another service", "DocFlow, acting for a user after an extraction", "Needs to create a Review task.", ["MVP1-E0-08", "MVP1-E1-03"], [
        ("Gets a delegated token from Identity, through the gateway.", "Identity signs a 5-minute token for the user with `act: service:docflow`."),
        ("Calls `https://01scale.com/api/review/v1/tasks` with it.", "The gateway checks the token's signature and expiry, adds `X-Request-Id`, and forwards it unchanged."),
    ], "The same address, rules and logs as any other caller."),
    journey("An agent connects", "An AI agent with an API key", "Is set up with the platform's MCP address.", ["MVP1-E0-08", "MVP1-E0-06"], [
        ("Connects to `POST /api/mcp` and lists tools.", "The gateway exchanges the key, merges every service's tools."),
        ("Calls `docflow.listDocuments`.", "The gateway forwards to DocFlow's MCP server with an access token limited to the key's scopes."),
    ], "One address for the whole platform."),
    journey("Open a protected page while signed out", "Anyone with a link", "Opens `/documents`.", ["MVP1-E1-06"], [
        ("Opens the link.", "Middleware redirects to sign-in with `return_to=/documents`."),
        ("Signs in and lands on `/documents`.", "Identity returns them to the page."),
    ], "No dead ends."),
]

EDGE_CASES = [
    {"situation": "A service is down", "sees": "That service's features fail with 'Try again in a moment'; others keep working.", "code": "`dependency_unavailable`"},
    {"situation": "Too many requests", "sees": "'Slow down', and the agent waits for `Retry-After`.", "code": "`rate_limited`"},
    {"situation": "A cookie write from another site", "sees": "Refused.", "code": "`origin_not_allowed`"},
    {"situation": "Session expired", "sees": "Pages redirect to sign-in; API calls get 401.", "code": "`not_authenticated`"},
]

MODULE = {
    "slug": "",
    "docsPath": "docs/services/gateway",
    "extraDocs": [],
    "notes": {"journey": "The gateway has no screens; these are the paths requests take through it.", "ui": "", "hosted": "", "token": "", "schema": ""},
    "overview": {
        "name": "Gateway", "version": "Version 1 · `apps/web` at 01scale.com/api", "status": "Designed, not built", "base": "/api",
        "what": [
            "The gateway is the platform's one address: every browser, app and agent calls `01scale.com/api/…`, and the gateway sends each request to the service that owns it.",
            "It also turns a session cookie or an API key into a short-lived access token, so the services only ever check one kind of credential, and it combines every service's contract and MCP tools into one.",
        ],
        "why": [
            {"title": "One address", "text": "Callers do not need to know where each service runs, and services can move without breaking anyone."},
            {"title": "Services never see cookies or keys", "text": "Only a 5-minute token reaches a service, so a leak from one service is short-lived."},
            {"title": "Agents discover everything at once", "text": "One OpenAPI document and one MCP server for the whole platform."},
        ],
        "scope_in": ["Routing by path, for browsers, agents, apps and services alike", "Cookie and API key to access token; service and delegated tokens passed through", "Combined OpenAPI and MCP", "Rate limits, Origin check, request IDs", "Platform health"],
        "scope_out": ["Business logic or data: never", "OAuth for agents: later", "Caching responses: not planned"],
        "stories": ["MVP1-E0-08", "MVP1-E1-06"],
    },
    "flow": [
        {"who": "Gateway", "what": "Adds a request ID and applies the rate limit."},
        {"who": "Gateway", "what": "Checks Origin for cookie writes; exchanges the cookie or API key at Identity for an access token."},
        {"who": "Gateway", "what": "Forwards to the owning service without the cookie or key."},
        {"who": "Service", "what": "Verifies the token itself and answers."},
    ],
    "concepts": [{"term": "Access token", "meaning": "The 5-minute JWT Identity signs; the only credential services accept."}],
    "quickstart": [{"title": "Discover the platform", "text": "No sign-in needed.", "lang": "bash", "code": "curl https://01scale.com/api/openapi.json"},
                   {"title": "Connect an agent", "text": "With an API key from the account page.", "lang": "json", "code": json.dumps({"mcpServers": {"01scale": {"url": "https://01scale.com/api/mcp", "headers": {"Authorization": "Bearer ${ZEROONE_API_KEY}"}}}}, indent=2)}],
    "env": [
        {"name": "GATEWAY_ROUTES", "value": "Each service's deployment address, as JSON", "secret": "No"},
        {"name": "GATEWAY_SERVICE_KEY", "value": "Proves the gateway to Identity's `POST /token` and to services", "secret": "Yes"},
    ],
    "openQuestions": ["Where rate-limit counters live on Vercel (Vercel's firewall rules, or a small store such as Upstash). The gateway has no database by design.",
                      "Whether services are on their own Vercel projects from the start, or one project until a second deployment is needed."],
    "errorSample": problem("rate_limited", "Too many requests", 429, "Try again in 12 seconds."),
    "endpoints": ENDPOINTS,
    "noEndpoint": NO_ENDPOINT,
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": ["Every request gets a request ID and a rate limit.", "Cookie writes need a 01scale Origin.", "Services receive only access tokens."]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": ["None: the gateway has no database."]},
        {"level": "Data model level: business rules the service guarantees", "items": ["No business logic and no stored data."]},
    ],
}
