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

## 2026-11-27 · Token Costs by Product and Engineering (MVP1-E8-16)

**Decided by:** Nikhil (the structure and the rules, 27 Nov 2026); the build session applied them row by row, open to his review on the PR.

| Question | Decision |
|---|---|
| Structure | (a) Product: consumed so far, with the existing per-story columns, and projected for the remaining stories; (b) Engineering: the same two parts; (d) Total token cost: actual so far and projected. |
| Product | PRDs, epics and stories; business-function work (sales, marketing, operations, finance, customer success, legal); cost and roadmap work; non-technical documents; UX design (user journeys, UI flows). |
| Engineering | Code, architecture and sequence diagrams. |
| API spec, data model and schema | 75% Product, 25% Engineering (the engineering share is the discussions). |
| Pre-requisites (scaffolding) | Counted, split by subject: product topics to Product, scripts and site set-up to Engineering. |
| Future stories | The latest roadmap version's owner: product manager → Product, engineer → Engineering. |

**How the session applied them** (every row is in `docs/process/token-classes.json`, with a reason):

| Choice | Why | Alternative |
|---|---|---|
| A module design (API spec, data model, schema, journeys, components, read me) counts 75% / 25%, as a whole. | The API, data and schema documents are most of the work; journeys and components would raise the Product share. | Split each design request by document (not recorded in the ledger). |
| Site pages are code, so Engineering, unless the subject is cost or roadmap (E0-13, E0-17, E0-31, E0-45, E0-54, E8) or a non-technical document (the Expensive Mistakes articles, E0-46, E0-47). | The rule names code as Engineering and cost and roadmap work as Product. | Count the home page and app Overview text as Product (open question on the PR). |
| Merge conflicts, pull requests, deployments and architecture decisions are Engineering pre-requisites; status, issue closing, cost recording and handoffs are Product. | Split by subject, as the rule says. | — |
| A request with no clear subject, or two (an unclear message; a merge conflict plus cost recording), is split evenly. | Neither side is more right. | Give it to one side. |
| Tool overhead (background calls) is shared in proportion to what each side measured. | It belongs to no request. | Leave it outside both sides. |
| Projected comes from Total Cost's cost by story, so both tabs show the same projection. | One number, one source: the roadmap's token rule. | Compute it again in `build_costs.py`. |
