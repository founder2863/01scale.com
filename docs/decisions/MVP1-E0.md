# MVP1-E0 · Foundation: decision log

## 2026-11-17 · Every call between services goes through the gateway

**Decided by:** Nikhil, resolving finding M2 of `docs/architecture/reviews/2026-11-17-mvp1.md`. Discussion: issue #21.

**Options.**
- **Through the gateway (chosen):** every caller uses `01scale.com/api/{service}/v1/…`, whether it is an app, a UI component or an agent.
- **Direct:** apps call each service's own deployment address.

**Why.** The platform components are independent apps among themselves: any app, internal or over the internet, can call them, so the gateway must always sit in between (reconfirmed on PR #72, 20 Nov 2026). 01scale is API first, and each service's UI components are designed on their own. A service's public API is its only interface. Every caller uses the same address, rules, rate limits, request IDs and logs, and where a service runs is known only to the gateway.

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

## 2026-11-21 · Products menu by app and version

**Decided by:** Nikhil (stories `MVP1-E0-32` to `E0-35`).

**Options.**
- **By build phase (before):** MVP1 and MVP2, with the modules under each.
- **By app and version (chosen):** DocFlow V1 · AutoRep V1 · P2PFlow V1 · Services V1 · DocFlow V2 · AutoRep V2 · P2PFlow V2 · Services V2.

**Why.** Visitors look for products, not build phases. A version per app shows that 01scale has several apps, and that the services are products in their own right.

**What stays.** Phases remain the way the work is organised: story IDs, epics files, issue labels and `CLAUDE.md`. Only the user-facing menu and pages use V1 and V2. DocFlow keeps its name (a rename to DocEx was considered and skipped); P2P is shown as P2PFlow; Order-to-Cash stays only in the architecture vision.

**Services, not "SysApp".** The platform services are listed as **Services**. They are products a developer or an app uses, but not apps: in the architecture, apps orchestrate services. Services (under Products) and Platform Core (under Platform) stay separate and link to each other.

## 2026-11-21 · Products menu: apps and services, with versions on their pages

**Decided by:** Nikhil, on PR #117, replacing the menu by app and version from the same day.

**Options.**
- **By version (merged in #117):** DocFlow V1 · AutoRep V1 · P2PFlow V1 · Services V1, then V2.
- **V1 and V2 as header items:** versions in the primary navigation.
- **Apps and services by name, versions on their pages (chosen).**

**Why.** An app's versions and a service's versions are independent: a V2 app can use a V1 service. A menu built on one shared V1/V2 implies they move together, and a "Services V1" bucket hides each service's own evolution. Listing products by name keeps the menu to nine items, and each page shows its versions, with a **Built on** table on app pages and **Used by** on service pages.

**What stays.** Products is the only header item for products. Phases stay MVP1 and MVP2 in story IDs, epics, labels and `CLAUDE.md`. P2PFlow stays in the menu, marked "Coming soon". Each version has its own address (`/products/docflow/v2`).
