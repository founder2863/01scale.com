# Status and handoff

Read this at the start of every session, after CLAUDE.md. Update it in the PR that changes what it says (a story shipped, a decision made, a question answered). Last updated: 22 Nov 2026, after PR #146 and the issue clean-up (#61, #109, #148 to #155 closed with costs).

## Where things stand

- **Nothing is in flight.** Every PR up to #146 is merged; no branch holds unmerged work.
- **The site** (Next.js at the repo root, not yet `apps/web`) has: Home (E0-36 to E0-42), Products with app pages (side menu, E0-48) and module pages (15 sections, phone Sections button and Previous / Next, E0-49), Platform (Core, Platform and Apps Architecture, E0-22, E0-23, E0-43), How It's Built (Skills, Token Costs, Agents, Total Projected Cost, Constraints, Expensive Mistakes with four project lessons and the Payments article, E0-45 to E0-47).
- **No platform service is built.** Every API and table is designed in the stories; Identity and Upload have full design documents (`scripts/site/*_design.py`).
- **Token costs** are recorded through the last request of session `fdd431bb` ($331.50 over 218 requests; its last two requests show as pending because the tool had not priced them yet, and stay pending since that session has ended). New sessions add their own session to the ledger.

## Stories by state (site and process stories, epic E0 and E8)

| State | Stories |
|---|---|
| Built, issue closed | E0-10, E0-11, E0-12, E0-13 (#61), E0-17, E0-21, E0-22, E0-23, E0-31 (#109), E0-32 to E0-35, E0-36 to E0-43 (#148 to #155, created after the work), E0-45 to E0-49, E8-01 |
| Built, no issue by design | AUTOREP-E1-04 and AUTOREP-E6-03 (AutoRep stories live in the file only) |
| Placeholder only ("Coming Soon..." on every module page) | E0-14 Market Outlook (#84), E0-15 PRD Reference (#85), E0-16 MCP (#86), E0-20 Architecture (#97), E0-27 to E0-30 Metrics, Monetization, GTM, Support (#104 to #107) |
| Story only, decided, not built | E0-44 product names and versions (#133; build when Nikhil says go), E8-02 to E8-08 (#127 to #132, #135) |
| Not started | E0-01 to E0-09 (foundation code), E0-18, E0-19, E0-24 (Built on: Platform Core components, not the app Built On section), E0-25, E0-26, and epics E1 to E7 |

## Open questions waiting for Nikhil

- DocFlow V1 "What each step adds over time" also describes V2 and sits in Overview: keep, or move to the V2 page? (PR #144)
- Add the token and development cost to the issues closed before the cost rule (E0-10 to E0-12, E0-17, E0-21 to E0-23, E0-32 to E0-35, E0-45 to E0-49, E8-01)? #61, #109 and #148 to #155 already have them.

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

## Next, in order (from CLAUDE.md and the epics)

1. E0-07 service template, then E0-08 gateway, then the rest of E0.
2. E1 Identity with Cognito.
3. Whenever Nikhil says go: E0-44 rename, E8-02 onward.
