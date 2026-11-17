# Token costs

What it costs to build 01scale with Claude Code, per story. Generated from `docs/process/token-ledger.json` by `npm run costs`; do not edit by hand.

Updated 2026-11-17. 69 requests across 1 session(s). Total **$127.10** for 183.3 million tokens.

## Per story

| Story | Requests | Tokens | Build cost | Rework cost | Total | Token yield |
|---|---|---|---|---|---|---|
| Phase 0 · Site launch (home page, demos, theme) | 7 | 5.09M | $2.65 | $0.70 | $3.35 | 78% |
| Design · API and database for every story | 2 | 9.80M | $3.08 | $8.09 | $11.17 | 22% |
| Architecture decision and Architecture page | 3 | 6.79M | $3.07 | $0.00 | $3.07 | 100% |
| MVP1-E1 · Login design (Identity, version 1) | 6 | 13.64M | $9.90 | $9.28 | $19.18 | 38% |
| MVP1-E1-01 · Cognito setup guidance | 4 | 3.17M | $1.00 | $0.00 | $1.00 | 100% |
| MVP1-E0-10 · Products pages and navigation | 1 | 7.75M | $4.87 | $0.00 | $4.87 | 100% |
| MVP1-E0-11 · Product vision page | 3 | 9.08M | $2.45 | $0.95 | $3.40 | 66% |
| MVP1-E0-12 · Design skills and How It's Built | 3 | 5.19M | $20.66 | $0.00 | $20.66 | 100% |
| MVP1-E0-13 · Token cost tracking | 1 | 9.49M | $7.32 | $0.00 | $7.32 | 100% |
| MVP1-E2 · Upload design | 1 | 20.86M | $5.88 | $0.00 | $5.88 | 100% |
| MVP1-E3 · Extraction design | 1 | 15.65M | $4.62 | $0.00 | $4.62 | 100% |
| MVP1-E4 · Human Review design | 1 | 5.81M | $1.89 | $0.00 | $1.89 | 100% |
| MVP1-E5 · DocFlow app design (JSON and CSV output) | 1 | 2.67M | $0.98 | $0.00 | $0.98 | 100% |
| MVP1-E6 · Payment design | 1 | 5.15M | $1.66 | $0.00 | $1.66 | 100% |
| MVP1-E7 · Delivery design | 1 | 3.49M | $1.01 | $0.00 | $1.01 | 100% |
| MVP1-E1-05, E0-06 · Account management design | 1 | 1.89M | $1.53 | $0.00 | $1.53 | 100% |
| MVP1-E0-07, E0-08 · Service template and gateway design | 1 | 1.39M | $0.86 | $0.00 | $0.86 | 100% |
| Architect skill and MVP1 architecture review | 3 | 19.69M | $3.08 | $4.49 | $7.57 | 29% |
| MVP1 design changes from founder decisions (17 Nov) | 1 | 14.56M | $0.00 | $4.55 | $4.55 | 0% |

## Scaffolding (not tied to a story)

| Area | Requests | Tokens | Cost |
|---|---|---|---|
| Access and tooling | 3 | 3.52M | $1.04 |
| Planning documents | 2 | 1.35M | $0.72 |
| Questions and explanations | 4 | 1.68M | $6.50 |
| Product discovery | 8 | 2.64M | $9.61 |
| Process | 10 | 12.98M | $6.09 |
| Tool overhead (background calls) | 0 | 0.00M | $-1.43 |

## Totals

- Build $76.51, rework $28.06, scaffolding $22.54.
- Token yield across stories (build ÷ build + rework): 70%.
- Share of all tokens that went into kept story work: 61%.

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
