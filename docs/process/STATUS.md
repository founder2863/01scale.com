# Status and handoff

Read this at the start of every session, after CLAUDE.md. Update it in the PR that changes what it says (a story shipped, a decision made, a question answered). Last updated: 22 Nov 2026, with the PR for MVP1-E0-19 AC5 (live component galleries on module pages).

## Where things stand

- **In flight:** the MVP1-E0-19 AC5 PR (branch `claude/amazing-meitner-kpu3n6`): live component galleries on every module's UI Components section, and ten more components for what a DocFlow user meets. Every earlier PR is merged, #161 (design system, service UI packages, DocFlow prototype) included.
- **Service UI packages:** each `packages/ui-<service>` defines the client it needs from its own API (`createClientContext` in ui-core); the app supplies it: the mock in `app/products/docflow/try/mock-platform.ts` today, the gateway once the service is built. DocFlow's own sections and the Cognito and Stripe stand-ins stay in the app (Nikhil, 22 Nov 2026).
- **Workspaces:** the root `package.json` now has `"workspaces": ["packages/*"]`; the site stays at the root until E0-07 moves it to `apps/web`. Run `npm install` after pulling.
- **The site** (Next.js at the repo root, not yet `apps/web`) has: Home (E0-36 to E0-42), Products with app pages (side menu, E0-48) and module pages (15 sections, phone Sections button and Previous / Next, E0-49), Platform (Core, Platform and Apps Architecture, E0-22, E0-23, E0-43), How It's Built (Skills, Token Costs, Agents, Total Projected Cost with four tabs (E8-10), Constraints, Expensive Mistakes with four project lessons and the Payments article, E0-45 to E0-47).
- **No platform service is built.** Every API and table is designed in the stories; Identity and Upload have full design documents (`scripts/site/*_design.py`).
- **Token costs** are recorded through the last request of session `fdd431bb` ($331.50 in the ledger; the tool stopped pricing this session's requests after 19:00 UTC, so its last six show as pending; they carry an upper-bound estimate of about $4.91 in `estimated_usd`, worked out by `scripts/costs/estimate_pending.py` and kept out of the measured totals). Session `43ccd0e7` (MVP1-E8-09) is recorded too: its four requests were never priced, estimated at about $2.47 the same way. In all, 10 of the 16 pending requests carry an estimate ($7.38); the other six are older and have none. New sessions add their own session to the ledger.

## Stories by state (site and process stories, epic E0 and E8)

| State | Stories |
|---|---|
| Built, PR open | E0-19 AC5: live component galleries (`app/products/gallery/`); account and admin components are marked "Designed, not built yet" |
| Built, PR merged | E0-19 AC1 to AC4 and AC6 (PR #161; `packages/ui-core` 0.1.0, site uses its tokens); E0-18 for the DocFlow app only (User Journey section, against an in-browser mock); E0-07 AC6 in part (the six service UI packages exist, against a mock client) |
| Built, PR merged | E8-09 (#156, PR #159): `npm run human-costs`, skill `estimate-human-cost`, `docs/process/cost-model.json`, `app/how-its-built/human-costs.ts`; E8-10 (#157, PR #160): Total Projected Cost with four tabs (Actual Token Cost So Far, Estimated Human Cost So Far, Projected Token Cost as Coming Soon until E8-06, Projected Human Cost) |
| Built, issue closed | E0-10, E0-11, E0-12, E0-13 (#61), E0-17, E0-21, E0-22, E0-23, E0-31 (#109), E0-32 to E0-35, E0-36 to E0-43 (#148 to #155, created after the work), E0-45 to E0-49, E8-01 |
| Built, no issue by design | AUTOREP-E1-04 and AUTOREP-E6-03 (AutoRep stories live in the file only) |
| Placeholder only ("Coming Soon..." on every module page) | E0-14 Market Outlook (#84), E0-15 PRD Reference (#85), E0-16 MCP (#86), E0-20 Architecture (#97), E0-27 to E0-30 Metrics, Monetization, GTM, Support (#104 to #107) |
| Story only, decided, not built | E0-44 product names and versions (#133; build when Nikhil says go), E8-02 to E8-08 (#127 to #132, #135) |
| Not started | E0-01 to E0-09 (foundation code, except E0-07 AC6 above), E0-18 per module, E0-24 (Built on: Platform Core components, not the app Built On section), E0-25, E0-26, and epics E1 to E7 |

## Open questions waiting for Nikhil

- DocFlow V1 "What each step adds over time" also describes V2 and sits in Overview: keep, or move to the V2 page? (PR #144)

## Known issues

- `scripts/costs/extract_session.py` fits rates for one model only, so the session's cost by token type (`by_kind_usd`) covers part of the session. The per-request costs and totals are right. Fix in a small story.
- `marked` was added in #142: run `npm install` after pulling before `npm run build`.
- This environment cannot reach Vercel previews or linkedin.com. Check pages locally: `npm run build`, `npx next start -p <port>`, then Playwright (installed; `require('playwright')`).

## Working efficiently (cost)

- **One story per session.** A long conversation re-reads its whole context on every step (about $0.05 a step at 230K tokens) and re-writes it after a break of more than an hour (about $2 at that size, $7 to $9 when it was larger). See the Expensive Mistakes article "The cold-cache tax".
- **Batch decisions.** Ask the questions together, get the answers together, then build once. Agree wording before building pages (article "Built before the words were final").
- **Record token costs in the PR** (CLAUDE.md step 7). The ledger matches rows by session and timestamp; pass the session's existing `splits` to the extractor.
- **Stack only when needed.** If a branch builds on an open PR, say "merge #N first" in the description; when the first merges, merge main into the second.
- **Merge conflicts:** explain and ask first (CLAUDE.md step 11).

## Costs on closed issues

Every closed story issue (27 of them) carries its measured token cost and estimated human cost, at $1,000 per engineer-day (Nikhil: a good estimate for engineers). Combined ledger blocks (E0-22/23, E0-32 to E0-35, E0-36 to E0-42) were split by story size, and the comment says so. From now on the figures come from `npm run human-costs` (skill `estimate-human-cost`): on 22 Nov, 27 done stories = 131 person-days = $131,000 so far; every MVP1 story (E8 included) and AutoRep V1 story = 113 stories, 691 person-days, $691,000 projected. Nikhil on PR #159: E8 work counts; AutoRep stories, which have no issues, are not counted as done. The comments typed by hand earlier summed to about $137,000; the script's figure replaces it.

## Next, in order (from CLAUDE.md and the epics)

0. **E8-10 is merged (PR #160):** close its issue #157 with costs (CLAUDE.md step 8, skill `estimate-human-cost`). Projected Token Cost stays "Coming Soon..." until E8-06. When the E0-19 AC5 PR merges, close E0-19's issue with its costs (it spans PR #161 and that PR). E0-18 stays open until Try it is on every module page.
1. E0-07 service template, then E0-08 gateway, then the rest of E0.
2. E1 Identity with Cognito.
3. Whenever Nikhil says go: E0-44 rename, E8-02 onward.
