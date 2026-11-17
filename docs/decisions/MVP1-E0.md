# MVP1-E0 · Foundation: decision log

## 2026-11-17 · Every call between services goes through the gateway

**Decided by:** Nikhil, resolving finding M2 of `docs/architecture/reviews/2026-11-17-mvp1.md`. Discussion: issue #21.

**Options.**
- **Through the gateway (chosen):** every caller uses `01scale.com/api/{service}/v1/…`, whether it is an app, a UI component or an agent.
- **Direct:** apps call each service's own deployment address.

**Why.** 01scale is API first, and each service's UI components are designed on their own. A service's public API is its only interface. Every caller uses the same address, rules, rate limits, request IDs and logs, and where a service runs is known only to the gateway.

**Cost accepted.**
- One extra network hop per call.
- The gateway is critical for internal traffic, so it stays thin, with no logic and no data.

**Consequences.**
1. The gateway also passes through a valid access token (a service or delegated token), checking only its signature and expiry.
2. `callService()` always uses the gateway's address.
3. Services refuse requests that did not come through the gateway.
4. The "How it runs" diagram is updated to match.

## 2026-11-17 · Route events to the app that started the work; the app is the orchestrator

**Decided by:** Nikhil, resolving finding m3 of the same review. Discussion: issue #13.

**Options.**
- **Route by reference prefix now (chosen).**
- **Send every event to every subscriber, and filter when a second app arrives.**
- **Move to an event-driven architecture with a broker now.**

**Why.**
- With one app and one consumer per event, orchestration by the app is the simplest design to build, debug and explain (ARCHITECTURE.md §12.3).
- Routing by `reference` prefix (`docflow:` → DocFlow's webhook) keeps apps from seeing each other's events, without a broker.
- `identity.user.deleted` still goes to every service and app.

**Future.** When I build a second app on the platform, I will move to an event-driven architecture: services publish to a broker, and any number of consumers subscribe. The event shapes and the outbox stay; only the delivery changes.

**Consequences.**
1. The template's outbox routes by prefix (`EVENT_ROUTES`).
2. ARCHITECTURE.md §12.6 records the second app as the trigger for moving to events.
