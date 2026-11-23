# LLM Extraction service — developer guide

> **Version 1 · One Claude call per document.** Status: designed, not built. Stories: `MVP1-E3-01`, `MVP1-E3-02`, `MVP1-E3-03`, `MVP1-E3-04`, `MVP1-E3-05`, `MVP1-E3-08`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/extraction-with-claude/readme`.

## What this service is

LLM Extraction is the platform service that reads a document and returns what it says as structured fields. In DocFlow it turns an uploaded invoice into the vendor, dates, amounts and line items.

In version 1 it sends the document to Claude once, with a versioned prompt and a strict output schema. Every value comes back with how confident the model is, the page it is on and the exact text it was read from.

It does not trust the model on its own word. The answer must fit the schema, the numbers must add up, the dates must make sense and every quote must really be in the document. Anything that fails, or that the model is unsure about, is flagged for a person to check.

## Why it exists

| Reason | In plain terms |
|---|---|
| One way to read documents | Every app that needs data from a document uses the same service, the same checks and the same measured quality, instead of each writing its own prompts. |
| Honest about what it does not know | Flagging the uncertain fields lets a person check a few values instead of all of them, and keeps silent mistakes out of the results. |
| Evidence for every value | A page and a quote with every value means a person can verify it in seconds, and a hallucinated value fails the quote check. |
| Measured, not guessed | Each job records its model, prompt version, tokens, cost and time, and the eval set measures accuracy before any prompt or model change ships. |

## What is in this version

**In scope**

- Read one document of up to 10 pages (PDF, PNG or JPEG) into the invoice v1 fields, including scanned PDFs and photos, which are read by OCR
- 'No text found' when a document has no readable text
- A confidence score, page and quote for every value
- Rule checks: amounts, dates, currency, required fields and quotes
- Flag fields below the threshold or failing a check, with reasons
- Retry temporary failures twice, then fail with a plain-language message
- Re-run the rule checks on corrected values
- Cost, tokens and time per job, and a recent-jobs view for the admin

**Not in this version**

- Several documents in parallel, and an orchestrated pipeline on AWS Lambda: `MVP2-E9-02`
- A second model judging the first: `MVP2-E10`
- Enriching vendor details from the web: `MVP2-E11-01`
- Document types other than invoices: a later version, with a new schema and prompt
- Correcting values: that is the Human Review service

## How an extraction works

| Step | Who | What happens |
|---|---|---|
| 1 | App | Calls `POST /jobs` with a ready file's ID and the schema. In DocFlow this happens right after the upload. |
| 2 | LLM Extraction | Checks the file through Upload with the user's own token, records the job as `queued` and answers `202` at once. |
| 3 | LLM Extraction | In the background, fetches the file through a 5-minute Upload link and sends it to Claude with the versioned prompt and a tool definition that forces the invoice v1 schema. |
| 4 | Claude | Returns every field with a value, confidence, page and quote. |
| 5 | LLM Extraction | Validates the answer (one repair attempt if needed), runs the rule checks, sets each field's final confidence, flags what needs a person, and saves the fields with the tokens, cost and time. |
| 6 | LLM Extraction | Announces `extraction.job.completed` (or `failed`) to the app. |
| 7 | App | Has been polling `GET /jobs/{jobId}` every 2 seconds; shows the fields and offers review of the flagged ones. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Job | One attempt to read one file. A retry is a new job. |
| Schema | The list of fields to extract, with their types. Version 1 has one: `invoice-v1`. |
| Model confidence | How sure Claude says it is about a value. Known to be poorly calibrated, so it is never used alone. |
| Final confidence | The lower of the model's confidence and the rule checks' result; a failed check sets 0.3. |
| Flagged | Below the threshold (0.85 by default) or failing a check: a person should look at it. |
| Source quote | The exact text on the page a value was read from. |
| Repair attempt | When the model's answer does not fit the schema, it is sent back once with the errors to fix them. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Extract a file and follow it

Start the job, then poll until it ends. Asking twice for the same file returns the same job.

```ts
const { job } = await api.post("/api/extraction/v1/jobs", {
  file_id: fileId, schema: "invoice-v1",
});
let current = job;
while (current.status === "queued" || current.status === "processing") {
  await sleep(2000);
  current = (await api.get(`/api/extraction/v1/jobs/${job.id}`)).job;
}
```

### 2. Show only what needs checking

Ask for the flagged fields; each carries its reasons and evidence.

```ts
const { data } = await api.get(`/api/extraction/v1/jobs/${jobId}/fields?flagged=true`);
for (const f of data) console.log(f.name, f.value, f.flag_reasons, f.source_quote);
```

### 3. Re-check corrected values

Run the same rules on values a person has fixed, before accepting them.

```ts
const { passed, checks } = await api.post("/api/extraction/v1/validations", {
  schema: "invoice-v1", values: correctedValues,
});
if (!passed) showProblems(checks.filter((c) => !c.passed));
```

### 4. Show progress with the component

Drop in the progress view and decide what happens when it ends.

```tsx
import { ExtractionProgress } from "@01scale/ui-extraction";

<ExtractionProgress jobId={jobId} onFinished={(job) => setJob(job)} />
```

## Endpoints at a glance

Base address: `https://01scale.com/api/extraction/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `POST` | `/jobs` | Signed in | `extraction:write` | Start extracting a file |
| `GET` | `/jobs/{jobId}` | Signed in | `extraction:read` | Check a job |
| `GET` | `/jobs/{jobId}/fields` | Signed in | `extraction:read` | Get the extracted fields |
| `POST` | `/validations` | Signed in | `extraction:write` | Check values against a schema's rules |
| `POST` | `/jobs/{jobId}/release` | Service | `extraction:write` | Release held results |
| `GET` | `/admin/jobs` | Admin | `is_admin` | Recent jobs with cost and timing |
| `POST` | `/events` | Service | None: HMAC signature | Receive platform events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `EXTRACTION_DATABASE_URL` | Neon connection string for the `extraction_service` role | Yes |
| `ANTHROPIC_API_KEY` | The Claude API key | Yes |
| `EXTRACTION_MODEL` | The Claude model ID; default `claude-opus-5-5` (Nikhil's decision on #34). Used for OCR and extraction, and saved on each job. A change needs an eval report. | No |
| `EXTRACTION_PROMPT_VERSION` | `extract-invoice/v1`: a file in `prompts/`. Saved on each job. | No |
| `MODEL_PRICE_INPUT_PER_MTOK, MODEL_PRICE_OUTPUT_PER_MTOK` | The model's price per million tokens, from Anthropic's price list, for the cost estimate | No |
| `FLAG_THRESHOLD` | `0.85`: fields below it are flagged. Tuned with the eval set. | No |
| `UPLOAD_API_URL` | Where the Upload service is reached | No |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks` | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64: signs and verifies platform events | Yes |
| `EVENT_ROUTES` | From the service template: reference prefix → the app's event address (decision on #13) | No |

## Open questions

- Rate limits are starting values to be tuned once there is real traffic.
- Decided by Nikhil on 17 Nov 2026: Claude Opus 5.5 is the default model (#34); scans and photos are in scope, read by OCR, with 'No text found' when there is no text (#34, #35); Upload ships the preview the extraction page uses (#36).
- OCR uses Claude itself, so no second vendor is needed. AWS Textract is the alternative if OCR accuracy or cost on the eval set's scanned cases misses its targets.
- Opus 5.5 costs more per token than the earlier sample model; the eval set measures whether it stays within $0.10 per document.
- Decided by Nikhil on 17 Nov 2026 (#65): photo values are not capped. A person can always see every value, flagged or not, through 'Show all fields' in review, so the minimal implementation is kept. (Later, #80 adds OCR, which lets the quote check run on photos as well.)
