// An in-browser mock of the platform services DocFlow V1 is built on (MVP1-E0-18 AC2).
//
// Each service answers in the shapes its API spec gives (docs/services/<service>/API-SPEC.md),
// with synthetic data only. Nothing leaves the browser and nothing is kept between visits (AC4):
// Reset throws the whole platform away. When a service is built, the prototype's components call
// the real API through the gateway instead, and this file is replaced by service-kit's mock
// generator (MVP1-E0-07 AC10).
//
// Every call is written to a log so the visitor can watch which service answers each step.

import type { ExtractedField, Job, StepName } from "@01scale/ui-extraction";
import { STEP_NAMES } from "@01scale/ui-extraction";
import type { FieldType, ReviewField, Task } from "@01scale/ui-review";
import { validateValue } from "@01scale/ui-review";
import type { Order } from "@01scale/ui-payment";
import type { Message } from "@01scale/ui-delivery";
import { SAMPLE_FIELDS, type InvoiceFieldName } from "./sample-invoice";

// The types come from each service's UI package, so the mock and the components cannot drift apart.
export type { ExtractedField, Job, ReviewField, Task, Order, Message, FieldType, StepName };

// ------------------------------------------------------------------ Shared types

export type Problem = { status: number; code: string; title: string; detail: string; failed?: CheckResult[] };

export class ApiError extends Error {
  constructor(public problem: Problem) {
    super(problem.detail);
  }
}

export type Caller = "browser" | "docflow" | "event" | "stripe";
export type LogEntry = { id: number; at: string; caller: Caller; method: string; path: string; status: number; note?: string };

export type Settings = {
  /** The next extraction job fails at "reading_document" (a failure case from the journey). */
  failNextExtraction: boolean;
  /** Called when a simulated failure has been used, so the switch on screen can turn itself off. */
  onFailureUsed?: () => void;
};

// Identity
export type User = { id: string; email: string };

// Upload
export type UploadFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: "pending_upload" | "ready" | "rejected";
  rejection_code: string | null;
  rejection_detail: string | null;
};

export type CheckResult = { rule: string; passed: boolean; message: string; fields: string[] };

// DocFlow
export type DocStatus =
  | "pending_upload"
  | "uploaded"
  | "rejected"
  | "extracting"
  | "extraction_failed"
  | "needs_review"
  | "reviewed"
  | "paid";
export type DocflowDocument = {
  id: string;
  file_name: string;
  file_id: string;
  job_id: string | null;
  review_task_id: string | null;
  order_id: string | null;
  message_id: string | null;
  status: DocStatus;
  created_at: string;
  is_sample: boolean;
};
export type Outputs = {
  locked: boolean;
  values: InvoiceValues;
  checks: CheckResult[];
};
export type InvoiceValues = Record<string, string | null | LineItem[]>;
export type LineItem = { description: string | null; quantity: string | null; unit_price: string | null; amount: string | null };

// ------------------------------------------------------------------ Helpers

const PRICE_CENTS = 500;
const STEP_MS = 900;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(16).slice(2)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function problem(status: number, code: string, title: string, detail: string, extra: Partial<Problem> = {}): never {
  throw new ApiError({ status, code, title, detail, ...extra });
}

const FIELD_TYPES: Record<InvoiceFieldName, FieldType> = {
  vendor_name: "text",
  vendor_address: "text",
  vendor_tax_id: "text",
  invoice_number: "text",
  invoice_date: "date",
  due_date: "date",
  bill_to_name: "text",
  bill_to_address: "text",
  currency: "currency",
  subtotal: "money",
  tax_total: "money",
  total: "money",
  payment_terms: "text",
  description: "text",
  quantity: "number",
  unit_price: "money",
  amount: "money",
};

const HEADER_ORDER: InvoiceFieldName[] = [
  "vendor_name",
  "vendor_address",
  "vendor_tax_id",
  "invoice_number",
  "invoice_date",
  "due_date",
  "bill_to_name",
  "bill_to_address",
  "currency",
  "subtotal",
  "tax_total",
  "total",
  "payment_terms",
];

/** Builds the invoice-v1 values object (as Extraction's check endpoint and DocFlow's outputs use it). */
export function toValues(fields: { name: string; line_index: number | null; value: string | null }[]): InvoiceValues {
  const values: InvoiceValues = {};
  for (const name of HEADER_ORDER) values[name] = null;
  const lines: LineItem[] = [];
  for (const f of fields) {
    if (f.line_index === null) values[f.name] = f.value;
    else {
      lines[f.line_index] ??= { description: null, quantity: null, unit_price: null, amount: null };
      (lines[f.line_index] as Record<string, string | null>)[f.name] = f.value;
    }
  }
  values.line_items = lines;
  return values;
}

const cents = (v: string | null | undefined) => (v && /^-?\d+(\.\d+)?$/.test(v) ? Math.round(Number(v) * 100) : null);
const money = (c: number) => (c / 100).toFixed(2);

/** Extraction's invoice-v1 rules (docs/services/extraction/API-SPEC.md, POST /checks). */
export function runChecks(values: InvoiceValues): CheckResult[] {
  const lines = (values.line_items as LineItem[]) ?? [];
  const results: CheckResult[] = [];
  const sum = lines.reduce((acc, l) => acc + (cents(l.amount) ?? 0), 0);
  const subtotal = cents(values.subtotal as string);
  results.push({
    rule: "lines_add_up",
    passed: subtotal !== null && Math.abs(sum - subtotal) <= 1,
    message:
      subtotal !== null && Math.abs(sum - subtotal) <= 1
        ? "Line amounts add up to the subtotal."
        : `Line amounts add up to ${money(sum)}, not the subtotal ${values.subtotal ?? "(missing)"}.`,
    fields: ["subtotal", ...lines.map((_, i) => `line_items[${i}].amount`)],
  });
  const tax = cents(values.tax_total as string) ?? 0;
  const total = cents(values.total as string);
  const totalOk = subtotal !== null && total !== null && Math.abs(subtotal + tax - total) <= 1;
  results.push({
    rule: "total_adds_up",
    passed: totalOk,
    message: totalOk
      ? "Subtotal plus tax equals the total."
      : `Subtotal plus tax is ${subtotal === null ? "unknown" : money(subtotal + tax)}, not the total ${values.total ?? "(missing)"}.`,
    fields: ["subtotal", "tax_total", "total"],
  });
  const inv = values.invoice_date as string | null;
  const due = values.due_date as string | null;
  const datesOk = !!inv && !validateValue("date", inv) && (!due || (!validateValue("date", due) && due >= inv));
  results.push({
    rule: "dates_valid",
    passed: datesOk,
    message: datesOk ? "Dates are real and the due date is not before the invoice date." : "The due date is before the invoice date, or a date is not real.",
    fields: ["invoice_date", "due_date"],
  });
  const required = ["vendor_name", "invoice_number", "invoice_date", "currency", "total"].filter((n) => !values[n]);
  results.push({
    rule: "required_present",
    passed: required.length === 0,
    message: required.length === 0 ? "Required fields are present." : `Missing: ${required.join(", ")}.`,
    fields: required,
  });
  return results;
}

/** DocFlow's CSV: UTF-8 with a BOM, one row per line item, formulas neutralised with a leading '. */
export function buildCsv(values: InvoiceValues): string {
  const safe = (v: string | null) => {
    let s = v ?? "";
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [...HEADER_ORDER, "line_description", "line_quantity", "line_unit_price", "line_amount"];
  const rows = ((values.line_items as LineItem[]) ?? []).map((line) =>
    [...HEADER_ORDER.map((n) => values[n] as string | null), line.description, line.quantity, line.unit_price, line.amount].map(safe).join(","),
  );
  return `﻿${header.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

// ------------------------------------------------------------------ The platform

export type Platform = ReturnType<typeof createPlatform>;

export function createPlatform(settings: Settings, onLog: (entry: LogEntry) => void) {
  let logId = 1;
  const log = (caller: Caller, method: string, path: string, status: number, note?: string) =>
    onLog({ id: logId++, at: new Date().toISOString().slice(11, 19), caller, method, path, status, note });

  /** Runs a mocked request with network-like latency and logs it, including failures. */
  async function call<T>(caller: Caller, method: string, path: string, run: () => T, ok = 200, ms = 250): Promise<T> {
    await wait(ms);
    try {
      const result = run();
      log(caller, method, path, ok);
      return result;
    } catch (error) {
      if (error instanceof ApiError) log(caller, method, path, error.problem.status, error.problem.code);
      throw error;
    }
  }

  // ---- Identity (AWS Cognito in V1; a labelled stand-in here)
  let session: User | null = null;
  const identity = {
    signIn(email: string) {
      return call("browser", "GET", "/api/identity/v1/auth/callback?code=…", () => {
        session = { id: uuid(), email };
        return { user: session };
      }, 302, 400);
    },
    me() {
      return call("browser", "GET", "/api/identity/v1/me", () => {
        if (!session) problem(401, "not_authenticated", "Not signed in", "Sign in to continue.");
        return { user: session as User };
      });
    },
    signOut() {
      return call("browser", "POST", "/api/identity/v1/auth/logout", () => {
        session = null;
        return {};
      }, 204);
    },
  };

  // ---- Upload
  const files = new Map<string, UploadFile>();
  const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
  const upload = {
    createFile(caller: Caller, name: string, mime: string, size: number) {
      return call(caller, "POST", "/api/upload/v1/files", () => {
        if (!ALLOWED.includes(mime))
          problem(415, "unsupported_file_type", "Unsupported file type", "DocFlow reads PDF, PNG and JPEG files.");
        if (size > 10 * 1024 * 1024)
          problem(413, "file_too_large", "File too large", `This file is ${(size / 1048576).toFixed(1)} MB. The limit is 10 MB.`);
        if (size < 1) problem(422, "validation_failed", "Empty file", "This file is empty.");
        const file: UploadFile = { id: uuid(), name, mime, size, status: "pending_upload", rejection_code: null, rejection_detail: null };
        files.set(file.id, file);
        return { file, upload: { url: "https://storage.example.com/presigned…", expires_in: 300 } };
      }, 201);
    },
    putToStorage(fileId: string) {
      return call("browser", "PUT", "S3 presigned upload link (5-minute, one file)", () => fileId, 200, 600);
    },
    complete(caller: Caller, fileId: string) {
      return call(caller, "POST", `/api/upload/v1/files/${short(fileId)}/complete`, () => {
        const file = files.get(fileId);
        if (!file) problem(404, "file_not_found", "Not found", "No such file.");
        file!.status = "ready";
        return { file: file! };
      }, 200, 350);
    },
  };

  // ---- LLM Extraction
  const jobs = new Map<string, { job: Job; startedAt: number; failAt: number | null; fields: ExtractedField[] }>();
  function advance(entry: { job: Job; startedAt: number; failAt: number | null }) {
    const { job } = entry;
    if (job.status === "extracted" || job.status === "failed") return job;
    const elapsed = Date.now() - entry.startedAt;
    const index = Math.floor(elapsed / STEP_MS) - 1; // the first ~second is "queued"
    if (index < 0) return job;
    job.status = "processing";
    job.steps = STEP_NAMES.map((name, i) => ({
      name,
      state: i < index ? "done" : i === index ? "running" : "waiting",
    }));
    if (entry.failAt !== null && index >= entry.failAt) {
      job.steps = STEP_NAMES.map((name, i) => ({ name, state: i < entry.failAt! ? "done" : i === entry.failAt ? "failed" : "waiting" }));
      job.status = "failed";
      job.error_code = "model_unavailable";
      job.error_message = "The model did not answer in time. Nothing was saved; try again.";
      job.retryable = true;
    } else if (index >= STEP_NAMES.length) {
      job.steps = STEP_NAMES.map((name) => ({ name, state: "done" }));
      job.status = "extracted";
      job.fields_total = SAMPLE_FIELDS.length;
      job.fields_flagged = SAMPLE_FIELDS.filter((f) => f.flagged).length;
    }
    return job;
  }
  const extraction = {
    createJob(caller: Caller, fileId: string) {
      return call(caller, "POST", "/api/extraction/v1/jobs", () => {
        const job: Job = {
          id: uuid(),
          file_id: fileId,
          schema: "invoice-v1",
          status: "queued",
          steps: STEP_NAMES.map((name) => ({ name, state: "waiting" })),
          fields_total: 0,
          fields_flagged: 0,
          error_code: null,
          error_message: null,
          retryable: false,
        };
        const failAt = settings.failNextExtraction ? 2 : null;
        if (failAt !== null) {
          settings.failNextExtraction = false;
          settings.onFailureUsed?.();
        }
        const fields = SAMPLE_FIELDS.map((f) => ({ ...f, id: uuid() }));
        jobs.set(job.id, { job, startedAt: Date.now(), failAt, fields });
        return { job: { ...job } };
      }, 202);
    },
    getJob(jobId: string) {
      return call("browser", "GET", `/api/extraction/v1/jobs/${short(jobId)}`, () => {
        const entry = jobs.get(jobId);
        if (!entry) problem(404, "job_not_found", "Not found", "No such job.");
        return { job: structuredClone(advance(entry!)) };
      }, 200, 120);
    },
    getFields(caller: Caller, jobId: string, flagged = false) {
      return call(caller, "GET", `/api/extraction/v1/jobs/${short(jobId)}/fields${flagged ? "?flagged=true" : ""}`, () => {
        const entry = jobs.get(jobId);
        if (!entry) problem(404, "job_not_found", "Not found", "No such job.");
        if (advance(entry!).status !== "extracted") problem(409, "job_not_finished", "Not finished", "The job is still running, or failed.");
        return { data: structuredClone(entry!.fields.filter((f) => !flagged || f.flagged)) };
      });
    },
    check(caller: Caller, values: InvoiceValues) {
      return call(caller, "POST", "/api/extraction/v1/checks", () => {
        const results = runChecks(values);
        return { passed: results.every((r) => r.passed), results };
      });
    },
  };

  // ---- Human Review
  const tasks = new Map<string, { task: Task; fields: ReviewField[] }>();
  function summarise(entry: { task: Task; fields: ReviewField[] }) {
    const flagged = entry.fields.filter((f) => f.flagged);
    entry.task.total_flagged = flagged.length;
    entry.task.resolved = flagged.filter((f) => f.status !== "pending").length;
    entry.task.can_complete = entry.task.status === "open" && entry.task.resolved === flagged.length;
  }
  const review = {
    createTask(caller: Caller, fields: ExtractedField[]) {
      return call(caller, "POST", "/api/review/v1/tasks", () => {
        const entry = {
          task: { id: uuid(), status: "open" as const, resolved: 0, total_flagged: 0, can_complete: false },
          fields: fields.map((f) => ({
            ...f,
            type: FIELD_TYPES[f.name as InvoiceFieldName],
            original_value: f.value,
            status: (f.flagged ? "pending" : "accepted") as ReviewField["status"],
          })),
        };
        summarise(entry);
        tasks.set(entry.task.id, entry);
        return { task: { ...entry.task } };
      }, 201);
    },
    getTask(taskId: string) {
      return call("browser", "GET", `/api/review/v1/tasks/${short(taskId)}`, () => {
        const entry = tasks.get(taskId);
        if (!entry) problem(404, "task_not_found", "Not found", "No such review.");
        return structuredClone(entry!);
      });
    },
    decide(taskId: string, fieldId: string, action: "accept" | "edit" | "not_present", value?: string) {
      return call("browser", "PATCH", `/api/review/v1/tasks/${short(taskId)}/fields/${short(fieldId)}`, () => {
        const entry = tasks.get(taskId);
        const field = entry?.fields.find((f) => f.id === fieldId);
        if (!entry || !field) problem(404, "field_not_found", "Not found", "No such field.");
        if (action === "edit") {
          const error = validateValue(field!.type, value ?? "");
          if (error) problem(422, "validation_failed", "Invalid value", error);
          field!.value = value!.trim();
          field!.status = value!.trim() === field!.original_value ? "accepted" : "edited";
        } else if (action === "accept") {
          field!.value = field!.value ?? field!.original_value;
          field!.status = field!.value === field!.original_value ? "accepted" : "edited";
        } else {
          field!.value = null;
          field!.status = "not_present";
        }
        summarise(entry!);
        return { field: { ...field! }, resolved: entry!.task.resolved, can_complete: entry!.task.can_complete };
      });
    },
    complete(caller: Caller, taskId: string) {
      return call(caller, "POST", `/api/review/v1/tasks/${short(taskId)}/complete`, () => {
        const entry = tasks.get(taskId);
        if (!entry) problem(404, "task_not_found", "Not found", "No such review.");
        summarise(entry!);
        if (entry!.task.status === "open" && !entry!.task.can_complete) {
          const left = entry!.task.total_flagged - entry!.task.resolved;
          problem(409, "fields_pending", "Fields pending", `${left} flagged field${left === 1 ? " is" : "s are"} still waiting for a decision.`);
        }
        entry!.task.status = "completed";
        summarise(entry!);
        return { task: { ...entry!.task }, values: toValues(entry!.fields) };
      });
    },
    /** For DocFlow's server: the task's latest values (corrections after completion included). */
    values(caller: Caller, taskId: string) {
      return call(caller, "GET", `/api/review/v1/tasks/${short(taskId)}`, () => {
        const entry = tasks.get(taskId);
        if (!entry) problem(404, "task_not_found", "Not found", "No such review.");
        return toValues(entry!.fields);
      }, 200, 120);
    },
  };

  // ---- Payment (Stripe Checkout in test mode; a labelled stand-in here)
  const orders = new Map<string, Order>();
  const payment = {
    createOrder(reference: string, description: string) {
      return call("docflow", "POST", "/api/payment/v1/orders", () => {
        const existing = [...orders.values()].find((o) => o.reference === reference && o.status !== "expired" && o.status !== "failed");
        if (existing?.status === "paid") problem(409, "already_paid", "Already paid", "This document is already paid for.");
        if (existing) return { order: { ...existing } };
        const order: Order = {
          id: uuid(),
          app: "docflow",
          reference,
          description,
          amount: PRICE_CENTS,
          currency: "usd",
          status: "pending",
          checkout_url: "https://checkout.stripe.com/c/pay/cs_test_…",
          paid_at: null,
        };
        orders.set(order.id, order);
        return { order: { ...order } };
      }, 201);
    },
    getOrder(orderId: string) {
      return call("browser", "GET", `/api/payment/v1/orders/${short(orderId)}`, () => {
        const order = orders.get(orderId);
        if (!order) problem(404, "order_not_found", "Not found", "No such order.");
        return { order: { ...order! } };
      }, 200, 150);
    },
    /** What Stripe's hosted page does, simulated: test card 4242… pays, 4000 0000 0000 0002 is declined. */
    stripePay(orderId: string, card: string) {
      return call("stripe", "POST", "Stripe Checkout (test mode) → pay", () => {
        const order = orders.get(orderId);
        if (!order) problem(404, "order_not_found", "Not found", "No such order.");
        const digits = card.replace(/\D/g, "");
        if (digits === "4000000000000002") problem(402, "card_declined", "Card declined", "Your card was declined. Try another card.");
        if (digits !== "4242424242424242")
          problem(422, "invalid_card", "Test cards only", "This is test mode: use 4242 4242 4242 4242, or 4000 0000 0000 0002 to see a decline.");
        return order!;
      }, 200, 700);
    },
    markPaid(orderId: string) {
      return call("stripe", "POST", "/api/payment/v1/webhooks/stripe  (checkout.session.completed)", () => {
        const order = orders.get(orderId)!;
        order.status = "paid";
        order.paid_at = new Date().toISOString();
        return { ...order };
      }, 200, 400);
    },
  };

  // ---- Delivery (Resend in V1; nothing is really sent here)
  const messages = new Map<string, Message>();
  const delivery = {
    send(to: string) {
      return call("docflow", "POST", "/api/delivery/v1/messages", () => {
        const message: Message = { id: uuid(), channel: "email", to, template: "results_ready", status: "queued" };
        messages.set(message.id, message);
        setTimeout(() => (message.status = "sent"), 1500);
        return { message: { ...message } };
      }, 202);
    },
    getMessage(messageId: string) {
      return call("browser", "GET", `/api/delivery/v1/messages/${short(messageId)}`, () => {
        const message = messages.get(messageId);
        if (!message) problem(404, "message_not_found", "Not found", "No such message.");
        return { message: { ...message! } };
      }, 200, 150);
    },
  };

  // ---- DocFlow (the thin app: its own API calls the services in a fixed order, MVP1-E0-09)
  const docs = new Map<string, DocflowDocument>();
  function own(id: string) {
    const doc = docs.get(id);
    if (!doc) problem(404, "document_not_found", "Not found", "No such document.");
    return doc!;
  }
  const docflow = {
    list() {
      return call("browser", "GET", "/api/docflow/v1/documents", () => ({
        data: [...docs.values()].reverse().map((d) => ({ ...d })),
        next_cursor: null,
      }), 200, 300);
    },
    async create(name: string, mime: string, size: number, isSample: boolean) {
      log("browser", "POST", "/api/docflow/v1/documents", 201);
      const created = await upload.createFile("docflow", name, mime, size);
      const doc: DocflowDocument = {
        id: uuid(),
        file_name: name,
        file_id: created.file.id,
        job_id: null,
        review_task_id: null,
        order_id: null,
        message_id: null,
        status: "pending_upload",
        created_at: new Date().toISOString(),
        is_sample: isSample,
      };
      docs.set(doc.id, doc);
      return { document: { ...doc }, upload: created.upload };
    },
    async uploadComplete(id: string) {
      const doc = own(id);
      log("browser", "POST", `/api/docflow/v1/documents/${short(id)}/upload-complete`, 202);
      await upload.complete("docflow", doc.file_id);
      doc.status = "uploaded";
      const { job } = await extraction.createJob("docflow", doc.file_id);
      doc.job_id = job.id;
      doc.status = "extracting";
      return { document: { ...doc } };
    },
    async get(id: string) {
      const doc = own(id);
      // The webhook from Extraction moves the document on; the mock does it on the next read.
      if (doc.status === "extracting" && doc.job_id) {
        const entry = jobs.get(doc.job_id)!;
        const job = advance(entry);
        if (job.status === "failed") {
          log("event", "POST", "/api/docflow/v1/webhooks/extraction  (extraction.job.failed)", 200);
          doc.status = "extraction_failed";
        } else if (job.status === "extracted") {
          log("event", "POST", "/api/docflow/v1/webhooks/extraction  (extraction.job.completed)", 200);
          const { data } = await extraction.getFields("docflow", doc.job_id);
          const { task } = await review.createTask("docflow", data);
          doc.review_task_id = task.id;
          doc.status = "needs_review";
        }
      }
      return call("browser", "GET", `/api/docflow/v1/documents/${short(id)}`, () => ({ document: { ...doc } }), 200, 100);
    },
    async retryExtraction(id: string) {
      const doc = own(id);
      log("browser", "POST", `/api/docflow/v1/documents/${short(id)}/retry-extraction`, 202);
      const { job } = await extraction.createJob("docflow", doc.file_id);
      doc.job_id = job.id;
      doc.status = "extracting";
      return { document: { ...doc } };
    },
    async completeReview(id: string, checksOverridden: boolean) {
      const doc = own(id);
      const path = `/api/docflow/v1/documents/${short(id)}/complete-review`;
      const values = await review.values("docflow", doc.review_task_id!);
      const checked = await extraction.check("docflow", values);
      if (!checked.passed && !checksOverridden) {
        log("browser", "POST", path, 422, "checks_failed");
        throw new ApiError({
          status: 422,
          code: "checks_failed",
          title: "Checks failed",
          detail: "Some values break the invoice's rules.",
          failed: checked.results.filter((r) => !r.passed),
        });
      }
      try {
        await review.complete("docflow", doc.review_task_id!);
      } catch (error) {
        if (error instanceof ApiError) log("browser", "POST", path, error.problem.status, error.problem.code);
        throw error;
      }
      doc.status = "reviewed";
      log("browser", "POST", path, 200);
      return { document: { ...doc } };
    },
    async outputs(id: string): Promise<Outputs> {
      const doc = own(id);
      const values = await review.values("docflow", doc.review_task_id!);
      const results = runChecks(values);
      return call("browser", "GET", `/api/docflow/v1/documents/${short(id)}/outputs`, () => ({
        locked: doc.status !== "paid",
        values,
        checks: results,
      }), 200, 100);
    },
    async download(id: string, format: "json" | "csv") {
      const doc = own(id);
      const path = `/api/docflow/v1/documents/${short(id)}/outputs/${format}/download`;
      if (doc.status !== "paid") {
        log("browser", "GET", path, 402, "payment_required");
        problem(402, "payment_required", "Payment required", "Pay to download.");
      }
      const values = await review.values("docflow", doc.review_task_id!);
      return call("browser", "GET", path, () =>
        format === "json" ? JSON.stringify({ schema: "invoice-v1", values }, null, 2) : buildCsv(values),
      );
    },
    async checkout(id: string) {
      const doc = own(id);
      const path = `/api/docflow/v1/documents/${short(id)}/checkout`;
      if (doc.status === "paid") {
        log("browser", "POST", path, 409, "already_paid");
        problem(409, "already_paid", "Already paid", "This document is already paid for.");
      }
      const { order } = await payment.createOrder(`docflow:${doc.id}`, `DocFlow results for ${doc.file_name}`);
      doc.order_id = order.id;
      log("browser", "POST", path, 201);
      return { order };
    },
    /** Payment's signed event reaches DocFlow; DocFlow marks the document paid and asks Delivery to email. */
    async onOrderPaid(orderId: string) {
      const doc = [...docs.values()].find((d) => d.order_id === orderId);
      if (!doc || doc.status === "paid") return;
      log("event", "POST", "/api/docflow/v1/webhooks/payment  (payment.order.paid)", 200);
      doc.status = "paid";
      const { message } = await delivery.send(session?.email ?? "you@example.com");
      doc.message_id = message.id;
    },
  };

  return { identity, upload, extraction, review, payment, delivery, docflow };
}

function short(id: string) {
  return `${id.slice(0, 8)}…`;
}
