# LLM Extraction service — UI components

> **Version 1 · One Claude call per document.** Status: designed, not built. Stories: `MVP1-E3-01`, `MVP1-E3-02`, `MVP1-E3-03`, `MVP1-E3-04`, `MVP1-E3-05`.

What the LLM Extraction service ships for apps to use, as the package `packages/ui-extraction`. Designed, not built.

## Rules

- Components call only the LLM Extraction API. The document preview beside them belongs to the app, which gets the file from the Upload service.
- They ship as the package `packages/ui-extraction` and work in any app and for any schema; field labels come from the schema, not from DocFlow.
- Confidence is shown by colour and by words and numbers together, never colour alone: green 'High' from 0.85, amber 'Check' from 0.6, red 'Low' below 0.6.
- Polling stops as soon as a job ends, and pauses while the browser tab is hidden.
- Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.
- Keyboard reachable, visible focus, labelled controls, step changes announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.

## ExtractionProgress

*Component.* The four steps of a running job, ticking off as they finish, with the outcome at the end.

| Input | Type | Meaning |
|---|---|---|
| `jobId` | string | The job to follow. |
| `onFinished` | (job) => void | Called once when the job is `extracted` or `failed`. |

**States:** Queued: all steps waiting; Running: done steps ticked, the current one animated; Extracted: all ticked; Failed: the failed step marked, the message, and Retry when `retryable`; Lost connection: 'Reconnecting…' while polling retries.

**Calls:** `GET /jobs/{jobId}` every 2 seconds while running.

## useExtractionJob()

*Hook.* Starts a job or follows an existing one, and reports its status, for an app with its own design.

| Input | Type | Meaning |
|---|---|---|
| `fileId or jobId` | string | Start a job for a file, or follow a job already started. |
| `schema` | string, optional | Default `invoice-v1`. |

**States:** `starting`; `queued`; `processing` with the current step; `extracted` with counts; `failed` with code, message and `retryable`.

**Calls:** `POST /jobs`, `GET /jobs/{jobId}`.

## FieldList

*Component.* The extracted fields grouped as header and line items, each with its value, a confidence badge and a flag when it needs checking.

| Input | Type | Meaning |
|---|---|---|
| `jobId` | string | The job whose fields to show. |
| `onSelect` | (field) => void, optional | Called when a field is tapped, for example to move the app's preview to its page. |
| `flaggedOnly` | boolean, optional | Show only flagged fields. Default false. |

**States:** Loading: placeholder rows of the same height; Loaded: header fields, then a table of line items; A field not on the document: 'Not found on the document'; Failed: 'Couldn't load the fields.' and Retry.

**Calls:** `GET /jobs/{jobId}/fields`.

## ConfidenceBadge

*Component.* A small label showing how sure the system is about one value.

| Input | Type | Meaning |
|---|---|---|
| `confidence` | number 0 to 1 | The field's final confidence. |
| `flagged` | boolean | Whether the field needs checking. |

**States:** High (green, from 0.85); Check (amber, 0.6 to 0.85); Low (red, below 0.6); Flagged: adds a flag icon whatever the score.

**Calls:** None: it shows the value it is given..

## FieldEvidence

*Component.* For one field: the exact quote from the document, its page, and why it was flagged.

| Input | Type | Meaning |
|---|---|---|
| `field` | Field | The field from the fields request. |

**States:** With quote and page; No value: 'Not found on the document'; With reasons: each reason as a sentence.

**Calls:** None: the evidence comes with the fields..

## NextStepButton

*Component.* 'Review N flagged fields' when anything is flagged, otherwise 'Continue'. The app decides where each goes.

| Input | Type | Meaning |
|---|---|---|
| `job` | Job | The finished job. |
| `onReview, onContinue` | functions | Where to go next. |

**States:** Flagged: 'Review 3 flagged fields'; Nothing flagged: 'Continue to results'; Disabled while the job runs.

**Calls:** None: it reads `fields_flagged` from the job..

## JobsTable

*Component.* For an admin: recent jobs with model, prompt version, pages, tokens, cost, time and outcome, with the summary on top.

| Input | Type | Meaning |
|---|---|---|
| `limit` | number, optional | How many jobs. Default 100. |

**States:** Loading; Loaded, with failure rate, average cost and slowest time; Not an admin: 'Not found'; Failed: Retry.

**Calls:** `GET /admin/jobs`.
