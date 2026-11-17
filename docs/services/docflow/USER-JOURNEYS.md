# DocFlow service — user journeys

> **Version 1 · The app that connects the services.** Status: designed, not built. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

What a person sees across the whole DocFlow journey, and where DocFlow's own steps are.

## Upload to results

**Who:** Someone with an invoice · **Starts when:** Starts on My documents. · **Stories:** `MVP1-E0-09`, `MVP1-E2-05`

| Step | The person | The system |
|---|---|---|
| 1 | Sees My documents, or 'Upload your first invoice' with a sample invoice to try. | DocFlow lists the person's documents with status and next action. |
| 2 | Uploads, sees a preview of the file, and taps Continue to the extraction page. | DocFlow starts the document, Upload stores and checks the file, DocFlow starts Extraction, and the upload screen shows Upload's `FilePreview`. |
| 3 | Watches the steps, then sees 'Review 3 flagged fields'. | Extraction tells DocFlow it finished; DocFlow sends the fields to Review. |
| 4 | Checks the flagged fields and taps Complete review. | DocFlow re-checks the values with Extraction, completes the review, and builds the JSON and CSV. |

**Result:** The results exist, previewable but locked until payment.

## Preview, pay and download

**Who:** Someone with reviewed results · **Starts when:** Opens the results. · **Stories:** `MVP1-E5-01`, `MVP1-E5-03`, `MVP1-E6-01`, `MVP1-E7-01`, `MVP1-E7-02`

| Step | The person | The system |
|---|---|---|
| 1 | Reads the full JSON (with folding) and the CSV on screen; download buttons say 'Pay to download'. | DocFlow returns the stored outputs for preview; downloads answer 402 until paid. |
| 2 | Taps Pay $5.00 and pays on Stripe's page. | DocFlow's server asks Payment for an order at $5.00. |
| 3 | Lands on the success page: 'Confirming payment…', then the buttons work. | The success page polls the order; Payment's event tells DocFlow it is paid; DocFlow asks Delivery to email. |
| 4 | Taps Download CSV; opens it in Excel with correct characters. | DocFlow checks the order is paid, then redirects to a 5-minute Upload link. The CSV is UTF-8 with a BOM. |

**Result:** The person has their files and an email with a link back.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Tries to download before paying (for example by URL) | 'Pay to download.' | `payment_required` |
| A check still fails at Complete review | Which check, with Fix it or 'Values are correct as on the document'. | `checks_failed` |
| Extraction failed | The failure message and Retry. | Document `extraction_failed` |
| Upload rejected the file | The reason and 'Choose another file'. | Document `rejected` |
| Pays for a document already paid | Goes straight to the success page. | `already_paid` |
| A service is down | 'Something went wrong. Try again in a moment.' Nothing is lost. | `dependency_unavailable` |
| A spreadsheet formula in a value, like `=SUM(…)` | The text as written, not a formula, when the CSV is opened. | Prefixed with `'` |
