# @01scale/ui-review changelog

## 0.2.0 — 23 Nov 2026 (MVP1-E4-05)

- New: EvalCandidatesTable and AccuracyReport, for an admin (counts and rates only; nothing exported). The client adds optional listEvalCandidates, decideEvalCandidate and getAccuracy.
- Each is shown live, in each of its states, on its module's UI Components section.

## 0.1.2 — 22 Nov 2026

- ReviewQueue: `allowShowAll` (default true) lets an app hide the 'Show all fields' toggle, for example until payment.

## 0.1.1 — 22 Nov 2026

- Uses `@01scale/ui-core` 0.1.1 (a wide tab panel no longer widens the page).

## 0.1.0 — 22 Nov 2026

- First components, as designed in `docs/services/review/UI-COMPONENTS.md`, built on `@01scale/ui-core` 0.1.0. First used by the DocFlow V1 clickable prototype; the Review service itself is not built yet, so the app supplies a mock client.
