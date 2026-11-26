# Roadmap v2: ready stories in one-week sprints, with a forecast range

Started on 26 Nov 2026 from roadmap v1 (`docs/process/roadmap/v1/`, frozen). Same stories, dependencies, team and estimate rules as v1, plus the constraints below. v2 has its own model (`model.json`), script (`scripts/site/roadmap_v2.py`, `npm run roadmap:v2`) and page (How It's Built › Roadmap › v2). Goal (Nikhil): a monthly roadmap that is more predictable.

**Frozen on 26 Nov 2026** (Nikhil): v2 is kept as it is; v3 continues from it in `docs/process/roadmap/v3/`.

## What this version adds

Nikhil's requirements and constraints for v2 (26 Nov 2026), after reviewing v1:

- **Definition of Ready:** an engineer pulls a story only when it is complete: its module's design documents exist in `docs/services/<service>/` (a read me, the API spec and the user journeys; the data model and UI components where the module holds data or ships UI), it has no open questions, and everything it needs is done. The plan checks this from the repository. Two stories have open questions today: E0-27 (how live numbers reach the Metrics section) and E3-06 (which embeddings provider). Each gets a one-day decision session, the product manager and an engineer together, before it can be pulled.
- **One-week sprints** of 5 working days. Engineers pull stories at sprint planning, or during a sprint only if the story can finish by the sprint's end.
- **A story fits a sprint:** when its development is longer than a sprint, several engineers work on it together (up to the 3 on the team), with 15% more time for coordination. An M story (8 days) gets 2 engineers and takes 4.6 days; an L story (15 days) gets 3 and takes 5.75 days, so it still needs a planned rollover.
- **At most one rollover, two in the worst case:** 20% of stories roll over once and 5% twice (assumptions). The plan is simulated 300 times; each milestone shows its month if nothing rolls over, the likely month (half the runs finish by it, P50) and a worst-case month (nine runs in ten finish by it, P90).
- **Main path first:** side tracks and later work take only the time the main path cannot use. v1's document said so, but its planner ranked every story by its chain of waiting work alone, so extras could jump ahead of main-path stories. Within the main path, earlier steps of the journey go first (upload before extraction before review), so a step nothing waits on, like the upload page, is not left to the end.
- **Only versions that exist** are shown on the page.
- **End to end means the whole journey:** the milestone now also needs the upload pages (E2-05), the extraction page (E3-04) and the completed review (E4-03). In v1 it needed only email delivery, so the upload page could be planned after it.
- **Correction to v1:** v1's first gap was wrong. Every module's design documents exist (`docs/services/<service>/`, made with the design skills from 17 Nov 2026); STATUS.md was out of date. What has no story yet is the documents themselves: `MVP1-E8-08` (a story for every document) waits for Nikhil's go.

## Gaps found

Reviewing v2 with Nikhil (26 Nov 2026) found these, which v3 addresses:

- **Rollovers are modelled too harshly.** A rollover keeps the whole crew on the story for one more full sprint, so a story with three engineers costs fifteen more engineer-days; the likely end-to-end date lands three months after the no-rollover date. Nikhil: count a rollover as half a sprint.
- **The plan ends at "works end to end", not at live in production.** There is no go-live strategy, no production or staging environments, no release pipeline or rollback, no backups, no launch security review, no privacy policy, no load or failure testing, no user acceptance testing, and no release or support documentation; nor any work after launch: testing in production, hypercare and handling support issues.
- **Engineers still have gaps late in the plan.** Nikhil: fill them with extras.

## How it was worked out

- **Size:** from `docs/epics/MVP1-EPICS.md`, on the human scale (S ≈ 3, M ≈ 8, L ≈ 15 person-days, including tests, review and QA). The totals on the site are added up from the sizes by `npm run roadmap`, which also checks every day count typed in this file.
- **Dependency:** each story's **Needs** are listed under Story dependencies below, taken from the stories a story names in its text and the build order in CLAUDE.md: service template, gateway, then the services in the order DocFlow calls them (upload → extraction → review → payment → delivery), provider before consumer.
- **Documentation before the business steps (Nikhil, PR #189):** the first story of each business step needs all of wave 0. Foundation and Identity do not, so they start on day 1.
- **Sprints (v2):** see What this version adds; the team plan below applies inside them.
- **Team plan:** every story is split into the tasks people do. An engineering story is the product manager's sprint work (a share of its size, before development can start), then an engineer's development. A design story (wave 0) is its owner working alone, then design discussions and reviews where the product manager and an engineer work together, at the same time. Whenever people are free, the most urgent ready task goes to whoever it needs: the one with the longest chain of work waiting on it, and sprint refinement first when it is all a story is waiting for. If the product manager is in the middle of other work, a story waits, and the plan shows it. A month is 20 working days. Stories not listed under Story dependencies are not planned.
- **Spare time goes to spikes (Nikhil, PR #189):** when an engineer has nothing ready, they take a spike on an external service, so research is done before the stories that depend on it.
- **Four estimates per story (Nikhil, PR #193):** product and development work, each without and with Claude Code, in person-days. The owner's work is the story's size. An engineering story adds 10% of its size in product work during the sprint; a design story adds 25% in joint sessions for the other role (engineers on product sections, the product manager on architecture and interfaces). With Claude Code both take 40% of the time. The numbers are in `docs/process/cost-model.json` (`estimates`). The plan is made twice, without and with Claude Code; `docs/process/estimates.csv` lists every story's four estimates and planned months for reports.
- **Reports:** `docs/process/estimates.csv` has one row per story: its four estimates, owner and planned months, without and with Claude Code. On GitHub, the four estimates go in four **Number** issue fields named exactly `Product estimate without Claude Code`, `Product estimate with Claude Code`, `Dev estimate without Claude Code` and `Dev estimate with Claude Code` (person-days); once they exist, a session can fill them on every issue from this plan.
- **Value:** how much a story moves the site's purpose: letting a hiring manager click through a working DocFlow journey that is built on real platform services. **High** is on the path to that journey, **medium** makes the platform's depth visible, **low** is useful but nobody waits for it.

## Team

| Role | People | Does |
|---|---|---|
| Product manager | 1 | The product sections of the documentation: E0-15 PRD Reference, E0-14 Market Outlook, E0-27 Metrics, E0-28 Monetization, E0-29 GTM, E0-30 Support |
| Engineer | 3 | Everything else, including the architecture and interface documentation |

## Main path: a working DocFlow (waves 0 to 7, 318 person-days)

Inside a wave the order matters where an arrow is shown.

| Wave | Stories, in order | Days | Value | Why here |
|---|---|---|---|---|
| 0 Product documentation | E0-15 PRD Reference (S) → E0-14 Market Outlook (M) → E0-27 Metrics section (M) → E0-28 Monetization (M) → E0-29 GTM (M) → E0-30 Support (S); E0-20 Architecture & System Design (M) → E0-51 DocFlow diagram (S) → E0-24 Built on (S) → E0-16 MCP section (M) | 60 | High | Nikhil's rule (PR #189): the documentation, from requirements to architecture, is done before the business steps are built. The product manager writes the product sections in the order the product page reads; engineers write the architecture and interfaces between foundation stories. |
| 1 Foundation | E0-01 Database and migrations (S) → E0-03 CI (S) → **E0-07 Service template (L)** → E0-05 API contract (M) → E0-02 Audit log (S) → E0-08 Gateway (M) | 40 | High | Every service is built from E0-07 and reached through E0-08. Nothing in the later waves can ship before them. |
| 2 Identity and app shell | E1-01 Cognito pool (S) → E1-02 Sign up (M) → E1-03 Sign in (M) → E1-06 Route protection (S) → E1-04 Reset password (S) → E1-05 Account page (M); then E0-06 API keys and MCP (M), E0-09 DocFlow app shell (M) | 49 | High | Every later call needs an access token. API keys are stored in Identity, so E0-06 follows sign-in. The DocFlow shell needs the gateway and tokens. |
| 3 Upload | E2-01 S3 and IAM (S) → E2-02 Presigned URL (M) → E2-03 Confirmation and checks (S) → E2-04 Upload page (M) → E2-05 Documents list (S) | 25 | High | The first business step: it waits for the documentation (wave 0) and the gateway. Small and low risk. |
| 4 Extraction | E0-04 Eval harness (M), **E0-26 Security baseline and spend cap (M)**, E3-01 Job lifecycle (M) → **E3-02 Claude extraction call (L)** → E3-03 Rule checks (M) → E3-08 Hold fields (S) → E3-04 Extraction page (M) → E3-05 Cost and latency logging (S) | 61 | High | The most valuable and riskiest step. LLM features ship with evals (CLAUDE.md), so E0-04 comes before the Claude call. E0-26 caps spend before a public demo can call Claude. STATUS.md: E3-08 before DocFlow's extraction step goes live. |
| 5 Review | E4-01 Review queue (M) → E4-02 Accept, edit, not present (M) → E4-03 Complete review (S) → E4-06 Hold fields (S) → E4-04 Corrections feed the eval set (S) | 25 | High | E4-04 needs the eval harness (E0-04). |
| 6 Outputs and payment | E5-01 Final JSON (M) → E5-03 Locked preview (S) → E5-05 Hold until payment (S) → E5-02 CSV (S) → E5-04 Outputs on demand (S); in parallel E6-01 Checkout session (M) → E6-02 Webhook (M) → E6-03 Payment page (S) | 39 | High | E5 and E6 can run side by side. E5-05 needs the holds from E3-08 and E4-06. |
| 7 Delivery | E7-01 Success page (M) → E7-02 Secure downloads (S) → E7-03 Email delivery (M) | 19 | High | **After this wave the MVP1 journey works end to end.** |

## Side tracks

| Track | Stories | Days | Value | When |
|---|---|---|---|---|
| Harden and show | E0-25 Monitoring (M); close **E0-18 Try it (L)** | 23 | Medium | Monitoring once the gateway is up; it feeds live health into the Metrics section. E0-18 closes when every module has Try it. |
| Spikes | E3-10 Spike: LLM extraction options, AWS, Claude and Microsoft (M); E6-05 Spike: Stripe Billing APIs (S) | 11 | Medium | Nikhil (PR #189): engineers who would otherwise wait for the gateway in month 2 take spikes on the external services. Nothing waits on them, so the plan gives them to whoever is free; the LLM spike reports before the Claude extraction call (E3-02) is built. |
| Roadmap on the site | E0-54 Roadmap tab on How It's Built (M); E8-12 Four estimates per story, and the plan without and with Claude Code (M) | 16 | Medium | Built in PR #189 and the PR after it, so not planned. |

## Later (100 person-days)

| Group | Stories | Days | Value | Why later |
|---|---|---|---|---|
| Product extras | E3-09 Free daily quota (S), E6-04 Refunds (S), E1-07 Branded sign-in (S), E1-08 Sign in with Google (M), E3-06 Ask questions about my documents, RAG (L) | 32 | Medium | Not on the path to the journey; planned when an engineer has nothing more urgent. E3-09 builds the free tier that Monetization (E0-28) designs. RAG needs extraction first. |
| Waiting for Nikhil's go | E0-44 Product names and versions (L); E8-02 to E8-08, the human versus Claude Code cost pages (53 days) | 68 | Low | Built when Nikhil says go, so not planned. E8-04 (a dependency-aware timeline for a human team) can take its plan from this file. |

## Story dependencies

`Wave 0` means every story in wave 0. `—` means it can start on day 1.

| Story | Needs |
|---|---|
| E0-15 | — |
| E0-14 | E0-15 |
| E0-27 | E0-15 |
| E0-28 | E0-14 |
| E0-29 | E0-14, E0-27 |
| E0-30 | — |
| E0-20 | — |
| E0-51 | E0-20 |
| E0-24 | E0-20 |
| E0-16 | E0-20 |
| E0-01 | — |
| E0-03 | — |
| E0-07 | E0-01, E0-03 |
| E0-05 | E0-07 |
| E0-02 | E0-07 |
| E0-08 | E0-05 |
| E1-01 | — |
| E1-02 | E1-01, E0-07 |
| E1-03 | E1-02, E0-08 |
| E1-06 | E1-03 |
| E1-04 | E1-03 |
| E1-05 | E1-03 |
| E0-06 | E1-03 |
| E0-09 | E1-03 |
| E2-01 | Wave 0, E0-07 |
| E2-02 | E2-01, E0-08 |
| E2-03 | E2-02 |
| E2-04 | E2-03, E1-06 |
| E2-05 | E2-04, E0-09 |
| E0-04 | E0-03 |
| E0-26 | E0-08 |
| E3-01 | Wave 0, E2-02 |
| E3-02 | E3-01, E0-04, E0-26 |
| E3-03 | E3-02 |
| E3-08 | E3-01 |
| E3-04 | E3-03 |
| E3-05 | E3-02 |
| E4-01 | E3-03 |
| E4-02 | E4-01 |
| E4-03 | E4-02 |
| E4-06 | E4-01, E3-08 |
| E4-04 | E4-03, E0-04 |
| E5-01 | E3-03, E4-03 |
| E5-03 | E5-01 |
| E5-05 | E5-03, E3-08, E4-06 |
| E5-02 | E5-01 |
| E5-04 | E5-02 |
| E6-01 | Wave 0, E0-08, E1-03 |
| E6-02 | E6-01 |
| E6-03 | E6-02 |
| E7-01 | E6-03, E5-04, E5-05 |
| E7-02 | E7-01 |
| E7-03 | E7-01 |
| E3-10 | — |
| E6-05 | — |
| E0-25 | E0-08 |
| E0-18 | E7-03 |
| E3-09 | E3-08 |
| E6-04 | E6-02 |
| E1-07 | E1-03 |
| E1-08 | E1-03 |
| E3-06 | E3-03 |

## Milestones

| Milestone | Done when |
|---|---|
| Product documentation complete | Wave 0 |
| Platform foundation live: service template and gateway | E0-07, E0-08 |
| People can sign up and sign in | E1-03, E1-06 |
| Upload a document | E2-04 |
| Claude extracts the fields, checked by rules and evals | E3-03 |
| A person reviews low-confidence fields | E4-03 |
| Pay with Stripe (test mode) | E6-03 |
| DocFlow works end to end: results by download and email | E7-03, E2-05, E3-04, E4-03 |

## Risks and notes

- **Biggest risk:** E0-07 (L). Every engineering wave waits on it.
- **The documentation gates the business steps:** its sections need real sources (market figures with links, prices, metrics targets); a section without them stays "Coming Soon...".
- **Second:** E3-02 (L), the first real Claude call; its quality is measured by E0-04's evals and its spend capped by E0-26.
- Issue #45 is titled "Store outputs"; the epics file now calls E5-04 "Build outputs on demand".
