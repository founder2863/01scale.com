---
name: estimate-human-cost
description: Work out what a human team would cost for each 01scale story, so far and projected, from the story sizes in the epics files, and refresh the data behind the human cost on the site. Use when a story's GitHub issue is closed (to state its estimated development cost), when stories are added or resized, or when asked what the work so far, or all of MVP1, would cost a human team.
---

# Estimate human cost

One script works out the human team's cost from the stories, so the site, the issues and the projections use the same numbers and none is typed by hand (story `MVP1-E8-09`).

## Where things are

| File | What it is |
|---|---|
| `docs/process/cost-model.json` | Person-days per size (S 3, M 8, L 15), the rate per role, the scope, and the done stories saved from GitHub |
| `scripts/costs/human_costs.py` (`npm run human-costs`) | Reads the epics files, the closed issues and the token ledger; writes `app/how-its-built/human-costs.ts` |
| `scripts/costs/tests/` (`npm run test:costs`) | Tests on a small synthetic epics file |
| `docs/decisions/MVP1-E8.md` | Where the sizes, the rate and the scope were decided |

## When to run it

- **When a story's issue is closed.** Close the issue first, then run `npm run human-costs`: the done list comes from closed issues. Take the story's size, person-days and estimated human cost from the script's output (or `human-costs.ts`) for the closing comment (CLAUDE.md step 8), with its measured token cost from the Token Costs table.
- **When stories are added or resized** in `docs/epics/MVP1-EPICS.md` or `docs/epics/AUTOREP-EPICS.md`.
- **When the cost model changes** (for example when `MVP1-E8-02` sets the rates per role).

Commit `docs/process/cost-model.json` and `app/how-its-built/human-costs.ts` together in the same PR.

## Steps

1. `npm run human-costs`. It reads closed issues with `gh api search/issues` and saves them in the cost model, so the site build needs no network. Without network, `npm run human-costs -- --offline` rebuilds from the saved list and says so.
2. Read the summary it prints: so far, projected, any story with no size (TBD), and the out-of-scope stories (E8).
3. If you changed the script, `npm run test:costs`.
4. `npm run build`, then state the two totals in the PR description.

## Rules that are easy to get wrong

- **Sizes only from the epics files.** A size is the `— S|M|L` at the end of the story's heading. A story without one is **TBD**: listed, left out of the totals, never guessed. To fix it, size the story in the epics file.
- **The rate is an assumption** until `MVP1-E8-02` sets a loaded rate per role: $1,000 per person-day for an engineer (Nikhil, 22 Nov 2026). Say "assumption" wherever the figure appears: the issue comment, the PR, the page.
- **Nothing entered by hand.** Never type a cost into `human-costs.ts`, the done list or a page; change the epics file or the cost model and run the script.
- **Done means the issue was closed as completed.** A story built without an issue (AutoRep stories live in the file only) is not counted as done.
- **Scope:** MVP1 (E0 to E7) and AutoRep V1 (E1 to E6). E8 is the cost work itself and is listed separately, never in the projection (`docs/decisions/MVP1-E8.md`).
- **Measured token cost** is the ledger's build + rework cost, the same as the Token Costs table. A ledger entry covering several stories ("MVP1-E0-36 to E0-42") is split by person-days and marked shared. An entry naming only an epic or no story is listed as unassigned, not spread over stories.
