# Eval plan — LLM outputs in DocFlow

Every LLM feature is measured against a fixed dataset with thresholds that block release. Eval IDs are referenced in the epics.

## How evals run
- **Command:** `npm run eval -- --set dev|holdout [--feature extract|judge|enrich|chat] [--record|--replay]`
- **Reports:** written to `evals/reports/<date>-<feature>-<prompt-version>.md`, with a summary table and the 10 worst cases.
- **When:** on demand; on PRs labelled `evals`; required on any PR that changes a prompt, model ID, schema or the confidence formula.
- **Gate:** a PR fails if any metric misses its threshold, or drops more than 2 points from the baseline saved in `evals/baseline.json`.
- **Release rule:** tune on `dev`; the release decision uses `holdout`, which is never used for prompt tuning.
- **Versioning:** each report records the model ID, prompt version, schema version and dataset version.

## Datasets
| Set | Contents | Size |
|---|---|---|
| `invoices/dev` | Labelled invoices for tuning | 20 |
| `invoices/holdout` | Labelled invoices for release decisions | 10 (grow to 30) |
| `invoices/batches` | Batches of 3–10 invoices (MVP2) | 5 batches |
| `enrichment` | Real public vendors with hand-verified metadata (MVP2) | 30 |
| `chat` | Scripted correction instructions with expected diffs (MVP2) | 40 |

**Sourcing:** synthetic invoices generated from templates (varied layouts, fonts, currencies) and public sample invoices with clear licences. Nothing in `evals/` comes from a user: the repository is public, and a user's data never leaves their account (Nikhil's decision on #41). Real users' corrections stay in Human Review's database (MVP1-E4-04); anything reported from them is an aggregate, never a value.

**Coverage required in each invoice set:** clean digital PDF; scanned or photographed (skewed, low light); multi-page line items; no tax; multiple taxes; non-USD currency; handwritten notes; credit note (negative totals); missing invoice number; dense line items (>25 rows).

**Ground truth:** `<case>.json` in the invoice v1 schema, labelled by hand and checked by a second pass.

## Matching rules
- **Strings:** trimmed, case-insensitive, collapsed whitespace. Addresses use token overlap ≥ 0.9.
- **Numbers:** equal after parsing (±0.01).
- **Dates:** the same calendar date after ISO normalization.
- **Missing values:** "Not present" in ground truth matches only `null`. A made-up value counts as a hallucination.

---

## MVP1 metrics (extraction — E3, E4)
| ID | Metric | Definition | Threshold |
|---|---|---|---|
| EXT-1 | Schema validity | % of outputs that pass the zod/JSON Schema check without repair | 100% after one repair; ≥98% before repair |
| EXT-2 | Header field accuracy | % of header fields matching ground truth | ≥95% clean · ≥85% scanned |
| EXT-3 | Line item F1 | Matching rows by description + amount; F1 across rows | ≥0.90 |
| EXT-4 | Hallucination rate | % of non-null values whose `source_quote` isn't in the document text, or whose ground truth is "not present" | ≤1% |
| EXT-5 | Routing recall | % of wrong fields (vs ground truth) that were flagged for review | ≥90% |
| EXT-6 | Flag rate | % of all fields flagged (review burden) | ≤25% |
| EXT-7 | Latency | Extraction time per document, p95 (≤5 pages) | ≤60 s |
| EXT-8 | Cost | Mean LLM cost per document | ≤$0.10 |
| EXT-9 | Calibration (tracked, not gating) | Expected calibration error of final confidence | ≤0.10 target |

**Why EXT-5 and EXT-6 come as a pair:** flagging everything gives perfect recall and a useless product. Tune the threshold so both hold, and plot the trade-off curve in the report.

### Questions over my documents (RAG) — MVP1-E3-06
Dataset `rag`: questions written over the synthetic invoices, each with the passages that answer it and the expected answer; a third are unanswerable from the documents.

| ID | Metric | Definition | Threshold |
|---|---|---|---|
| RAG-1 | Retrieval recall | % of questions where an answering passage is in the top 5 retrieved | ≥90% |
| RAG-2 | Faithfulness | % of answer statements supported by a cited quote found in the retrieved text | ≥98% |
| RAG-3 | Refusal on unanswerable | % of unanswerable questions answered "not found" instead of a guess | ≥95% |
| RAG-4 | Latency and cost | p95 time and mean cost per question | ≤8 s · ≤$0.02 |

---

## MVP2 metrics

### Multi-document pipeline — E9
| ID | Metric | Threshold |
|---|---|---|
| MD-1 | Batch completeness: documents reaching a final state (extracted or failed with reason) | 100% |
| MD-2 | Batch latency, 10 documents, p95 | ≤3 min |
| MD-3 | Per-document accuracy in a batch vs alone (EXT-2) | No more than 1 point worse |

### LLM as judge — E10
| ID | Metric | Definition | Threshold |
|---|---|---|---|
| JDG-1 | Judge agreement | Judge verdict vs ground-truth correctness, on fields with a known answer | ≥85% agreement, Cohen's κ ≥0.6 |
| JDG-2 | Routing recall with judge | As EXT-5, using combined confidence | ≥95% |
| JDG-3 | Flag rate with judge | As EXT-6 | ≤25% |
| JDG-4 | Bias checks | Agreement unchanged (±3 pts) when field order is shuffled and when values are reformatted (e.g. "1,240.00" vs "1240") | Pass |
| JDG-5 | Added latency | Judge time ÷ extraction time | ≤30% |

The judge eval set includes **seeded errors**: correct values altered on purpose (swapped digits, wrong date, value from another field). Without them, a judge that always says "correct" would look good.

### Enrichment — E11
| ID | Metric | Definition | Threshold |
|---|---|---|---|
| ENR-1 | Citation coverage | % of returned values with at least one source URL that loads and supports the value | 100% have URLs; ≥90% supported on spot-check |
| ENR-2 | Accuracy | % of values matching hand-verified truth | ≥90% |
| ENR-3 | PII leakage | Search queries containing anything outside the vendor allow-list (amounts, bill-to, line items) | 0 |
| ENR-4 | Abstention | When a vendor can't be found, % returning "unknown" rather than a guess | ≥95% |

### Chat correction — E11
| ID | Metric | Definition | Threshold |
|---|---|---|---|
| CHAT-1 | Correct application | % of the 40 instructions where the proposed diff exactly matches the expected diff | ≥95% |
| CHAT-2 | No unrequested changes | Proposed diffs that touch fields the instruction didn't mention | 0 |
| CHAT-3 | Scope refusal | % of out-of-scope requests refused with a reason | 100% |
| CHAT-4 | Ambiguity handling | % of ambiguous instructions ("fix the date") answered with a clarifying question rather than a guess | ≥90% |

---

## Production monitoring (after launch)
- **Human correction rate:** per field, weekly. A rise of more than 5 points from the previous week triggers a review.
- **Judge–human agreement:** from `/admin/quality`, weekly.
- **Cost and latency:** per job, with alerts at 2× the threshold.
- **Data flywheel:** approved corrections go into the `dev` set monthly; `holdout` is refreshed only with new, never-tuned cases.
