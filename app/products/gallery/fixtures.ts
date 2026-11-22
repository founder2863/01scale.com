// Synthetic data for the live component galleries (MVP1-E0-19 AC5). Made-up names, example.com
// addresses and invented numbers only (Nikhil's privacy rule).

import { STEP_NAMES, type ExtractedField, type Job, type StepName } from "@01scale/ui-extraction";
import type { Message } from "@01scale/ui-delivery";
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
