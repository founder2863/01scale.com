# MVP1-E5 · Results, preview and payment: decision log

## 2026-11-23 · Results are held for the app until it releases them

**Decided by:** Nikhil, on Claude's recommendation (raised on PR #163, recorded in STATUS.md, confirmed 23 Nov 2026). Stories: `MVP1-E3-08`, `MVP1-E4-06`, `MVP1-E5-05`.

**Problem.** DocFlow shows a four-field preview before payment and everything after (`MVP1-E5-03` AC1 and AC3), enforced in DocFlow's own API. But the person owns their Extraction job and their Review task, so their own token, or an API key, can read every field straight from `GET /api/extraction/v1/jobs/{jobId}/fields` or `GET /api/review/v1/tasks/{taskId}?all=true`. DocFlow's paywall can be walked around. The services cannot simply refuse: they know nothing about payment, and must not (platform services are app-agnostic).

**Nikhil's direction.** API first: the app gets the preview data, then payment, then the full data.

**Options.**

| | A: an app-agnostic hold (chosen) | B: DocFlow owns the work and proxies every read | C: leave it |
|---|---|---|---|
| How | An app that starts a job or task for a person may mark it `hold: true`, with a delegated token; the acting app (`act`) becomes `held_by`. While held, the owner sees only the flagged fields; the holder sees everything and releases the hold when its own condition is met. | DocFlow creates jobs and tasks as itself, so a person's token can read nothing, and DocFlow serves every read, review screens included. | Hide fields only on DocFlow's screens. |
| Services stay app-agnostic | Yes: they learn "held until the app releases", never "payment". | Yes, but each service loses its direct users. | Yes. |
| Components call their own API | Yes: Review's components still call Review; the owner can review the flagged fields. | No: Review's screens would have to go through DocFlow. | Yes. |
| DocFlow stays thin | Yes: two release calls on `payment.order.paid`. | No: it proxies Extraction and Review. | Yes. |
| Paywall holds through the API | Yes. | Yes. | No. |
| Reusable | Every later app (Procure-to-Pay, Order-to-Cash) can gate results the same way. | Each app rebuilds the proxy. | No. |

**Decision.** A. The hold is placed only with a delegated token, so a person cannot place or lift one; only the holder can release it, and release is safe to repeat. While held, the owner may still decide the flagged fields (Review answers `404` for the others). DocFlow starts jobs and tasks held, reads results as the holder for the preview, checks and downloads, and releases both when the order is paid.

**Consequences.**
- Extraction and Review each gain `hold` on create, `held_by` and `released_at` columns, and a `POST …/release` endpoint (Access: Service). No MCP tool: a release is never done for a person by an agent.
- DocFlow's token rule changes: starting an extraction and reading results use a delegated token, because DocFlow is the holder.
- If a release fails after payment, the event is retried; the person is not blocked, because downloads are built by DocFlow as the holder.
