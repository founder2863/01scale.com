// Synthetic data for the live component galleries (MVP1-E0-19 AC5). Made-up names, example.com
// addresses and invented numbers only (Nikhil's privacy rule).

import { STEP_NAMES, type ExtractedField, type Job, type StepName } from "@01scale/ui-extraction";
import type { Message } from "@01scale/ui-delivery";
import type { AdminJob, AdminJobsSummary } from "@01scale/ui-extraction";
import type { ApiKey, Me } from "@01scale/ui-identity";
import type { AccuracyReportData, EvalCandidate } from "@01scale/ui-review";
import type { Order } from "@01scale/ui-payment";
import type { ReviewField, Task } from "@01scale/ui-review";
import type { UploadFile } from "@01scale/ui-upload";
import type { DocflowDocument } from "../docflow/try/mock-platform";
import { toValues } from "../docflow/try/mock-platform";
import { SAMPLE_FIELDS } from "../docflow/try/sample-invoice";

/** A problem+json error, shaped as every 01scale API returns it. */
export const problem = (status: number, code: string, detail: string) => ({ problem: { status, code, title: code, detail } });

export const never = <T,>() => new Promise<T>(() => {});
export const ok = <T,>(value: T) => () => Promise.resolve(structuredClone(value));
export const fail = (status: number, code: string, detail: string) => () => Promise.reject(problem(status, code, detail));
export const unavailable = fail(503, "dependency_unavailable", "Something went wrong. Try again in a moment.");

// ---- Extraction

export const FIELDS: ExtractedField[] = SAMPLE_FIELDS.map((f, i) => ({ ...f, id: `fld-${i}` }));

function job(status: Job["status"], runningAt: number, extra: Partial<Job> = {}): Job {
  return {
    id: "job-demo",
    file_id: "file-demo",
    schema: "invoice-v1",
    status,
    steps: STEP_NAMES.map((name: StepName, i) => ({
      name,
      state: status === "extracted" || i < runningAt ? "done" : i === runningAt ? (status === "failed" ? "failed" : status === "queued" ? "waiting" : "running") : "waiting",
    })),
    fields_total: status === "extracted" ? FIELDS.length : 0,
    fields_flagged: status === "extracted" ? FIELDS.filter((f) => f.flagged).length : 0,
    error_code: null,
    error_message: null,
    retryable: false,
    ...extra,
  };
}

export const JOBS = {
  queued: job("queued", 0),
  processing: job("processing", 2),
  extracted: job("extracted", 5),
  extractedClean: { ...job("extracted", 5), fields_flagged: 0 },
  failed: job("failed", 2, { error_code: "model_unavailable", error_message: "The model did not answer in time. Nothing was saved; try again.", retryable: true }),
};

// ---- Review

const TYPES: Record<string, ReviewField["type"]> = {
  invoice_date: "date",
  due_date: "date",
  subtotal: "money",
  tax_total: "money",
  total: "money",
  unit_price: "money",
  amount: "money",
  quantity: "number",
  currency: "currency",
};

export function reviewFields(decided = false): ReviewField[] {
  return FIELDS.map((f) => {
    let status: ReviewField["status"] = f.flagged ? "pending" : "accepted";
    let value = f.value;
    if (decided && f.flagged) {
      if (f.name === "invoice_date") {
        status = "edited";
        value = "2026-11-02";
      } else if (f.name === "vendor_tax_id") {
        status = "not_present";
        value = null;
      } else if (f.name === "amount") {
        status = "edited";
        value = "380.00";
      }
    }
    return { ...f, type: TYPES[f.name] ?? "text", original_value: f.value, value, status };
  });
}

export function task(fields: ReviewField[], status: Task["status"] = "open"): Task {
  const flagged = fields.filter((f) => f.flagged);
  const resolved = flagged.filter((f) => f.status !== "pending").length;
  return { id: "task-demo", status, resolved, total_flagged: flagged.length, can_complete: status === "open" && resolved === flagged.length };
}

export const VALUES = toValues(reviewFields(true));

// ---- Upload

export const FILES: UploadFile[] = [
  { id: "file-1", name: "invoice-nw-0187.pdf", mime: "application/pdf", size: 48_213, status: "ready", created_at: "2026-11-20T10:12:00Z" },
  { id: "file-2", name: "receipt-scan.jpeg", mime: "image/jpeg", size: 1_204_331, status: "ready", created_at: "2026-11-18T08:40:00Z" },
  { id: "file-3", name: "statement.pdf", mime: "application/pdf", size: 220_400, status: "pending_upload", created_at: "2026-11-17T16:05:00Z" },
];

/** A small drawn receipt, as an image preview (inline SVG, nothing fetched). */
export const RECEIPT_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420"><rect width="320" height="420" fill="#fff"/><text x="24" y="48" font-family="sans-serif" font-size="20" font-weight="700" fill="#0b00bf">RECEIPT</text><text x="24" y="80" font-family="sans-serif" font-size="13" fill="#333">Example Café · example.com</text>${[0, 1, 2, 3]
      .map((i) => `<rect x="24" y="${120 + i * 40}" width="${180 - i * 20}" height="10" fill="#ccd"/><rect x="250" y="${120 + i * 40}" width="46" height="10" fill="#ccd"/>`)
      .join("")}<text x="24" y="330" font-family="sans-serif" font-size="16" font-weight="700" fill="#333">Total 24.50</text></svg>`,
  );

// ---- Payment

export const ORDERS: Order[] = [
  { id: "ord-1", app: "docflow", reference: "docflow:doc-1", description: "DocFlow results for invoice-nw-0187.pdf", amount: 500, currency: "usd", status: "paid", checkout_url: "", paid_at: "2026-11-20T10:20:00Z" },
  { id: "ord-2", app: "docflow", reference: "docflow:doc-2", description: "DocFlow results for receipt-scan.jpeg", amount: 500, currency: "usd", status: "expired", checkout_url: "", paid_at: null },
];

export const ORDER = (status: Order["status"]): Order => ({ ...ORDERS[0], status, paid_at: status === "paid" ? ORDERS[0].paid_at : null });

// ---- Delivery

export const MESSAGE = (status: Message["status"]): Message => ({ id: "msg-demo", channel: "email", to: "you@example.com", template: "results_ready", status });

// ---- DocFlow

export const DOCS: DocflowDocument[] = [
  { id: "doc-1", file_name: "invoice-nw-0187.pdf", file_id: "file-1", job_id: "job-1", review_task_id: "task-demo", order_id: "ord-1", message_id: null, status: "paid", created_at: "2026-11-20T10:12:00Z", is_sample: true },
  { id: "doc-2", file_name: "receipt-scan.jpeg", file_id: "file-2", job_id: "job-2", review_task_id: "task-2", order_id: null, message_id: null, status: "needs_review", created_at: "2026-11-18T08:40:00Z", is_sample: false },
  { id: "doc-3", file_name: "statement.pdf", file_id: "file-3", job_id: null, review_task_id: null, order_id: null, message_id: null, status: "rejected", created_at: "2026-11-17T16:05:00Z", is_sample: false },
];

// ---- Identity: account (MVP1-E1-09)

export const ME: Me = { id: "usr-demo", email: "you@example.com", created_at: "2026-10-04T09:12:00Z" };

export const API_KEYS: ApiKey[] = [
  { id: "key-1", name: "Claude Desktop", prefix: "sk_01s_Hq7vT2mX", scopes: ["upload:write", "extraction:read", "docflow:read", "docflow:write"], last_used_at: "2026-11-21T18:02:00Z", expires_at: "2027-02-15T00:00:00Z", created_at: "2026-11-17T09:40:00Z" },
  { id: "key-2", name: "Nightly export script", prefix: "sk_01s_Pz4kW9cL", scopes: ["docflow:read"], last_used_at: null, expires_at: "2026-12-20T00:00:00Z", created_at: "2026-11-20T12:00:00Z" },
];

export const NEW_SECRET = "sk_01s_Ab3dEx4mPl3S3cr3tN0tR3alXyZ0123456789abcdefgh";

// ---- Extraction: admin (MVP1-E3-07)

export const ADMIN_JOBS: { data: AdminJob[]; summary: AdminJobsSummary } = {
  data: [
    { id: "job-a", status: "extracted", model: "claude-opus-5-5", prompt_version: "extract-invoice/v1", pages: 2, tokens_in: 6210, tokens_out: 1480, cost_usd: "0.040830", duration_ms: 28900, error_code: null, created_at: "2026-11-22T09:14:12Z" },
    { id: "job-b", status: "extracted", model: "claude-opus-5-5", prompt_version: "extract-invoice/v1", pages: 1, tokens_in: 3105, tokens_out: 910, cost_usd: "0.022140", duration_ms: 17400, error_code: null, created_at: "2026-11-22T08:51:40Z" },
    { id: "job-c", status: "failed", model: "claude-opus-5-5", prompt_version: "extract-invoice/v1", pages: 3, tokens_in: 0, tokens_out: 0, cost_usd: "0.000000", duration_ms: 60000, error_code: "model_unavailable", created_at: "2026-11-21T22:03:05Z" },
  ],
  summary: { jobs: 100, failure_rate: 0.02, avg_cost_usd: "0.0412", p95_duration_ms: 41200 },
};

// ---- Review: admin (MVP1-E4-05). Made-up values, as every fixture here.

export const CANDIDATES: EvalCandidate[] = [
  { id: "cand-1", reference: "docflow:doc-1", field_name: "total", line_index: null, model_value: "1240.00", human_value: "1230.00", status: "candidate", created_at: "2026-11-21T09:15:30Z" },
  { id: "cand-2", reference: "docflow:doc-2", field_name: "invoice_date", line_index: null, model_value: "2026-02-11", human_value: "2026-11-02", status: "candidate", created_at: "2026-11-20T14:02:10Z" },
  { id: "cand-3", reference: "docflow:doc-3", field_name: "amount", line_index: 1, model_value: "350.00", human_value: "380.00", status: "approved", created_at: "2026-11-18T11:40:00Z" },
];

export const ACCURACY: AccuracyReportData = {
  since: "2026-11-01",
  totals: { tasks: 42, fields_reviewed: 798, corrected: 37, correction_rate: 0.046, corrections_flagged: 0.92 },
  fields: [
    { name: "total", reviewed: 42, flagged: 9, corrected: 6, not_present: 0, approved_mistakes: 5, correction_rate: 0.143 },
    { name: "invoice_date", reviewed: 42, flagged: 12, corrected: 8, not_present: 0, approved_mistakes: 7, correction_rate: 0.19 },
    { name: "vendor_tax_id", reviewed: 42, flagged: 11, corrected: 3, not_present: 8, approved_mistakes: 2, correction_rate: 0.071 },
    { name: "vendor_name", reviewed: 42, flagged: 1, corrected: 0, not_present: 0, approved_mistakes: 0, correction_rate: 0 },
  ],
};
