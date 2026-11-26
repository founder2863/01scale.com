# Token costs

What it costs to build 01scale with Claude Code, per story. Generated from `docs/process/token-ledger.json` by `npm run costs`; do not edit by hand.

Updated 2026-11-26. 275 requests across 9 session(s). Total **$415.56** for 915.9 million tokens.

## Per story

| Story | Requests | Tokens | Build cost | Rework cost | Total | Token yield |
|---|---|---|---|---|---|---|
| Phase 0 · Site launch (home page, demos, theme) | 7 | 5.09M | $2.65 | $0.70 | $3.35 | 78% |
| Design · API and database for every story | 2 | 9.80M | $3.08 | $8.09 | $11.17 | 22% |
| Architecture decision and Architecture page | 3 | 6.79M | $3.07 | $0.00 | $3.07 | 100% |
| MVP1-E1 · Login design (Identity, version 1) | 6 | 13.64M | $9.90 | $9.04 | $18.94 | 38% |
| MVP1-E1-01 · Cognito setup guidance | 4 | 3.17M | $1.00 | $0.00 | $1.00 | 100% |
| MVP1-E0-10 · Products pages and navigation | 1 | 7.75M | $4.87 | $0.00 | $4.87 | 100% |
| MVP1-E0-11 · Product vision page | 3 | 9.08M | $2.45 | $0.95 | $3.40 | 66% |
| MVP1-E0-12 · Design skills and How It's Built | 4 | 16.06M | $20.66 | $2.19 | $22.85 | 32% |
| MVP1-E0-13 · Token cost tracking | 6 | 36.86M | $8.44 | $5.53 | $13.97 | 26% |
| MVP1-E2 · Upload design | 4 | 33.51M | $5.01 | $2.23 | $7.24 | 62% |
| MVP1-E3 · Extraction design | 1 | 15.65M | $4.03 | $0.00 | $4.03 | 100% |
| MVP1-E4 · Human Review design | 6 | 20.75M | $1.73 | $2.52 | $4.25 | 28% |
| MVP1-E5 · DocFlow app design (JSON and CSV output) | 1 | 2.67M | $0.94 | $0.00 | $0.94 | 100% |
| MVP1-E6 · Payment design | 2 | 9.70M | $1.51 | $8.01 | $9.52 | 53% |
| MVP1-E7 · Delivery design | 3 | 14.69M | $0.87 | $1.94 | $2.81 | 24% |
| MVP1-E1-05, E0-06 · Account management design | 3 | 9.04M | $1.77 | $16.48 | $18.25 | 21% |
| MVP1-E0-07, E0-08 · Service template and gateway design | 1 | 1.39M | $0.95 | $0.00 | $0.95 | 100% |
| Architect skill and MVP1 architecture review | 3 | 19.69M | $3.31 | $4.09 | $7.40 | 29% |
| Founder decisions on MVP1 design questions (17 Nov) | 11 | 47.67M | $0.00 | $19.59 | $19.59 | 0% |
| MVP1-E0-14 to E0-16 · Market Outlook, PRD Reference and MCP (stories) | 2 | 4.07M | $0.91 | $0.00 | $0.91 | 100% |
| MVP1-E0-17 · Token yield explained on Token Costs | 2 | 11.77M | $2.19 | $0.00 | $2.19 | 100% |
| MVP1-E3-06 · Ask questions about my documents, RAG (story) | 1 | 4.21M | $0.84 | $0.00 | $0.84 | 100% |
| MVP2 stories: agents, roles and groups; scheduled payments; deactivation | 2 | 5.61M | $7.99 | $0.00 | $7.99 | 100% |
| Vercel Web Analytics on the site | 2 | 5.81M | $0.94 | $0.00 | $0.94 | 100% |
| MVP1-E0-18 to E0-21 · Try it, design system, architecture section, section order (stories) | 1 | 4.05M | $1.55 | $0.00 | $1.55 | 100% |
| MVP1-E0-22 to E0-30 · Platform Core, monitoring, security, product sections (stories) | 2 | 2.57M | $1.11 | $0.87 | $1.99 | 67% |
| MVP1-E0-31 · Costs tab and the Claude demo budget | 1 | 5.08M | $1.66 | $0.00 | $1.66 | 100% |
| MVP1-E0-22, E0-23 · Platform menu, Core and architecture pages | 1 | 7.34M | $2.21 | $0.00 | $2.21 | 100% |
| MVP1-E0-21 · Module page sections and two entry pages | 3 | 8.79M | $1.19 | $1.04 | $2.23 | 54% |
| Apps by version, and AutoRep V1 PRD and epics (stories) | 2 | 7.63M | $1.60 | $0.92 | $2.52 | 54% |
| MVP1-E0-32 to E0-35 · Products menu, app and service pages, a flow per app | 5 | 28.98M | $2.58 | $4.19 | $6.77 | 36% |
| MVP1-E0-36 to E0-42 · Home page: cover, numbers, companies, academics, recommendations | 15 | 54.13M | $4.37 | $28.93 | $33.30 | 30% |
| MVP1-E0-43 · Platform Architecture diagram | 2 | 5.29M | $0.95 | $0.00 | $0.95 | 100% |
| AUTOREP-E6-03 · AutoRep overview diagram | 2 | 8.59M | $1.75 | $0.00 | $1.75 | 100% |
| MVP1-E8 · Total projected cost (tab and stories) | 4 | 20.03M | $10.38 | $8.96 | $19.34 (part pending) | 75% |
| MVP1-E0-44 · Product names and versions (story) | 6 | 8.03M | $17.89 | $0.08 | $17.97 | 96% |
| MVP1-E0-47 · Payments article on Expensive Mistakes | 7 | 8.83M | $1.51 | $0.00 | $1.51 (part pending) | 75% |
| MVP1-E0-45 · Total tokens so far on the Token Costs tab | 2 | 2.84M | $0.48 | $0.23 | $0.71 | 68% |
| MVP1-E0-46 · Expensive Mistakes tab and four lessons | 2 | 3.44M | $1.27 | $0.00 | $1.27 | 100% |
| MVP1-E0-48 · App pages with the module side menu | 2 | 3.80M | $1.29 | $0.00 | $1.29 | 100% |
| MVP1-E0-49 · Section menu on phones, and Previous / Next | 2 | 4.57M | $1.19 | $0.00 | $1.19 | 100% |
| MVP1-E8-09 · Human cost script and skill | 2 | 4.91M | $0.00 | $0.00 | $0.00 (part pending) | 73% |
| MVP1-E8-10 · Total Projected Cost page, four tabs | 1 | 3.39M | $0.00 | $0.00 | $0.00 (part pending) | 100% |
| MVP1-E0-19 · Design system (packages/ui-core), service UI packages (E0-07 AC6) and the DocFlow V1 clickable prototype (E0-18 for DocFlow) | 6 | 61.08M | $13.62 | $6.39 | $20.02 | 60% |
| MVP1-E1-09, E3-07, E4-05 · Account and admin UI components (ui-identity, ui-extraction, ui-review) | 1 | 16.68M | $4.46 | $0.00 | $4.46 | 100% |
| MVP1-E8-11 · Name the navigation item "Total Cost" | 2 | 15.73M | $3.68 | $0.00 | $3.68 | 100% |
| MVP1-E0-50 · One Overview for every app (with the E0-51 story written alongside) | 3 | 4.97M | $2.47 | $0.00 | $2.47 | 100% |
| MVP1-E0-51 · DocFlow high-level design diagram | 1 | 5.37M | $0.00 | $0.00 | $0.00 (part pending) | 100% |
| MVP1-E3-08, E4-06, E5-05 · Results held for the app until it releases them (design) | 1 | 30.13M | $7.20 | $0.00 | $7.20 | 100% |
| MVP1-E3-09 · A free daily quota for jobs a person starts (design) | 1 | 13.54M | $3.20 | $0.00 | $3.20 | 100% |
| MVP1-E0-52 · Design system page shows the components | 1 | 7.20M | $2.98 | $0.00 | $2.98 | 100% |
| MVP1-E0-53 · Hide the app flow bands on module pages | 1 | 1.73M | $0.00 | $0.00 | $0.00 (part pending) | 100% |
| MVP1-E0-54 · Roadmap tab on How It's Built | 7 | 20.86M | $3.13 | $6.48 | $9.61 | 33% |
| MVP1-E8-12 · Four estimates per story, and the plan without and with Claude Code | 3 | 21.60M | $7.25 | $1.81 | $9.05 | 77% |
| **Total** | **169** | **705.68M** | **$190.07** | **$141.25** | **$331.32** (part pending) | **59%** |

## Scaffolding (not tied to a story)

| Area | Requests | Tokens | Cost |
|---|---|---|---|
| Access and tooling | 7 | 7.86M | $1.90 |
| Planning documents | 2 | 1.35M | $0.72 |
| Questions and explanations | 25 | 19.06M | $21.58 |
| Product discovery | 17 | 7.28M | $15.87 |
| Process | 55 | 174.67M | $46.04 |
| Tool overhead (background calls) | 0 | 0.00M | $-1.87 |
| **Total** | **106** | **210.22M** | **$84.23** |

## Totals

- Build $190.07, rework $141.25, scaffolding $84.23.
- Token yield across stories (build ÷ build + rework): 59%.
- 15 pending request(s) were never priced by the tool; estimated at about $12.59 from their measured tokens at list prices (an upper bound), not included in the totals above.
- Share of all tokens that went into kept story work: 46%.

## Definitions

- **Build**: work that produced something kept.
- **Rework**: work that changed or fixed something already delivered for the same story, because a requirement changed or a mistake was found.
- **Scaffolding**: work tied to no story: questions, discovery, tooling, process.
- **Token yield**: a story's build tokens divided by its build plus rework tokens.
- **Tokens** include context re-read from the cache, which is most of the volume but the cheapest part.
- **Tool overhead** is what Claude Code charged beyond the responses recorded for requests, such as its own background checks. It is counted under scaffolding.
- **Pending** means Claude Code had not yet priced those responses when the table was updated. Nothing is estimated.

## How it is measured

`scripts/costs/extract_session.py` reads a session transcript. Claude Code records its own running cost there; the script recovers the exact per-token rates it used and prices each response from its recorded tokens. A long request can be cut at split times (for example the commit that finished a story) so each story gets its own cost. The story, kind and summary of each request are assigned by hand in the ledger.
