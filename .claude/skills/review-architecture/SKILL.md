---
name: review-architecture
description: Review the whole 01scale design end to end as an architect - every service's API spec, data model, schema, journeys and components against each other, against the stories and against ARCHITECTURE.md and its sequence diagrams - and write a findings report. Use when asked for an architecture review, a design review across modules, a consistency check before building, or "does the design hang together".
---

# Review the architecture

A design can be right inside every module and still fail between them. This skill reads every design at once and looks for what breaks at the seams. It reviews; it does not redesign. Each finding names who should change what.

## Read first

1. `docs/architecture/ARCHITECTURE.md` (decisions, §12 communication and consistency, the sequence diagrams), `API-DESIGN.md`, `DATABASE-DESIGN.md`.
2. `docs/process/DESIGN-RULES.md`.
3. Every `scripts/site/*_design.py` and the documents generated from them in `docs/services/` (including `service-kit` and `gateway`).
4. The stories in `docs/epics/MVP1-EPICS.md` (or the phase being reviewed).

Run the mechanical checks first: `python3 scripts/site/review_architecture.py` lists every cross-service call that has no matching endpoint, and every service's error codes. Then read for the things a script cannot see.

## Check, in this order

1. **Contracts between services.** Every call one service or app makes to another names an endpoint that exists in the provider's spec, with the same method, path, access level and field names. Every event a service reacts to is emitted by its owner, with the same name and payload.
2. **Sequence diagrams.** Walk each diagram in `ARCHITECTURE.md` step by step against the specs. Each arrow is an endpoint or an event that exists; the order matches the behaviour lists; nothing in a diagram is missing from a spec, and nothing in a spec contradicts a diagram.
3. **Data ownership.** No table is in two services; no foreign key crosses a schema; every user-owned table has `owner_id` (`user_id` in Identity) and an index; every service handles `identity.user.deleted` for each of its user-owned tables, and says what it deletes or anonymizes.
4. **Consistency and failure.** For each multi-service step: what happens if the second call fails after the first succeeded, if an event arrives twice, late or out of order, and if a service is down. Each answer is designed somewhere (idempotency key, outbox, inbox, retry, compensating step) or it is a finding.
5. **Security.** Endpoints that set prices, send messages, or touch money or account security are service-only or session-only; another user's resource answers `404`; no secret or document content is logged, stored in plain text, or sent to a browser; files move only by presigned URL; webhooks are signed.
6. **Agents.** Every operation a person can do has an endpoint and an MCP tool, except those that must keep a human in the loop, which are named.
7. **Stories.** Every acceptance criterion maps to something designed. Every refinement beyond a story is flagged in that module's open questions. Contradictions between a story and a design are findings.
8. **Conventions.** Error shape and codes, pagination, idempotency, naming, UUIDv7, money in minor units, `timestamptz`, status lists. One code never means two things across services.

## Rules that are easy to get wrong

- Severity is about consequence, not effort: **Blocker** (cannot be built as designed, or loses data or money, or a security hole), **Major** (works, but two documents disagree or a failure case is undesigned), **Minor** (wording, naming, a missing sample).
- Every finding cites the exact documents and lines on both sides of the seam.
- Every finding names the owner of the fix (a service, an app, a story, or ARCHITECTURE.md) and a concrete proposal. If the right fix is a decision, say "Decision for Nikhil" and give the options.
- Do not fix designs in the same change as the review. Each fix is its own small pull request on the owning module, so the review stays a record.
- Do not repeat the open questions modules already raised unless the review adds something: link them instead.

## Output

`docs/architecture/reviews/<date>-<phase>.md` with: scope and method, a summary table (count by severity), findings grouped by severity (ID, title, where, why it matters, proposal, owner), what was checked and found sound, and the decisions needed. Add the report to the pull request description in brief.
