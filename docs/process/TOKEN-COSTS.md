# Token costs

What it costs to build 01scale with Claude Code, per story. Generated from `docs/process/token-ledger.json` by `npm run costs`; do not edit by hand.

Updated 2026-11-17. 47 requests across 1 session(s). Total **$73.45** for 68.4 million tokens.

## Per story

| Story | Requests | Tokens | Build cost | Rework cost | Total | Token yield |
|---|---|---|---|---|---|---|
| Phase 0 · Site launch (home page, demos, theme) | 7 | 5.09M | $2.34 | $0.62 | $2.95 | 78% |
| Design · API and database for every story | 2 | 9.80M | $2.72 | $7.14 | $9.86 | 22% |
| Architecture decision and Architecture page | 3 | 6.79M | $2.71 | $0.00 | $2.71 | 100% |
| MVP1-E1 · Login design (Identity, version 1) | 5 | 8.24M | $8.74 | $6.89 | $15.63 | 63% |
| MVP1-E1-01 · Cognito setup guidance | 4 | 3.17M | $0.89 | $0.00 | $0.89 | 100% |
| MVP1-E0-10 · Products pages and navigation | 1 | 7.75M | $4.30 | $0.00 | $4.30 | 100% |
| MVP1-E0-11 · Product vision page | 3 | 9.08M | $2.16 | $0.84 | $3.00 | 66% |
| MVP1-E0-12 · Design skills and How It's Built | 3 | 5.19M | $18.24 | $0.00 | $18.24 | 100% |
| MVP1-E0-13 · Token cost tracking | 1 | 3.67M | $0.00 | $0.00 | $0.00 (part pending) | 100% |

## Scaffolding (not tied to a story)

| Area | Requests | Tokens | Cost |
|---|---|---|---|
| Access and tooling | 3 | 3.52M | $0.92 |
| Planning documents | 2 | 1.35M | $0.64 |
| Questions and explanations | 4 | 1.68M | $5.74 |
| Product discovery | 8 | 2.64M | $8.48 |
| Process | 1 | 0.42M | $0.10 |

## Totals

- Build $42.10, rework $15.48, scaffolding $15.88.
- Token yield across stories (build ÷ build + rework): 75%.
- Share of all tokens that went into kept story work: 64%.

## Definitions

- **Build**: work that produced something kept.
- **Rework**: work that changed or fixed something already delivered for the same story, because a requirement changed or a mistake was found.
- **Scaffolding**: work tied to no story: questions, discovery, tooling, process.
- **Token yield**: a story's build tokens divided by its build plus rework tokens.
- **Tokens** include context re-read from the cache, which is most of the volume but the cheapest part.

## How it is measured

`scripts/costs/extract_session.py` reads a session transcript. Claude Code records its own running cost there; the script recovers the per-token rates it used, prices each response, and scales each model's total to the tool's own figure. The story, kind and summary of each request are assigned by hand in the ledger.
