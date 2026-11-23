# LLM Extraction service — user journeys

> **Version 1 · One Claude call per document.** Status: designed, not built. Stories: `MVP1-E3-01`, `MVP1-E3-02`, `MVP1-E3-03`, `MVP1-E3-04`, `MVP1-E3-05`, `MVP1-E3-08`, `MVP1-E3-09`.

What a person sees and what the system does while a document is read, in version 1.

## Watch a document being read

**Who:** Someone who has just uploaded an invoice · **Starts when:** The app starts extraction after the upload. · **Stories:** `MVP1-E3-01`, `MVP1-E3-02`, `MVP1-E3-04`

| Step | The person | The system |
|---|---|---|
| 1 | Sees 'Reading your document' with four steps: getting the file, reading it, checking the numbers, saving. | Extraction records the job as `queued` and starts it in the background. |
| 2 | Watches each step tick off, without the page reloading. | The page asks for the job's status every 2 seconds; each step is marked `done` as it ends. |
| 3 | Sees the document on the left and the fields on the right, each with a coloured confidence badge. | Claude has read the document; the answer passed its schema check; the rule checks ran and the fields were saved. The job is `extracted`. |
| 4 | Sees 'Review 3 flagged fields' or, if none, 'Continue to results'. | The app reads the flagged count from the job and offers the next step. |

**Result:** Every value on the invoice is on screen, with how sure the system is and where it came from. Typically under a minute for a short invoice.

## Check where a value came from

**Who:** Someone looking at an extracted value · **Starts when:** Taps a field. · **Stories:** `MVP1-E3-04`

| Step | The person | The system |
|---|---|---|
| 1 | Taps the Total field, marked red. | The field's page, quote and reasons are already on the page from the fields request. |
| 2 | Sees 'TOTAL DUE $1,240.00, page 2' and the reason 'Total ≠ subtotal + tax (1,150.00 + 80.00 = 1,230.00)'. | Nothing new is fetched. |
| 3 | On a computer, sees the document jump to page 2. | The app moves its document preview to the field's page. |

**Result:** The person can judge the value themselves, with the evidence in front of them.

## Extraction fails, then a retry works

**Who:** Someone whose extraction hit a problem · **Starts when:** The model is overloaded. · **Stories:** `MVP1-E3-01`

| Step | The person | The system |
|---|---|---|
| 1 | Sees the reading step take a little longer than usual. | Claude reported overload. Extraction waits 2 seconds and tries again, then 8 seconds and tries once more. |
| 2 | Sees 'Reading this document is taking longer than usual. Try again in a few minutes.' and a Retry button. | Both retries failed. The job is `failed` with `model_unavailable`, marked retryable. Nothing was charged twice. |
| 3 | Taps Retry a few minutes later. | The app starts a new job for the same file. The failed job stays in the history. |
| 4 | Sees the steps run again and the fields appear. | The new job succeeds. |

**Result:** The person recovers with one tap. Each attempt is recorded with its cost.

## Look at cost and speed

**Who:** The owner (admin) · **Starts when:** Opens the jobs page. · **Stories:** `MVP1-E3-05`

| Step | The person | The system |
|---|---|---|
| 1 | Opens `/admin/jobs`. | Extraction checks the caller is an admin; anyone else gets 'not found'. |
| 2 | Sees the last 100 jobs with model, prompt version, pages, tokens, cost and time, and the failure rate, average cost and slowest times at the top. | The figures come from each job's record. No document content or file names are shown. |

**Result:** The owner can see whether extraction stays under its targets: 60 seconds and $0.10 per document.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| The model is overloaded or rate-limited after both retries | 'Reading this document is taking longer than usual. Try again in a few minutes.' with Retry. | `model_unavailable` |
| The model's answer does not fit the schema, even after one repair | 'We couldn't read this document reliably. Try again, or upload a clearer copy.' | `output_invalid` |
| The file cannot be opened, for example a damaged or password-protected PDF | 'We couldn't open this document. Upload another copy.' | `document_unreadable` |
| No text is found, even by OCR: a blank page, or a photo too blurred or dark to read | 'No text found' and Choose another file. No Retry: the same file would give the same result. | `no_text_found` |
| The job takes longer than its limit | 'Reading took too long. Try again.' with Retry. | `timed_out` |
| The file was deleted or expired before it could be read | 'This file is no longer available. Upload it again.' | `file_unavailable` |
| Starts extraction on a file still uploading | 'This file is still uploading.' | `file_not_ready` |
| Asks for fields while the job is still running | The steps continue; the fields appear when ready. | `job_not_finished` |
| Follows a link to someone else's job | 'Not found.' | `job_not_found` |
| Upload cannot be reached when starting | 'Something went wrong starting. Try again.' | `dependency_unavailable` |
| Starts more than 10 extractions in a minute | 'Too many at once. Wait a moment and try again.' | `rate_limited` |
