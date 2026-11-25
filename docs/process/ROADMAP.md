# Roadmap: open stories by dependency, size and value

Built from the 68 open story issues on 25 Nov 2026, plus MVP1-E0-54 (#188) added the same day: 69 stories, 449 person-days (the eight epic issues are not counted). Linked from `docs/process/STATUS.md`. Update it in the PR that ships, adds, resizes or reorders a story. It is shown as a vertical timeline on How It's Built › Roadmap (story `MVP1-E0-54`). Reordered on 25 Nov 2026 at Nikhil's request (PR #189): all product documentation, from requirements to architecture (wave 0), is done before the business process steps are built; the platform foundation runs alongside it.

## How it was worked out

- **Size:** from `docs/epics/MVP1-EPICS.md`, on the human scale (S ≈ 3, M ≈ 8, L ≈ 15 person-days, including tests, review and QA). The totals on the site are added up from the sizes by `npm run roadmap`, which also checks every day count typed in this file.
- **Dependency:** the epics file has no "depends on" field. Dependencies come from the stories that a story names in its text, plus the build order in CLAUDE.md: service template, gateway, then the services in the order DocFlow calls them (upload → extraction → review → payment → delivery), provider before consumer.
- **Documentation before the business steps (Nikhil, PR #189):** every module's product documentation, from requirements to architecture, is finished before the business process steps (Upload to Delivery, waves 3 to 7) are built. Foundation and Identity (waves 1 and 2) do not wait for it and run alongside. The **Starts after** column says which waves each wave waits for; the site works out the days from it.
- **Value:** how much a story moves the site's purpose: letting a hiring manager click through a working DocFlow journey that is built on real platform services. **High** is on the path to that journey, **medium** makes the platform's depth visible, **low** is useful but nobody waits for it.

## Main path: a working DocFlow (waves 0 to 7, 318 person-days)

318 person-days of work, 258 days end to end: wave 0 runs alongside waves 1 and 2. Inside a wave the order matters where an arrow is shown.

| Wave | Stories, in order | Days | Starts after | Value | Why here |
|---|---|---|---|---|---|
| 0 Product documentation | E0-15 PRD Reference (S) → E0-14 Market Outlook (M) → E0-27 Metrics section (M) → E0-28 Monetization (M) → E0-29 GTM (M) → E0-30 Support (S) → E0-20 Architecture & System Design (M) → E0-51 DocFlow diagram (S) → E0-24 Built on (S) → E0-16 MCP section (M) | 60 | Start | High | Nikhil's rule (PR #189): the documentation, from requirements to architecture, is done before the business steps are built. It runs alongside the foundation, and with 60 days against the foundation's 89 it is off the critical path. Ordered as the product page reads: requirements, then the business sections, then architecture and interfaces. Metrics shows live service health once Monitoring (E0-25) exists; the section and its targets come first. |
| 1 Foundation | E0-01 Database and migrations (S) → E0-03 CI (S) → **E0-07 Service template (L)** → E0-05 API contract (M) → E0-02 Audit log (S) → E0-08 Gateway (M) | 40 | Start | High | Every service is built from E0-07 and reached through E0-08. Nothing in the later waves can ship before them. |
| 2 Identity and app shell | E1-01 Cognito pool (S) → E1-02 Sign up (M) → E1-03 Sign in (M) → E1-06 Route protection (S) → E1-04 Reset password (S) → E1-05 Account page (M); then E0-06 API keys and MCP (M), E0-09 DocFlow app shell (M) | 49 | 1 | High | Every later call needs an access token. API keys are stored in Identity, so E0-06 follows sign-in. The DocFlow shell needs the gateway and tokens. |
| 3 Upload | E2-01 S3 and IAM (S) → E2-02 Presigned URL (M) → E2-03 Confirmation and checks (S) → E2-04 Upload page (M) → E2-05 Documents list (S) | 25 | 0 and 2 | High | The first business step: it waits for the documentation (wave 0) and for sign-in (wave 2). Small and low risk. |
| 4 Extraction | E0-04 Eval harness (M), **E0-26 Security baseline and spend cap (M)**, E3-01 Job lifecycle (M) → **E3-02 Claude extraction call (L)** → E3-03 Rule checks (M) → E3-08 Hold fields (S) → E3-04 Extraction page (M) → E3-05 Cost and latency logging (S) | 61 | 3 | High | The most valuable and riskiest step. LLM features ship with evals (CLAUDE.md), so E0-04 comes first. E0-26 is moved forward so a public demo cannot run up the Claude bill. STATUS.md: E3-08 before DocFlow's extraction step goes live. |
| 5 Review | E4-01 Review queue (M) → E4-02 Accept, edit, not present (M) → E4-03 Complete review (S) → E4-06 Hold fields (S) → E4-04 Corrections feed the eval set (S) | 25 | 4 | High | E4-04 needs the eval harness (E0-04). |
| 6 Outputs and payment | E5-01 Final JSON (M) → E5-03 Locked preview (S) → E5-05 Hold until payment (S) → E5-02 CSV (S) → E5-04 Outputs on demand (S); in parallel E6-01 Checkout session (M) → E6-02 Webhook (M) → E6-03 Payment page (S) | 39 | 5 | High | E5 and E6 can run side by side. E5-05 needs the holds from E3-08 and E4-06. |
| 7 Delivery | E7-01 Success page (M) → E7-02 Secure downloads (S) → E7-03 Email delivery (M) | 19 | 6 | High | **After this wave the MVP1 journey works end to end.** |

## Side tracks

| Track | Stories | Days | Value | When |
|---|---|---|---|---|
| Harden and show | E0-25 Monitoring (M); close **E0-18 Try it (L)** | 23 | Medium | After wave 7. Monitoring feeds live health into the Metrics section; E0-18 stays open until every module has Try it. |
| Roadmap on the site | E0-54 Roadmap tab on How It's Built (M) | 8 | Medium | Any time; reads this file. |

## Later (100 person-days)

| Group | Stories | Days | Value | Why later |
|---|---|---|---|---|
| Product extras | E3-09 Free daily quota (S), E6-04 Refunds (S), E1-07 Branded sign-in (S), E1-08 Sign in with Google (M), E3-06 Ask questions about my documents, RAG (L) | 32 | Medium | Not on the path to the journey. E3-09 builds the free tier that Monetization (E0-28, wave 0) designs. RAG is impressive but needs extraction finished first. |
| Waiting for Nikhil's go | E0-44 Product names and versions (L); E8-02 to E8-08, the human versus Claude Code cost pages (53 days) | 68 | Low | Built when Nikhil says go. E8-04 (a dependency-aware timeline for a human team) can take its build order from this file. |

## Risks and notes

- **Biggest risk:** E0-07 (L). The critical path runs through it: Foundation and Identity (89 days) are longer than the documentation (60 days), so the business steps wait on the foundation, not on the documents.
- **Wave 0 gates the business steps:** its sections need real sources (market figures with links, prices, metrics targets); a section without them stays "Coming Soon...". It has 29 days of slack before it holds up Upload.
- **Second:** E3-02 (L), the first real Claude call; its quality is measured by E0-04's evals and its spend capped by E0-26.
- Issue #45 is titled "Store outputs"; the epics file now calls E5-04 "Build outputs on demand".
