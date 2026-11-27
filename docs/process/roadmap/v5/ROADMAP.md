# Roadmap v5: two product managers, and what each plan costs

Started on 26 Nov 2026 from roadmap v4 (`docs/process/roadmap/v4/`, frozen), after reviewing it with Nikhil. **Frozen on 27 Nov 2026** (Nikhil): v5 is kept as it is; v6 continues from it in `docs/process/roadmap/v6/`. Same stories, dependencies, estimate rules and sprint rules as v4, plus the changes below. v5 has its own model (`model.json`), script (`scripts/site/roadmap_v5.py`, `npm run roadmap:v5`) and page (How It's Built › Roadmap › v5). Story `MVP1-E8-13` (#242).

## What this version adds

Nikhil's requirements and constraints for v5 (26 Nov 2026), after reviewing v4:

- **A second product manager:** the team is 3 engineers and 2 product managers. Either product manager can take any product story.
- **The missing product manager work, as stories:** partner programme terms (`MVP1-E10-06`), launch communications (`E11-04`), product analytics (`E12-07`), the pricing page and billing operations (`E13-06`), customer onboarding and in-product help (`E14-05`), voice of the customer (`E14-06`), a responsible AI policy (`E15-04`), and customer contracts in a new General Counsel epic (`MVP1-E16`, #241; `E16-01`). All are business readiness, before go-live.
- **Joint marketing with partners is an AI agent** (`MVP1-E11-03`, Nikhil): its open question is answered, so it is ready.
- **Joint time** for product analytics (E12-07) and the responsible AI policy (E15-04), which need engineers as much as the security stories do.
- **What each plan costs:** product days at the product manager rate and development days at the engineer rate, both $1,000 a day for now (Nikhil), counting the sprint product work and the joint sessions; shown without and with Claude Code, as the cost of the work and as the cost of the team for the plan's length. No other roles yet (Nikhil).

## Gaps found

Nikhil's observations on v5 (26 and 27 Nov 2026), which v6 addresses:

- **Without Claude Code, both product managers are idle in months 6 to 8.** Their remaining business stories (the sales demo, sales, support and configuration training, release management, and through it CPQ and the pricing page) wait for the finished journey and for staging, and staging and the production environments are planned last.
- **With Claude Code, the whole team is idle in month 4.** Everyone waits on the last steps of the journey (results, then delivery), and the short stories leave gaps between sprints; nothing early was left to fill them because the environments had been pushed to the end.
- **With two product managers, stories are still held up by a product manager.** The plan starts with nothing refined, and a product manager in the middle of a long document cannot refine the next story. Nikhil: with two product managers every story should be ready in time.
- **Product manager stories are not in sprints and cannot roll over.** Nikhil: product manager stories run in sprints too and must be ready at least two sprints (ten working days) before the engineering sprint that pulls the work; they can roll over without a limit, and engineers wait on them.
- **The cost leaves out tokens.** Nikhil: the cost of a plan is the product managers and engineers for its length, plus the projected token cost when working with Claude Code.

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
| Product manager | 2 | The business readiness epics: E10-01 to E10-06, E11-01 to E11-04, E12-01 to E12-07, E13-01 to E13-06, E14-01 to E14-06, E15-01 to E15-04, E16-01; the product sections of the documentation: E0-15 PRD Reference, E0-14 Market Outlook, E0-27 Metrics, E0-28 Monetization, E0-29 GTM, E0-30 Support; and the product stories of going live: E9-01 Go-live strategy, E9-06 Privacy policy and terms, E9-08 User acceptance testing, E9-09 Release documentation, E9-10 Support documentation, E9-13 Handling support issues, E9-14 Post-launch review |
| Engineer | 3 | Everything else, including the architecture and interface documentation |

## Main path: DocFlow live and supported, with the business ready (waves 0 to 10, 617 person-days)

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
| 8 Business readiness | E11-01 GTM strategy with sales (M) → E11-02 Positioning (M) → E11-03 Joint marketing AI agent (M) → E11-04 Launch communications (M); E10-03 SKU setup (S) → E10-05 Bundles (M) → E10-04 CPQ setup (M) → E10-01 Sales demo (M) → E10-02 Sales training (M) → E10-06 Partner programme terms (M); E12-02 Issue categorization (S) → E12-03 Escalation paths (S) → E12-04 Resolution timelines (S) → E12-01 Support SOP (S) → E12-06 Release management (M) → E12-05 Support staff training (M); E12-07 Product analytics (M); E13-01 P&L (M) → E13-03 Unit economics (M) → E13-02 Profitability tracking (M) → E13-04 Margin now and later (S) → E13-05 Margin improvement (S); E13-06 Pricing page and billing operations (M) → E16-01 Customer contracts (M); E14-01 Configuration team training (M) → E14-02 Customer success training (M) → E14-03 Customer success documents (M) → E14-04 Upsell training (S) → E14-05 Customer onboarding (M) → E14-06 Voice of the customer (S); E15-01 Security testing strategy (M) → E15-02 Vulnerability management (M) → E15-03 Compliance review (M) → E15-04 Responsible AI policy (S) | 222 | High | Nikhil (26 Nov 2026): sales, marketing, operations, finance, customer success and security are ready before go-live, and this work fills the product manager's time. Most of it needs the documentation and pricing first; the demo and the trainings need the journey working on staging. |
| 9 Go-live | E9-01 Go-live strategy (M) → E9-02 Production environments (M) → E9-03 Staging, release pipeline and rollback (M) → E9-04 Backups and a restore drill (S) → E9-05 Launch security and privacy review (M) → E9-06 Privacy policy and terms (S) → E9-07 Load, spend-cap and failure testing (M) → E9-08 User acceptance testing (S) → E9-09 Release documentation (S) → E9-10 Support documentation (S) → E9-11 Post-production testing (M) | 63 | High | Nikhil (26 Nov 2026): the plan runs to live in production. Environments and the release pipeline can start once the gateway exists; testing, the security review and user acceptance need the whole journey. Post-production tests are in place before go-live, so the first release is checked like every later one. |
| 10 Live and supported | E9-12 Hypercare and incident response (M) → E9-13 Handling support issues (S) → E9-14 Post-launch review (S) | 14 | High | After go-live: two weeks of hypercare, support issues handled by the playbook, then a review with data that feeds the next roadmap version. |

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

## Joint work

Stories outside the documentation wave that also have a quarter of their size as joint sessions, the product manager and an engineer together (Nikhil, 26 Nov 2026):

- E9-01 Go-live strategy, E9-08 User acceptance testing
- E15-01 Security testing strategy, E15-02 Vulnerability management, E15-03 Compliance review, E15-04 Responsible AI policy
- E12-07 Product analytics (v5)

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
| E10-03 | E0-28 |
| E10-05 | E10-03 |
| E10-04 | E10-03, E10-05, E6-05 |
| E10-01 | E11-02, E7-03, E9-03 |
| E10-02 | E10-01 |
| E11-01 | E0-29, E0-27 |
| E11-02 | E0-14, E11-01 |
| E11-03 | E11-02 |
| E12-02 | E9-10 |
| E12-03 | E12-02 |
| E12-04 | E12-02 |
| E12-01 | E12-02, E12-03, E12-04 |
| E12-06 | E9-03 |
| E12-05 | E12-01, E12-06, E7-03 |
| E13-01 | E0-28, E10-03 |
| E13-03 | E0-28 |
| E13-02 | E13-01 |
| E13-04 | E13-03 |
| E13-05 | E13-04 |
| E14-01 | E7-03, E9-03 |
| E14-02 | E10-02, E12-01 |
| E14-03 | E14-02 |
| E14-04 | E14-02, E10-05 |
| E10-06 | E10-05, E11-03 |
| E11-04 | E11-02 |
| E12-07 | E0-27, E0-25 |
| E13-06 | E10-03, E10-04 |
| E14-05 | E7-03, E14-03 |
| E14-06 | E9-08 |
| E15-04 | E15-03 |
| E16-01 | E9-06, E13-06 |
| E15-01 | E0-26 |
| E15-02 | E15-01 |
| E15-03 | E15-01 |
| E9-01 | E0-29, E11-01, E12-06 |
| E9-02 | E0-08 |
| E9-03 | E9-02, E0-03 |
| E9-04 | E9-02 |
| E9-05 | E0-26, E7-03, E15-01 |
| E9-06 | E9-01 |
| E9-07 | E7-03, E9-03 |
| E9-08 | E7-03, E9-03 |
| E9-09 | E7-03 |
| E9-10 | E0-30, E0-25 |
| E9-11 | E9-03, E0-25, E7-03 |
| E9-12 | E9-01, E9-04, E9-05, E9-06, E9-07, E9-08, E9-09, E9-10, E9-11 |
| E9-13 | E9-10, E9-12 |
| E9-14 | E9-12, E9-13 |
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
| The business is ready: sales, marketing, operations, finance, customer success and security | Wave 8 |
| DocFlow is live in production | Wave 8, E9-01, E9-02, E9-03, E9-04, E9-05, E9-06, E9-07, E9-08, E9-09, E9-10, E9-11, E7-03, E2-05, E3-04, E4-03 |
| Hypercare done and first post-launch review | E9-12, E9-13, E9-14 |

## Risks and notes

- **Biggest risk:** E0-07 (L). Every engineering wave waits on it.
- **The documentation gates the business steps:** its sections need real sources (market figures with links, prices, metrics targets); a section without them stays "Coming Soon...".
- **Second:** E3-02 (L), the first real Claude call; its quality is measured by E0-04's evals and its spend capped by E0-26.
- Issue #45 is titled "Store outputs"; the epics file now calls E5-04 "Build outputs on demand".
