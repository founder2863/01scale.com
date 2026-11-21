# AUTOREP-E1 · AutoRep foundation: decision log

## 2026-11-21 · The agents live inside AutoRep for V1

**Decided by:** Nikhil.

**Options.**
- **In the app (chosen for V1):** the Analyst, Researcher, Writer, Critic, router and Publisher are AutoRep's code.
- **A new agent-orchestration service:** the graph runs in a platform service that apps call.

**Why.** The agents exist to answer reviews; no second app would reuse them today. "Apps are thin" (CLAUDE.md) says logic belongs in a service when a second app could use it, and that is not yet true here. Building a service now would be building for a need we do not have.

**Cost accepted.** AutoRep is a thicker app than DocFlow. The rule is bent on purpose, and recorded in ARCHITECTURE.md §13.

**Future.** When a second app needs agents, the shared parts (the run loop, the trace, the policy checks) move into a service.

## 2026-11-21 · Google Business Profile code lives in AutoRep

**Decided by:** Nikhil.

**Why.** Reading reviews and posting replies is AutoRep's business, not the platform's. The code sits behind a `ReviewSource` interface (list reviews, post a reply) with a demo implementation, so the agents never depend on Google directly.

**Future.** Only the generic part, an OAuth connection to an outside account and its tokens, could become a platform service, once a second app needs to connect outside accounts.

## 2026-11-21 · No vector database in V1

**Decided by:** Nikhil.

**Why.** A business profile fits in the prompt, and outside facts come from Claude's web search, with citations. A vector database would add a store, embeddings and a second provider for no gain in V1. It is listed for AutoRep V2.

## 2026-11-21 · Python LangGraph on AWS Lambda

**Decided by:** Nikhil.

**Options.**
- **Python LangGraph on AWS Lambda (chosen).**
- **TypeScript on Vercel, like the other services.**

**Why.** V1's goal is to showcase multi-agent orchestration with tool use in LangGraph: parallel agents, a tool loop, a reflection loop and `interrupt()` with a Postgres checkpointer. A run can take minutes and wait days for approval, which fits Lambda and a checkpointer better than a short Vercel function. Extraction already moves to Python on Lambda in MVP2, so the platform gains one Python pattern, not two.

**Cost accepted.** The service template (`packages/service-kit`) is TypeScript. Until a Python template exists, AutoRep reproduces its behaviour (token checks, errors, logging, audit) with libraries chosen in `AUTOREP-E1-01`.

**Consequences.** The checkpoints live in Neon, in the `autorep` schema. AutoRep's Architecture & System Design section records this (`AUTOREP-E1-02`).

## 2026-11-21 · Demo mode with recorded reviews; LangSmith off

**Decided by:** Nikhil.

**Why demo mode.** Google approves access to the Business Profile API project by project, and a reply can only be posted by an account that manages the business. A visitor has neither, so demo mode runs AutoRep on recorded reviews; the real API is behind a flag. The recorded reviews are written for the demo, not copied from Google, because they are committed to a public repository (CLAUDE.md: test data is synthetic or public with a clear licence).

**Why LangSmith is off.** Traces would send review text and drafts to a third party. Traces stay in AutoRep's own database (Nikhil's privacy rule).

## 2026-11-21 · AutoRep has its own budget, the same size as DocFlow's

**Decided by:** Nikhil.

**Why.** Each app counts its own Claude spend for now: $5 a month on Opus 5.5, then $5 on Haiku 5.5. With DocFlow and AutoRep, the most Claude can cost is $20 a month, and the Anthropic workspace limit is set to $20. Moving the counting into one platform component is `MVP2-E15-02`.

## Open: does AutoRep trigger the move to event-driven?

On #13 (`docs/decisions/MVP1-E0.md`, ARCHITECTURE.md §12.6), Nikhil decided that the second app on the platform is the trigger to move from orchestration to an event-driven architecture. AutoRep is the second app. As designed, AutoRep consumes no other app's events and no service's event except `identity.user.deleted`, which already goes to everyone, so nothing in V1 needs a broker. **Decision for Nikhil:** keep orchestration for AutoRep V1 and move when two apps consume the same events, or move now.
