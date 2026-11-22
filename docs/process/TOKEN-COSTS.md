# Token costs

What it costs to build 01scale with Claude Code, per story. Generated from `docs/process/token-ledger.json` by `npm run costs`; do not edit by hand.

Updated 2026-11-22. 198 requests across 2 session(s). Total **$319.55** for 562.7 million tokens.

## Per story

| Story | Requests | Tokens | Build cost | Rework cost | Total | Token yield |
|---|---|---|---|---|---|---|
| Phase 0 · Site launch (home page, demos, theme) | 7 | 5.09M | $2.65 | $0.70 | $3.35 | 78% |
| Design · API and database for every story | 2 | 9.80M | $3.08 | $8.09 | $11.17 | 22% |
| Architecture decision and Architecture page | 3 | 6.79M | $3.07 | $0.00 | $3.07 | 100% |
| MVP1-E1 · Login design (Identity, version 1) | 6 | 13.64M | $9.90 | $9.03 | $18.93 | 38% |
| MVP1-E1-01 · Cognito setup guidance | 4 | 3.17M | $1.00 | $0.00 | $1.00 | 100% |
| MVP1-E0-10 · Products pages and navigation | 1 | 7.75M | $4.87 | $0.00 | $4.87 | 100% |
| MVP1-E0-11 · Product vision page | 3 | 9.08M | $2.45 | $0.95 | $3.40 | 66% |
| MVP1-E0-12 · Design skills and How It's Built | 4 | 16.06M | $20.66 | $2.17 | $22.83 | 32% |
| MVP1-E0-13 · Token cost tracking | 5 | 34.28M | $8.37 | $4.68 | $13.05 | 28% |
| MVP1-E2 · Upload design | 4 | 33.51M | $4.96 | $2.21 | $7.17 | 62% |
| MVP1-E3 · Extraction design | 1 | 15.65M | $3.99 | $0.00 | $3.99 | 100% |
| MVP1-E4 · Human Review design | 6 | 20.75M | $1.71 | $2.50 | $4.21 | 28% |
| MVP1-E5 · DocFlow app design (JSON and CSV output) | 1 | 2.67M | $0.93 | $0.00 | $0.93 | 100% |
| MVP1-E6 · Payment design | 2 | 9.70M | $1.50 | $7.94 | $9.44 | 53% |
| MVP1-E7 · Delivery design | 3 | 14.69M | $0.86 | $1.93 | $2.79 | 24% |
| MVP1-E1-05, E0-06 · Account management design | 3 | 9.04M | $1.76 | $16.34 | $18.09 | 21% |
| MVP1-E0-07, E0-08 · Service template and gateway design | 1 | 1.39M | $0.94 | $0.00 | $0.94 | 100% |
| Architect skill and MVP1 architecture review | 3 | 19.69M | $3.28 | $4.05 | $7.33 | 29% |
| Founder decisions on MVP1 design questions (17 Nov) | 11 | 47.67M | $0.00 | $19.41 | $19.41 | 0% |
| MVP1-E0-14 to E0-16 · Market Outlook, PRD Reference and MCP (stories) | 2 | 4.07M | $0.90 | $0.00 | $0.90 | 100% |
| MVP1-E0-17 · Token yield explained on Token Costs | 2 | 11.77M | $2.17 | $0.00 | $2.17 | 100% |
| MVP1-E3-06 · Ask questions about my documents, RAG (story) | 1 | 4.21M | $0.83 | $0.00 | $0.83 | 100% |
| MVP2 stories: agents, roles and groups; scheduled payments; deactivation | 2 | 5.61M | $7.92 | $0.00 | $7.92 | 100% |
| Vercel Web Analytics on the site | 2 | 5.81M | $0.93 | $0.00 | $0.93 | 100% |
| MVP1-E0-18 to E0-21 · Try it, design system, architecture section, section order (stories) | 1 | 4.05M | $1.53 | $0.00 | $1.53 | 100% |
| MVP1-E0-22 to E0-30 · Platform Core, monitoring, security, product sections (stories) | 2 | 2.57M | $1.10 | $0.86 | $1.97 | 67% |
| MVP1-E0-31 · Costs tab and the Claude demo budget | 1 | 5.08M | $1.65 | $0.00 | $1.65 | 100% |
| MVP1-E0-22, E0-23 · Platform menu, Core and architecture pages | 1 | 7.34M | $2.19 | $0.00 | $2.19 | 100% |
| MVP1-E0-21 · Module page sections and two entry pages | 3 | 8.79M | $1.18 | $1.03 | $2.21 | 54% |
| Apps by version, and AutoRep V1 PRD and epics (stories) | 2 | 7.63M | $1.58 | $0.92 | $2.50 | 54% |
| MVP1-E0-32 to E0-35 · Products menu, app and service pages, a flow per app | 5 | 28.98M | $2.56 | $4.15 | $6.71 | 36% |
| MVP1-E0-36 to E0-42 · Home page: cover, numbers, companies, academics, recommendations | 15 | 54.13M | $4.33 | $28.67 | $33.01 | 30% |
| MVP1-E0-43 · Platform Architecture diagram | 2 | 5.29M | $0.95 | $0.00 | $0.95 | 100% |
| AUTOREP-E6-03 · AutoRep overview diagram | 2 | 8.59M | $1.74 | $0.00 | $1.74 | 100% |
| MVP1-E8 · Total projected cost (tab and stories) | 3 | 18.09M | $10.29 | $8.88 | $19.17 | 72% |
| MVP1-E0-44 · Product names and versions (story) | 5 | 7.74M | $17.73 | $0.00 | $17.73 | 100% |
| MVP1-E0-47 · Payments article on Expensive Mistakes | 4 | 6.16M | $1.25 | $0.00 | $1.25 (part pending) | 100% |
| **Total** | **125** | **476.35M** | **$136.80** | **$124.50** | **$261.30** (part pending) | **50%** |

## Scaffolding (not tied to a story)

| Area | Requests | Tokens | Cost |
|---|---|---|---|
| Access and tooling | 6 | 7.41M | $1.74 |
| Planning documents | 2 | 1.35M | $0.72 |
| Questions and explanations | 23 | 17.62M | $21.33 |
| Product discovery | 17 | 7.28M | $15.81 |
| Process | 25 | 52.74M | $17.00 |
| Tool overhead (background calls) | 0 | 0.00M | $1.65 |
| **Total** | **73** | **86.39M** | **$58.25** |

## Totals

- Build $136.80, rework $124.50, scaffolding $58.25.
- Token yield across stories (build ÷ build + rework): 50%.
- Share of all tokens that went into kept story work: 42%.

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
