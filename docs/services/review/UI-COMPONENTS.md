# Human Review service — UI components

> **Version 1 · A person checks flagged fields.** Status: designed, not built. Stories: `MVP1-E4-01`, `MVP1-E4-02`, `MVP1-E4-03`, `MVP1-E4-04`.

What the Human Review service ships for apps to use, as the package `packages/ui-review`. Designed, not built.

## Rules

- Components call only the Human Review API. Re-checking values against document rules is the app's step, through the LLM Extraction service.
- They ship as the package `packages/ui-review` and work for any set of fields: labels come from field names, checks from field types.
- Keyboard on desktop: Enter accepts, E edits, ↓ moves to the next field, with the shortcuts listed on screen. On phones every action is a button at least 44 pixels tall.
- Evidence (the quote and page) is always beside the value it supports.
- Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.
- Keyboard reachable, visible focus, labelled controls, progress announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.

## ReviewQueue

*Component.* The task's fields, flagged first, each with its value, reason, evidence and the three decisions, with the 'N of M resolved' counter.

| Input | Type | Meaning |
|---|---|---|
| `taskId` | string | The task. |
| `showAll` | boolean, optional | Include unflagged fields. Default false; a 'Show all fields' toggle is built in. |

**States:** Loading: placeholder rows; Open: fields with their status; All resolved: a short 'All checked' message; Completed: marked 'Finished', values still editable; Failed: 'Couldn't load this review.' and Retry.

**Calls:** `GET /tasks/{taskId}`.

## FieldDecision

*Component.* One field's value with Accept, Edit and Not on document; the edit box checks the value as the person types.

| Input | Type | Meaning |
|---|---|---|
| `field` | Field | The field. |
| `onDecided` | (field) => void | Called after the decision is saved. |

**States:** Pending; Editing, with the format hint for the field's type; Invalid: the message under the box; Saving: buttons disabled; Decided: accepted, edited (shows original and new) or not present; Failed: the message and Retry.

**Calls:** `PATCH /tasks/{taskId}/fields/{fieldId}`.

## ResolvedCounter

*Component.* 'N of M resolved', with a bar.

| Input | Type | Meaning |
|---|---|---|
| `resolved, total` | numbers | From the task. |

**States:** Partly resolved; All resolved.

**Calls:** None..

## CompleteReviewButton

*Component.* Completes the task; disabled until every flagged field is decided. Can carry the person's confirmation that failing values are as printed.

| Input | Type | Meaning |
|---|---|---|
| `taskId` | string | The task. |
| `checksOverridden` | boolean, optional | Set by the app when the person confirmed. |
| `onCompleted` | (result) => void | Called with the final values. |

**States:** Disabled with 'N fields left'; Ready; Working; Completed; Failed: the message and Retry.

**Calls:** `POST /tasks/{taskId}/complete`.

## EvalCandidatesTable

*Component.* For an admin, inside the app: corrections with both values, Approve and Reject.

| Input | Type | Meaning |
|---|---|---|
| `status` | string, optional | Which candidates to show. Default `candidate`. |

**States:** Loading; Empty: 'No corrections waiting.'; Loaded; Deciding; Not an admin: 'Not found'; Failed: Retry.

**Calls:** `GET /admin/eval-candidates`, `PATCH /admin/eval-candidates/{candidateId}`.

## AccuracyReport

*Component.* For an admin: per field, how often people corrected it and how well flagging caught it, as numbers only.

| Input | Type | Meaning |
|---|---|---|
| `since` | date, optional | Start of the period. Default 30 days ago. |

**States:** Loading; Shown; Empty: 'No reviews in this period.'; Not an admin: 'Not found'; Failed: Retry.

**Calls:** `GET /admin/accuracy`.
