---
name: record-token-costs
description: Record what a piece of work cost in tokens and dollars, by story, and update the Token Costs table on the How It's Built page. Use at the end of every story or pull request, at the end of a working session, or when asked about token cost, spend, rework cost or token yield.
---

# Record token costs

Keeps a running ledger of what each story cost to build with Claude Code, and splits it into build, rework and scaffolding.

## Where things are

| File | What it is |
|---|---|
| `scripts/costs/extract_session.py` | Measures tokens and cost per request from a session transcript |
| `docs/process/token-ledger.json` | The ledger: one row per request, with the story and kind assigned by hand |
| `scripts/costs/build_costs.py` (`npm run costs`) | Rolls the ledger up into `app/how-its-built/costs.ts` and `docs/process/TOKEN-COSTS.md` |

## Steps

1. Find the session transcript: `~/.claude/projects/<project folder>/<session id>.jsonl`. Cloud sessions are deleted when they end, so record before the session closes.
2. Run `python3 scripts/costs/extract_session.py <transcript> > /tmp/requests.json` (use your scratchpad).
3. Add the new requests to the ledger. For a session already in the ledger, update the rows it has and append the new ones; match rows by session and timestamp, never by position alone. Add the session's `by_kind_usd` and rates to `sessions`.
4. For each new row, set:
   - `area`: a story key from `stories` (add a new key with its name if needed), or a scaffolding area name;
   - `kind`: `build`, `rework` or `scaffolding`;
   - `summary`: a neutral one-line description of the request. Never copy the person's words.
5. Run `npm run costs`, then `npm run build`.
6. In the pull request, state the totals and anything unusual (for example a large context reload).

## How to classify

- **Build**: the request produced something that was kept.
- **Rework**: the request changed or fixed something already delivered for the same story, because a requirement changed or a mistake was found. A review finding is rework. A new requirement on a delivered story is rework.
- **Scaffolding**: tied to no story. Questions and explanations, product discovery, tooling and access problems, process (comments, merges).
- A request that mixes kinds goes to the kind that used most of its effort. Note the mix in the summary.

## Rules that are easy to get wrong

- Never enter a cost by hand. If the extractor reports `null`, the tool had not priced it yet: leave it `null` and it shows as pending.
- Do not change past classifications without saying so in the pull request.
- Tokens include context re-read from the cache. They are most of the volume but the cheapest part; the cost column is what matters for money.
- A request sent after a break of more than an hour carries the cost of reloading the whole conversation. That is real cost and stays with that request.
