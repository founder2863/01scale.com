# PRD — AutoRep V1: AI-drafted replies to Google reviews

| | |
|---|---|
| Owner | Nikhil Shrivastava |
| Status | Draft: designed in stories, nothing built |
| Epics | `docs/epics/AUTOREP-EPICS.md` (E1–E6) |
| Decisions | `docs/decisions/AUTOREP-E1.md` |
| Architecture | `docs/architecture/ARCHITECTURE.md` (§13) |
| Evals | `docs/evals/EVALS.md` (AutoRep section, written in `AUTOREP-E5-01`) |

## 1. Summary
A business owner signs in and connects their Google Business Profile, or uses demo mode. For each new review, a team of AI agents analyses it, researches the facts a reply needs, drafts a reply, critiques and revises it, and decides how risky it is. Low-risk replies on reviews of 4★ or more are published. Anything below 4★, or flagged as risky, waits for the owner's approval first.

**How it is built.** AutoRep is the second app on the 01scale platform. It reuses Identity (sign-in), Human Review (approval) and Delivery (the "needs approval" email) unchanged. Its own part is a multi-agent graph in Python LangGraph, and the Google Business Profile code.

## 2. Problem
Small businesses get reviews faster than they can answer them well. Replies matter for ranking and trust, but writing each one takes time, and a careless reply to an angry or legal-sounding review can do real harm. Owners need replies that are fast for the easy reviews and careful, checked and approved for the hard ones.

## 3. Why this matters for the portfolio
AutoRep V1 showcases **multi-agent orchestration with tool use in LangGraph**: agents running in parallel, a real tool loop, a reflection loop, risk-based routing, human-in-the-loop with durable checkpoints, and side effects only at the end. It also proves the platform claim: a second, very different app reuses the same services without changing them.

## 4. Users
- **Primary: "Marco", who owns a café.** About 40 Google reviews a month, mostly positive, a few angry. He wants good replies without writing them, and wants to see the hard ones before they go out.
- **Secondary: a hiring manager** who opens AutoRep in demo mode and watches a run: the graph, each agent's output, the critic's revisions, and the approval step.

## 5. Goals and non-goals
**Goals**
1. A reply for a clean 5★ review is drafted, checked and published with no human action.
2. Every reply below 4★ or flagged risky waits for the owner's approval; none is published without it.
3. Every factual claim in a reply is backed by a source (the business profile, a past reply, the review thread or a cited web page).
4. On the eval set, the critic loop measurably improves replies over the first draft (`AUTOREP-E5`).

**Non-goals for V1** (AutoRep V2): analytics, a vector database, Slack, auto-posting without approval, several locations, languages other than English.

## 6. Scope
**In V1:** demo mode with recorded reviews; the Google Business Profile API behind a flag; the agent graph; human approval through Human Review; the "needs approval" email through Delivery; a product page with the graph and a run trace.

**Not in V1:** see non-goals. P2PFlow and other apps are separate.

## 7. User journey
1. The owner signs in (Identity) and opens AutoRep.
2. They connect their Google Business Profile, or choose demo mode with recorded reviews.
3. AutoRep fetches new reviews and starts a run for each.
4. Low-risk, 4★ or more: the reply is published, and the owner sees it in the list with its trace.
5. Otherwise: the owner gets an email, "A reply needs your approval" (Delivery). They open the review task (Human Review), accept or edit the reply, and approve. AutoRep resumes the run and publishes.

## 8. The agent graph
`ingest → [Analyst ‖ Researcher] → Writer → Critic (up to 2 revisions) → risk router → Publisher`, with high risk going through human approval before the Publisher.

| Agent | Job | Tools and output |
|---|---|---|
| Analyst | Understand the review | Structured output: sentiment, topics, risk flags, and what the reply must address |
| Researcher | Find the facts a reply needs | A real tool loop choosing among `web_search` (Claude's built-in web search, with citations), `get_business_profile`, `get_past_replies`, `get_review_thread` |
| Writer | Draft the reply | From the analysis and the sourced facts only |
| Critic | Check and send back for revision | `check_policy` (deterministic rules): tone; no promises, refunds or compensation; no personal information; every factual claim has a source. Up to 2 revisions |
| Risk router | Decide the path | Below 4★ or any risk flag: human approval; otherwise: publish |
| Publisher | Post the reply | `post_reply`, idempotent, the only step with a side effect |

Human approval uses LangGraph `interrupt()`, with the run's state saved by a Postgres checkpointer in Neon, so a run can wait days for the owner and resume exactly where it stopped.

## 9. Functional requirements (summary — details in epics)
- **Review source:** a `ReviewSource` interface (list reviews, post a reply) with two implementations: demo (recorded reviews) and Google Business Profile (behind a flag, after Google approves API access). The Google code lives in AutoRep, not the platform.
- **Runs:** one run per review, its state checkpointed after every step, and a trace of each agent's input summary, output and tool calls.
- **Approval:** a reply waiting for approval becomes a Human Review task with one field, the reply, which the owner accepts or edits, then completes.
- **Publishing:** only after the router or the owner allows it, once per review, whatever retries happen.

## 10. Data
In AutoRep's own schema (`autorep`): connections (the owner's review source), reviews seen, runs (status, model, cost, the Human Review task ID) and LangGraph's checkpoint tables. No vector database: the business profile fits in the prompt, and outside facts come from web search.

## 11. Non-functional requirements
- **Hosting:** Python on AWS Lambda (decision in `docs/decisions/AUTOREP-E1.md`), called through the gateway like every service and app.
- **Security:** review text, threads and web pages are untrusted input. The model never triggers an action directly: tools return data, and only the graph's Publisher posts, after the router or the owner allows it. Prompt-injection attempts are part of the eval set.
- **Privacy:** an owner's reviews, drafts and connection tokens stay in their account. Demo reviews committed to the repository are written for the demo, not copied from Google. Traces stay in AutoRep's database; LangSmith is off.
- **Cost:** AutoRep's own budget, the same size as DocFlow's: $5 a month on Opus 5.5, then $5 on Haiku 5.5, then paused until next month (`AUTOREP-E6-02`).

## 12. Success metrics
- Share of replies published without edits, and share of risky reviews that reached the owner (target: all).
- Critic improvement on the eval set: policy violations and unsourced claims before and after revision.
- Cost per reply and time per run.

## 13. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Google does not approve API access | Demo mode works without it; the real API is behind a flag |
| A review tries to steer the model (prompt injection) | Untrusted input is marked as data; tools cannot post; evals include injection attempts |
| A reply promises something or states a false fact | `check_policy` rules, sources for every claim, approval below 4★ or when flagged |
| Costs grow with agents and web search | AutoRep's own monthly budget, Haiku fallback, then pause |

## 14. Release plan
E1 foundation and architecture → E2 agents → E3 routing, approval and publishing → E4 security → E5 evals → E6 product page, demo and budget.

## 15. Open questions
- Human Review's task screen was designed around a document preview. A reply task has no document: does the existing component show a text field without a preview, or does that need a small change in Human Review's design? (`AUTOREP-E3-02`)
- Delivery's version 1 has one template, `order_paid`. AutoRep needs a second, `reply_needs_approval`, added to Delivery's template list (`AUTOREP-E3-03`).
- Which Python libraries give AutoRep the service template's behaviour (token checks, errors, logging) until a Python template exists (`AUTOREP-E1-01`).
