# MVP1-E8 · Total projected cost: decision log

## 2026-11-22 · The assumptions behind the projection

**Decided by:** Nikhil, answering the questions on PR #125.

| Question | Decision |
|---|---|
| Scope | MVP1 only: Platform Core, the platform services, the DocFlow app (epics E0 to E7) and AutoRep V1, which is part of MVP1 (AutoRep epics E1 to E6; Nikhil's correction on PR #125). MVP2 is out. A value not calculated yet shows TBD. |
| Leadership and program management | 1 program manager, 1 engineering manager, 1 head of product. |
| Go-to-market team | One person each in sales, marketing, support, customer success, finance, compliance and security, onboarded once development reaches 50%. |
| Rates | Typical North American salaries, in USD, loaded for benefits, taxes and overhead. |
| Story sizes | A human scale, in person-days including tests, review and QA: S ≈ 3, M ≈ 8, L ≈ 15. It replaces S ≈ half a day, M ≈ 1–2 days, L ≈ 3+ days in the epics files. |
| Claude Code side | Build tokens projected from the design work measured so far, times a stated multiplier for code and tests; one product manager full-time over Claude's timeline. |
| Tracking | GitHub issues for the E8 stories, as for other MVP1 stories. |

**Options not chosen.**
- Costing the whole roadmap including MVP2: left for later, so the first numbers rest on designed MVP1 stories only.
- Go-to-market from day one: too early; most functions have nothing to sell, support or certify before the product is half built.
- Keeping the old size scale: it understates a human team's work on production code.

## 2026-11-22 · How the human cost script reads the work (MVP1-E8-09)

**Decided by:** the build session, within the story; open to Nikhil's review on the PR.

| Question | Choice | Alternatives |
|---|---|---|
| Is E8 in the totals? | Yes (Nikhil on PR #159: E8 work should be counted). It replaces "E0 to E7, without E8 itself" above. The script still supports `exclude_epics` in the cost model, now empty. | Leave E8 out and list it separately (the PR's first version). |
| What counts as done? | An issue closed as **completed** (`reason:completed`), titled `[ID] Title`. Issues closed as not planned are not done. AutoRep stories have no issues, so they are never counted as done, even when built (Nikhil on PR #159). | Every closed issue; a status line in the epics file. |
| A ledger entry that covers several stories ("MVP1-E0-36 to E0-42") | Split by the stories' person-days, marked shared, as the issue comments did. | Equal split; leave it unassigned. |
| A ledger entry for a whole epic's design ("MVP1-E2 · Upload design") or no story | Listed as unassigned, not spread over the epic's stories, so no story shows a cost it was not measured against. | Spread over the epic's stories by size. |
| Measured token cost | Build + rework, the same figure as the Token Costs table; scaffolding stays out. | Include scaffolding. |
