"use client";

// Live component galleries for module pages (MVP1-E0-19 AC5): every built component, rendered from
// its own package in each of its designed states. Each state gets its own client, fixed to answer
// that way (loading never answers, failed answers with a problem, and so on), with synthetic data.
// A component that is designed but not built yet says so instead (Nikhil's decision, 22 Nov 2026:
// the components a DocFlow user meets are built; admin and account screens come later).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Badge, Tabs, ToastProvider, useToast } from "@01scale/ui-core";
import { MessageStatus, DeliveryClientProvider } from "@01scale/ui-delivery";
import {
  JobsTable,
  ConfidenceBadge,
  ExtractionClientProvider,
  ExtractionProgress,
  FieldEvidence,
  FieldList,
  NextStepButton,
  useExtractionJob,
  type ExtractionClient,
} from "@01scale/ui-extraction";
import {
  AccountDetails,
  ApiKeysManager,
  DeleteAccountDialog,
  PasswordChangeButton,
  CreateAccountButton,
  IdentityClientProvider,
  RequireSignIn,
  SessionProvider,
  SignInButton,
  SignInError,
  SignOutButton,
  UserMenu,
  useSession,
  type IdentityClient,
} from "@01scale/ui-identity";
import { OrderList, OrderStatus, PaymentClientProvider, PaymentSummary, TestModeBanner, type PaymentClient } from "@01scale/ui-payment";
import {
  AccuracyReport,
  EvalCandidatesTable,
  CompleteReviewButton,
  FieldDecision,
  ResolvedCounter,
  ReviewClientProvider,
  ReviewQueue,
  type ReviewClient,
  type ReviewField,
} from "@01scale/ui-review";
import {
  DeleteFileButton,
  FileList,
  FilePreview,
  OpenFileButton,
  UploadArea,
  UploadClientProvider,
  UploadProgress,
  useUpload,
  type PickedFile,
  type UploadClient,
} from "@01scale/ui-upload";
import "@01scale/ui-extraction/styles.css";
import "@01scale/ui-identity/styles.css";
import "@01scale/ui-payment/styles.css";
import "@01scale/ui-review/styles.css";
import "@01scale/ui-upload/styles.css";
import "../docflow/try/prototype.css";
import { DocflowClientProvider } from "../docflow/try/clients";
import { CsvPreview, DocumentsList, DownloadButtons, JsonPreview, ResultsFieldEditor } from "../docflow/try/components/docflow";
import type { Platform } from "../docflow/try/mock-platform";
import { limitToPreview, runChecks } from "../docflow/try/mock-platform";
import { SampleInvoice } from "../docflow/try/sample-invoice";
import { GALLERY_MODULES } from "./modules";
import { ACCURACY, ADMIN_JOBS, API_KEYS, CANDIDATES, ME, NEW_SECRET, DOCS, FIELDS, FILES, JOBS, MESSAGE, ORDER, ORDERS, RECEIPT_IMAGE, VALUES, fail, never, ok, problem, reviewFields, task, unavailable } from "./fixtures";

type Demo = { state: string; note?: string; render: () => ReactNode };

// ------------------------------------------------------------------ helpers

/** Clicks the first button inside it once, to show a state that follows an action (for example a failure). */
function AutoClick({ children, label = "" }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const buttons = Array.from(ref.current?.querySelectorAll("button") ?? []);
    (buttons.find((b) => !label || b.textContent?.includes(label)) ?? buttons[0])?.click();
  }, [label]);
  return <div ref={ref}>{children}</div>;
}

const STATE_SAMPLE: PickedFile = { name: "sample-invoice.pdf", mime: "application/pdf", size: 48_213, objectUrl: null, sample: true };

// Identity's navigate goes nowhere in a gallery; a toast says where it would have gone.
function Identity({ client, children, initialKeys = API_KEYS }: { client: Partial<IdentityClient>; children: ReactNode; initialKeys?: typeof API_KEYS }) {
  const toast = useToast();
  // Keys live in this demo's memory only, so creating and revoking can be clicked through.
  const [keys] = useState(() => structuredClone(initialKeys));
  const full: IdentityClient = {
    getSession: ok({ user: { id: "usr-demo", email: "you@example.com" } }),
    signOut: ok({ logout_url: "https://auth.example.com/logout" }),
    loginUrl: (returnTo) => `/api/identity/v1/auth/login?return_to=${encodeURIComponent(returnTo)}`,
    navigate: (url) => toast.show(`Would go to ${url}`, "info"),
    getMe: ok(ME),
    startPasswordChange: ok({ redirect_url: "https://auth.example.com/change-password" }),
    deleteAccount: ok({ logout_url: "https://auth.example.com/logout" }),
    listApiKeys: () => Promise.resolve(structuredClone({ data: keys })),
    createApiKey: ({ name, scopes, expires_at }) => {
      const api_key = { id: `key-${keys.length + 1}`, name, prefix: "sk_01s_Ab3dEx4m", scopes, last_used_at: null, expires_at: expires_at ?? "2027-02-20T00:00:00Z", created_at: new Date().toISOString() };
      keys.push(api_key);
      return Promise.resolve({ api_key, secret: NEW_SECRET });
    },
    revokeApiKey: (id) => {
      keys.splice(keys.findIndex((k) => k.id === id), 1);
      return Promise.resolve({});
    },
    ...client,
  };
  return <IdentityClientProvider client={full}>{children}</IdentityClientProvider>;
}

function SessionReadout() {
  const session = useSession();
  return (
    <pre className="gallery-readout">
      {JSON.stringify({ status: session.status, user: session.user }, null, 2)}
    </pre>
  );
}

const upload = (client: Partial<UploadClient>) => ({
  putToStorage: ok({}),
  createFile: ({ name, mime, size }: { name: string; mime: string; size: number }) => Promise.resolve({ file: { id: "file-new", name, mime, size, status: "pending_upload" as const } }),
  completeFile: (id: string) => Promise.resolve({ file: { ...FILES[0], id } }),
  listFiles: ok({ data: FILES, next_cursor: "page-2" }),
  getDownloadUrl: ok({ url: "https://storage.example.com/presigned…", expires_at: "2026-11-22T21:00:00Z" }),
  deleteFile: ok({}),
  ...client,
});

function Upload({ client, children }: { client: Partial<UploadClient>; children: ReactNode }) {
  return <UploadClientProvider client={upload(client)}>{children}</UploadClientProvider>;
}

function UploadState() {
  const { state, start } = useUpload();
  useEffect(() => {
    void start(STATE_SAMPLE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { file, ...rest } = state as { file?: PickedFile } & Record<string, unknown>;
  return <pre className="gallery-readout">{JSON.stringify({ ...rest, file: file?.name }, null, 2)}</pre>;
}

function UploadReadout({ client }: { client: Partial<UploadClient> }) {
  return (
    <Upload client={client}>
      <UploadState />
    </Upload>
  );
}

const extraction = (client: Partial<ExtractionClient>): ExtractionClient => ({
  getJob: ok({ job: JOBS.extracted }),
  getFields: ok({ data: FIELDS }),
  createJob: ok({ job: JOBS.queued }),
  ...client,
});

function JobState() {
  const { retry: _retry, job, ...rest } = useExtractionJob({ fileId: "file-demo" });
  void _retry;
  return <pre className="gallery-readout">{JSON.stringify({ ...rest, job: job ? { id: job.id, status: job.status } : null }, null, 2)}</pre>;
}

function JobReadout({ client }: { client: Partial<ExtractionClient> }) {
  return (
    <ExtractionClientProvider client={extraction(client)}>
      <JobState />
    </ExtractionClientProvider>
  );
}

/** A Review client that keeps decisions in memory, so the demo can be clicked. */
function reviewClient(fields: ReviewField[], overrides: Partial<ReviewClient> = {}): ReviewClient {
  const state = structuredClone(fields);
  return {
    getTask: () => Promise.resolve(structuredClone({ task: task(state), fields: state })),
    decide: (_taskId, fieldId, action, value) => {
      const field = state.find((f) => f.id === fieldId)!;
      if (action === "edit") {
        field.value = value ?? null;
        field.status = value === field.original_value ? "accepted" : "edited";
      } else if (action === "accept") field.status = field.value === field.original_value ? "accepted" : "edited";
      else {
        field.value = null;
        field.status = "not_present";
      }
      return Promise.resolve({ field: { ...field }, resolved: task(state).resolved, can_complete: task(state).can_complete });
    },
    ...overrides,
  };
}

function Review({ client, children }: { client: ReviewClient; children: ReactNode }) {
  return <ReviewClientProvider client={client}>{children}</ReviewClientProvider>;
}

const payment = (client: Partial<PaymentClient>): PaymentClient => ({
  getOrder: ok({ order: ORDER("paid") }),
  listOrders: ok({ data: ORDERS, next_cursor: null }),
  ...client,
});

function Docflow({ client, children }: { client: Partial<Platform["docflow"]>; children: ReactNode }) {
  return <DocflowClientProvider client={client as Platform["docflow"]}>{children}</DocflowClientProvider>;
}

const flagged = (name: string) => reviewFields().find((f) => f.name === name && f.flagged)!;

// ------------------------------------------------------------------ the galleries, by module

const GALLERIES: Record<(typeof GALLERY_MODULES)[number], Record<string, Demo[]>> = {
  "login-using-aws": {
    SignInButton: [{ state: "Default", note: "Starts sign-in on the hosted page.", render: () => <SignInButton onStart={() => {}} /> }],
    CreateAccountButton: [{ state: "Default", render: () => <CreateAccountButton onStart={() => {}} /> }],
    "SessionProvider and useSession()": [
      { state: "loading", render: () => <Identity client={{ getSession: never }}><SessionProvider><SessionReadout /></SessionProvider></Identity> },
      { state: "signed_in", render: () => <Identity client={{}}><SessionProvider><SessionReadout /></SessionProvider></Identity> },
      { state: "signed_out", render: () => <Identity client={{ getSession: fail(401, "not_authenticated", "Sign in to continue.") }}><SessionProvider><SessionReadout /></SessionProvider></Identity> },
    ],
    UserMenu: [{ state: "Signed in", render: () => <Identity client={{}}><UserMenu email="you@example.com" onSignedOut={() => {}} /></Identity> }],
    SignOutButton: [
      { state: "Default", render: () => <Identity client={{}}><SignOutButton /></Identity> },
      { state: "Working", render: () => <Identity client={{ signOut: never }}><AutoClick><SignOutButton /></AutoClick></Identity> },
      { state: "Failed", render: () => <Identity client={{ signOut: unavailable }}><AutoClick><SignOutButton /></AutoClick></Identity> },
    ],
    RequireSignIn: [
      { state: "Loading", render: () => <Identity client={{ getSession: never }}><SessionProvider><RequireSignIn><p>The protected page.</p></RequireSignIn></SessionProvider></Identity> },
      { state: "Signed in", render: () => <Identity client={{}}><SessionProvider><RequireSignIn><Alert tone="success">The protected page, shown to you@example.com.</Alert></RequireSignIn></SessionProvider></Identity> },
      { state: "Signed out", note: "Sends the browser to sign in, coming back here.", render: () => <Identity client={{ getSession: fail(401, "not_authenticated", "") }}><SessionProvider><RequireSignIn><p>The protected page.</p></RequireSignIn></SessionProvider></Identity> },
    ],
    SignInError: [
      { state: "login_expired", render: () => <Identity client={{}}><SignInError code="login_expired" /></Identity> },
      { state: "login_state_mismatch", render: () => <Identity client={{}}><SignInError code="login_state_mismatch" /></Identity> },
      { state: "provider_unavailable", render: () => <Identity client={{}}><SignInError code="provider_unavailable" /></Identity> },
      { state: "Unknown code", render: () => <Identity client={{}}><SignInError code="something_else" /></Identity> },
    ],
  },
  "document-upload": {
    UploadArea: [
      { state: "Default", render: () => <Upload client={{}}><UploadArea sample={{ label: "Try a sample", file: STATE_SAMPLE }} onUploaded={() => {}} /></Upload> },
      { state: "Uploading", render: () => <Upload client={{ putToStorage: never }}><AutoClick><UploadArea sample={{ label: "Try a sample", file: STATE_SAMPLE }} onUploaded={() => {}} /></AutoClick></Upload> },
      {
        state: "Rejected",
        render: () => (
          <Upload client={{ createFile: fail(415, "unsupported_file_type", "This file type isn't supported. Use a PDF, PNG or JPEG.") }}>
            <AutoClick><UploadArea sample={{ label: "Try a sample", file: STATE_SAMPLE }} onUploaded={() => {}} /></AutoClick>
          </Upload>
        ),
      },
      { state: "Failed", render: () => <Upload client={{ completeFile: fail(409, "upload_missing", "The file didn't finish arriving. Try again.") }}><AutoClick><UploadArea sample={{ label: "Try a sample", file: STATE_SAMPLE }} onUploaded={() => {}} /></AutoClick></Upload> },
    ],
    "useUpload()": [
      { state: "uploading", render: () => <UploadReadout client={{ putToStorage: never }} /> },
      { state: "checking", render: () => <UploadReadout client={{ completeFile: never }} /> },
      { state: "ready", render: () => <UploadReadout client={{}} /> },
      { state: "rejected", render: () => <UploadReadout client={{ createFile: fail(413, "file_too_large", "This file is 14.2 MB. The limit is 10 MB.") }} /> },
      { state: "failed", render: () => <UploadReadout client={{ completeFile: unavailable }} /> },
    ],
    UploadProgress: [
      { state: "Uploading", render: () => <UploadProgress name="invoice-nw-0187.pdf" percent={40} /> },
      { state: "Done", render: () => <UploadProgress name="invoice-nw-0187.pdf" percent={100} /> },
    ],
    FileList: [
      { state: "Loading", render: () => <Upload client={{ listFiles: never }}><FileList /></Upload> },
      { state: "Empty", render: () => <Upload client={{ listFiles: ok({ data: [], next_cursor: null }) }}><FileList /></Upload> },
      { state: "Loaded", note: "With Load more for the next page.", render: () => <Upload client={{}}><FileList /></Upload> },
      { state: "Failed", render: () => <Upload client={{ listFiles: unavailable }}><FileList /></Upload> },
    ],
    OpenFileButton: [
      { state: "Default", render: () => <Upload client={{}}><OpenFileButton fileId="file-1" onOpen={() => {}} /></Upload> },
      { state: "Working", render: () => <Upload client={{ getDownloadUrl: never }}><AutoClick><OpenFileButton fileId="file-1" /></AutoClick></Upload> },
      { state: "Failed", render: () => <Upload client={{ getDownloadUrl: fail(409, "file_not_ready", "This file is still uploading.") }}><AutoClick><OpenFileButton fileId="file-1" /></AutoClick></Upload> },
    ],
    FilePreview: [
      { state: "PDF", render: () => <FilePreview file={STATE_SAMPLE} fallback={<SampleInvoice />} /> },
      { state: "Image", render: () => <FilePreview file={{ name: "receipt.png", mime: "image/png", size: 2048, objectUrl: RECEIPT_IMAGE }} /> },
      { state: "No preview", render: () => <FilePreview file={{ name: "scan.pdf", mime: "application/pdf", size: 2048, objectUrl: null }} /> },
    ],
    DeleteFileButton: [
      { state: "Default", note: "Select Delete to see the confirmation; the gallery's client deletes nothing.", render: () => <Upload client={{}}><DeleteFileButton fileId="file-1" /></Upload> },
      { state: "Failed", note: "Select Delete, then Delete again, to see the failure and Retry.", render: () => <Upload client={{ deleteFile: unavailable }}><DeleteFileButton fileId="file-1" /></Upload> },
    ],
  },
  "extraction-with-claude": {
    ExtractionProgress: [
      { state: "Queued", render: () => <ExtractionClientProvider client={extraction({ getJob: ok({ job: JOBS.queued }) })}><ExtractionProgress jobId="job-demo" onFinished={() => {}} /></ExtractionClientProvider> },
      { state: "Running", render: () => <ExtractionClientProvider client={extraction({ getJob: ok({ job: JOBS.processing }) })}><ExtractionProgress jobId="job-demo" onFinished={() => {}} /></ExtractionClientProvider> },
      { state: "Extracted", render: () => <ExtractionClientProvider client={extraction({})}><ExtractionProgress jobId="job-demo" onFinished={() => {}} /></ExtractionClientProvider> },
      { state: "Failed", render: () => <ExtractionClientProvider client={extraction({ getJob: ok({ job: JOBS.failed }) })}><ExtractionProgress jobId="job-demo" onFinished={() => {}} onRetry={() => {}} /></ExtractionClientProvider> },
      { state: "Lost connection", render: () => <ExtractionClientProvider client={extraction({ getJob: unavailable })}><ExtractionProgress jobId="job-demo" onFinished={() => {}} /></ExtractionClientProvider> },
    ],
    "useExtractionJob()": [
      { state: "starting", render: () => <JobReadout client={{ createJob: never }} /> },
      { state: "processing", render: () => <JobReadout client={{ getJob: ok({ job: JOBS.processing }) }} /> },
      { state: "extracted", render: () => <JobReadout client={{}} /> },
      { state: "failed", render: () => <JobReadout client={{ getJob: ok({ job: JOBS.failed }) }} /> },
    ],
    FieldList: [
      { state: "Loading", render: () => <ExtractionClientProvider client={extraction({ getFields: never })}><FieldList jobId="job-demo" /></ExtractionClientProvider> },
      { state: "Loaded", render: () => <ExtractionClientProvider client={extraction({})}><FieldList jobId="job-demo" /></ExtractionClientProvider> },
      { state: "Flagged only", render: () => <ExtractionClientProvider client={extraction({ getFields: ok({ data: FIELDS.filter((f) => f.flagged) }) })}><FieldList jobId="job-demo" flaggedOnly /></ExtractionClientProvider> },
      { state: "Failed", render: () => <ExtractionClientProvider client={extraction({ getFields: unavailable })}><FieldList jobId="job-demo" /></ExtractionClientProvider> },
    ],
    ConfidenceBadge: [
      {
        state: "All levels",
        render: () => (
          <div className="ui-inline">
            <ConfidenceBadge confidence={0.97} flagged={false} />
            <ConfidenceBadge confidence={0.71} flagged={false} />
            <ConfidenceBadge confidence={0.41} flagged={false} />
            <ConfidenceBadge confidence={0.66} flagged />
          </div>
        ),
      },
    ],
    FieldEvidence: [
      { state: "With quote", render: () => <FieldEvidence field={FIELDS[0]} /> },
      { state: "With reasons", render: () => <FieldEvidence field={FIELDS.find((f) => f.name === "invoice_date")!} /> },
      { state: "No value", render: () => <FieldEvidence field={FIELDS.find((f) => f.name === "vendor_tax_id")!} /> },
    ],
    JobsTable: [
      { state: "Loading", render: () => <ExtractionClientProvider client={extraction({ listAdminJobs: never })}><JobsTable /></ExtractionClientProvider> },
      { state: "Loaded", note: "The table scrolls sideways inside its box on a phone.", render: () => <ExtractionClientProvider client={extraction({ listAdminJobs: ok(ADMIN_JOBS) })}><JobsTable /></ExtractionClientProvider> },
      { state: "Not an admin", render: () => <ExtractionClientProvider client={extraction({ listAdminJobs: fail(404, "not_found", "Not found.") })}><JobsTable /></ExtractionClientProvider> },
      { state: "Failed", render: () => <ExtractionClientProvider client={extraction({ listAdminJobs: unavailable })}><JobsTable /></ExtractionClientProvider> },
    ],
    NextStepButton: [
      { state: "Flagged", render: () => <NextStepButton job={JOBS.extracted} onReview={() => {}} onContinue={() => {}} /> },
      { state: "Nothing flagged", render: () => <NextStepButton job={JOBS.extractedClean} onReview={() => {}} onContinue={() => {}} /> },
      { state: "Disabled while running", render: () => <NextStepButton job={JOBS.processing} onReview={() => {}} onContinue={() => {}} /> },
    ],
  },
  "human-review": {
    ReviewQueue: [
      { state: "Loading", render: () => <Review client={reviewClient(reviewFields(), { getTask: never })}><ReviewQueue taskId="task-demo" /></Review> },
      { state: "Open", note: "Decide each field: the counter and statuses update.", render: () => <Review client={reviewClient(reviewFields())}><ReviewQueue taskId="task-demo" /></Review> },
      { state: "All resolved", render: () => <Review client={reviewClient(reviewFields(true))}><ReviewQueue taskId="task-demo" /></Review> },
      { state: "Failed", render: () => <Review client={reviewClient(reviewFields(), { getTask: unavailable })}><ReviewQueue taskId="task-demo" /></Review> },
    ],
    FieldDecision: [
      { state: "Pending", render: () => <Review client={reviewClient(reviewFields())}><FieldDecision taskId="task-demo" field={flagged("invoice_date")} onDecided={() => {}} /></Review> },
      { state: "Editing", note: "Type a date that does not exist to see the check.", render: () => <Review client={reviewClient(reviewFields())}><FieldDecision taskId="task-demo" field={flagged("invoice_date")} onDecided={() => {}} startEditing /></Review> },
      { state: "Edited", render: () => <Review client={reviewClient(reviewFields())}><FieldDecision taskId="task-demo" field={reviewFields(true).find((f) => f.name === "invoice_date")!} onDecided={() => {}} /></Review> },
      { state: "Not on document", render: () => <Review client={reviewClient(reviewFields())}><FieldDecision taskId="task-demo" field={reviewFields(true).find((f) => f.name === "vendor_tax_id")!} onDecided={() => {}} /></Review> },
      { state: "Saving", render: () => <Review client={reviewClient(reviewFields(), { decide: never })}><AutoClick label="Accept"><FieldDecision taskId="task-demo" field={flagged("amount")} onDecided={() => {}} /></AutoClick></Review> },
      { state: "Failed", render: () => <Review client={reviewClient(reviewFields(), { decide: unavailable })}><AutoClick label="Accept"><FieldDecision taskId="task-demo" field={flagged("amount")} onDecided={() => {}} /></AutoClick></Review> },
    ],
    EvalCandidatesTable: [
      { state: "Loading", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: never })}><EvalCandidatesTable /></Review> },
      { state: "Empty", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: ok({ data: [], next_cursor: null }) })}><EvalCandidatesTable /></Review> },
      { state: "Loaded", note: "Approve or reject: the row shows the decision.", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: ok({ data: CANDIDATES, next_cursor: null }), decideEvalCandidate: (id, status) => Promise.resolve({ candidate: { ...CANDIDATES.find((c) => c.id === id)!, status } }) })}><EvalCandidatesTable /></Review> },
      { state: "Deciding", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: ok({ data: CANDIDATES, next_cursor: null }), decideEvalCandidate: never })}><AutoClick label="Approve"><EvalCandidatesTable /></AutoClick></Review> },
      { state: "Not an admin", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: fail(404, "not_found", "Not found.") })}><EvalCandidatesTable /></Review> },
      { state: "Failed", render: () => <Review client={reviewClient(reviewFields(), { listEvalCandidates: unavailable })}><EvalCandidatesTable /></Review> },
    ],
    AccuracyReport: [
      { state: "Loading", render: () => <Review client={reviewClient(reviewFields(), { getAccuracy: never })}><AccuracyReport /></Review> },
      { state: "Shown", render: () => <Review client={reviewClient(reviewFields(), { getAccuracy: ok(ACCURACY) })}><AccuracyReport since="2026-11-01" /></Review> },
      { state: "Empty", render: () => <Review client={reviewClient(reviewFields(), { getAccuracy: ok({ ...ACCURACY, totals: { ...ACCURACY.totals, tasks: 0, fields_reviewed: 0, corrected: 0 }, fields: [] }) })}><AccuracyReport since="2026-11-01" /></Review> },
      { state: "Not an admin", render: () => <Review client={reviewClient(reviewFields(), { getAccuracy: fail(404, "not_found", "Not found.") })}><AccuracyReport /></Review> },
      { state: "Failed", render: () => <Review client={reviewClient(reviewFields(), { getAccuracy: unavailable })}><AccuracyReport /></Review> },
    ],
    ResolvedCounter: [
      { state: "Partly resolved", render: () => <ResolvedCounter resolved={1} total={3} /> },
      { state: "All resolved", render: () => <ResolvedCounter resolved={3} total={3} /> },
    ],
    CompleteReviewButton: [
      { state: "Fields left", render: () => <CompleteReviewButton task={task(reviewFields())} complete={async () => true} onCompleted={() => {}} /> },
      { state: "Ready", render: () => <CompleteReviewButton task={task(reviewFields(true))} complete={async () => true} onCompleted={() => {}} /> },
      { state: "Working", render: () => <AutoClick><CompleteReviewButton task={task(reviewFields(true))} complete={never} onCompleted={() => {}} /></AutoClick> },
    ],
  },
  "json-and-csv-output": {
    DocumentsList: [
      { state: "Loading", render: () => <Docflow client={{ list: never }}><DocumentsList onOpen={() => {}} emptyState={null} /></Docflow> },
      { state: "Empty", render: () => <Docflow client={{ list: ok({ data: [], next_cursor: null }) }}><DocumentsList onOpen={() => {}} emptyState={<p><strong>Upload your first invoice.</strong> No invoice to hand? Try the sample.</p>} /></Docflow> },
      { state: "Loaded", render: () => <Docflow client={{ list: ok({ data: DOCS, next_cursor: null }) }}><DocumentsList onOpen={() => {}} emptyState={null} /></Docflow> },
      { state: "Failed", render: () => <Docflow client={{ list: unavailable }}><DocumentsList onOpen={() => {}} emptyState={null} /></Docflow> },
    ],
    JsonPreview: [
      { state: "Before payment", render: () => <JsonPreview {...limitToPreview(VALUES)} /> },
      { state: "After payment", render: () => <JsonPreview values={VALUES} /> },
    ],
    CsvPreview: [
      { state: "Before payment", render: () => <CsvPreview {...limitToPreview(VALUES)} /> },
      { state: "After payment", note: "A wide table scrolls sideways inside its own box.", render: () => <CsvPreview values={VALUES} /> },
    ],
    ResultsFieldEditor: [
      { state: "Before payment", render: () => <Review client={reviewClient(reviewFields(true))}><ResultsFieldEditor taskId="task-demo" checks={runChecks(VALUES)} onSaved={() => {}} locked /></Review> },
      { state: "Viewing", note: "Select Edit beside a value: Review's FieldDecision opens in place.", render: () => <Review client={reviewClient(reviewFields(true))}><ResultsFieldEditor taskId="task-demo" checks={runChecks(VALUES)} onSaved={() => {}} /></Review> },
      {
        state: "Check failed",
        render: () => {
          const fields = reviewFields(true).map((f) => (f.name === "amount" && f.line_index === 1 ? { ...f, value: "350.00", status: "accepted" as const } : f));
          const values = { ...VALUES, line_items: (VALUES.line_items as object[]).map((l, i) => (i === 1 ? { ...l, amount: "350.00" } : l)) };
          return <Review client={reviewClient(fields)}><ResultsFieldEditor taskId="task-demo" checks={runChecks(values as typeof VALUES)} onSaved={() => {}} /></Review>;
        },
      },
    ],
    DownloadButtons: [
      { state: "Locked", render: () => <Docflow client={{ download: () => Promise.reject(problem(402, "payment_required", "Pay to download.")) }}><DownloadButtons documentId="doc-1" locked fileStem="invoice" /></Docflow> },
      { state: "Unlocked", note: "Downloads a real CSV built from the sample values.", render: () => <Docflow client={{ download: (_id: string, f: "json" | "csv") => Promise.resolve(f === "json" ? JSON.stringify({ schema: "invoice-v1", values: VALUES }, null, 2) : "﻿vendor_name,total\r\nNorthwind Paper Co.,1242.00\r\n") }}><DownloadButtons documentId="doc-1" locked={false} fileStem="invoice" /></Docflow> },
    ],
  },
  payment: {
    PaymentSummary: [{ state: "Default", render: () => <PaymentSummary description="DocFlow results for invoice-nw-0187.pdf" amount={500} onPay={async () => {}} /> }],
    TestModeBanner: [{ state: "Shown", render: () => <TestModeBanner /> }],
    OrderStatus: [
      { state: "Confirming", render: () => <PaymentClientProvider client={payment({ getOrder: ok({ order: ORDER("pending") }) })}><OrderStatus orderId="ord-1" onPaid={() => {}} /></PaymentClientProvider> },
      { state: "Paid", render: () => <PaymentClientProvider client={payment({})}><OrderStatus orderId="ord-1" onPaid={() => {}} /></PaymentClientProvider> },
      { state: "Failed", render: () => <PaymentClientProvider client={payment({ getOrder: ok({ order: ORDER("failed") }) })}><OrderStatus orderId="ord-1" onPaid={() => {}} /></PaymentClientProvider> },
    ],
    OrderList: [
      { state: "Loading", render: () => <PaymentClientProvider client={payment({ listOrders: never })}><OrderList /></PaymentClientProvider> },
      { state: "Empty", render: () => <PaymentClientProvider client={payment({ listOrders: ok({ data: [], next_cursor: null }) })}><OrderList /></PaymentClientProvider> },
      { state: "Loaded", render: () => <PaymentClientProvider client={payment({})}><OrderList /></PaymentClientProvider> },
      { state: "Failed", render: () => <PaymentClientProvider client={payment({ listOrders: unavailable })}><OrderList /></PaymentClientProvider> },
    ],
  },
  "account-management": {
    AccountDetails: [
      { state: "Loading", render: () => <Identity client={{ getMe: never }}><AccountDetails /></Identity> },
      { state: "Shown", render: () => <Identity client={{}}><AccountDetails /></Identity> },
      { state: "Failed", render: () => <Identity client={{ getMe: unavailable }}><AccountDetails /></Identity> },
    ],
    PasswordChangeButton: [
      { state: "Default", note: "Sends the person to Cognito's page to change it.", render: () => <Identity client={{}}><PasswordChangeButton /></Identity> },
      { state: "Working", render: () => <Identity client={{ startPasswordChange: never }}><AutoClick><PasswordChangeButton /></AutoClick></Identity> },
      { state: "Changed", render: () => <Identity client={{}}><PasswordChangeButton changed /></Identity> },
      { state: "Failed", render: () => <Identity client={{ startPasswordChange: unavailable }}><AutoClick><PasswordChangeButton /></AutoClick></Identity> },
    ],
    DeleteAccountDialog: [
      { state: "Closed", note: "Select it to open: Delete stays inactive until DELETE is typed. The gallery deletes nothing.", render: () => <Identity client={{}}><DeleteAccountDialog onDeleted={() => {}} /></Identity> },
      { state: "Failed", note: "Open it, type DELETE and confirm, to see the failure and Try again.", render: () => <Identity client={{ deleteAccount: fail(503, "dependency_unavailable", "Sign-in service could not be reached. Nothing was deleted; try again.") }}><DeleteAccountDialog onDeleted={() => {}} /></Identity> },
    ],
    ApiKeysManager: [
      { state: "Loading", render: () => <Identity client={{ listApiKeys: never }}><ApiKeysManager /></Identity> },
      { state: "Empty", render: () => <Identity client={{}} initialKeys={[]}><ApiKeysManager /></Identity> },
      { state: "Listed", note: "Create a key to see its secret once, with Copy; Revoke asks first.", render: () => <Identity client={{}}><ApiKeysManager /></Identity> },
      { state: "Creating", render: () => <Identity client={{}}><AutoClick label="Create an API key"><ApiKeysManager /></AutoClick></Identity> },
      { state: "Limit reached", render: () => <Identity client={{}}><ApiKeysManager limit={2} /></Identity> },
      { state: "Failed", render: () => <Identity client={{ listApiKeys: unavailable }}><ApiKeysManager /></Identity> },
    ],
  },
  "download-and-email-delivery": {
    MessageStatus: [
      { state: "Queued", render: () => <DeliveryClientProvider client={{ getMessage: ok({ message: MESSAGE("queued") }) }}><MessageStatus messageId="msg-demo" /></DeliveryClientProvider> },
      { state: "Sent", render: () => <DeliveryClientProvider client={{ getMessage: ok({ message: MESSAGE("sent") }) }}><MessageStatus messageId="msg-demo" note="sample" /></DeliveryClientProvider> },
      { state: "Failed", render: () => <DeliveryClientProvider client={{ getMessage: ok({ message: MESSAGE("failed") }) }}><MessageStatus messageId="msg-demo" /></DeliveryClientProvider> },
    ],
  },
};

/** The live gallery of one component, or a "not built yet" note if it is designed but not built. */
export function ComponentGallery({ module, name }: { module: string; name: string }) {
  const gallery = (GALLERIES as Record<string, Record<string, Demo[]>>)[module];
  const demos = gallery?.[name];
  const [state, setState] = useState(demos?.[0]?.state ?? "");
  if (!gallery) return null;
  if (!demos)
    return (
      <p className="gallery-not-built">
        <Badge tone="neutral">Designed, not built yet</Badge>
      </p>
    );
  const active = demos.find((d) => d.state === state) ?? demos[0];
  return (
    <ToastProvider>
      <div className="gallery ui-root">
        <p className="gallery-head">
          <Badge tone="success" icon="●">
            Live
          </Badge>
          <span className="ui-hint">From the package, synthetic data</span>
        </p>
        <Tabs
          label={`${name} states`}
          value={active.state}
          onChange={setState}
          items={demos.map((demo) => ({
            id: demo.state,
            label: demo.state,
            content: (
              <div className="gallery-frame">
                {demo.note ? <p className="ui-hint gallery-note">{demo.note}</p> : null}
                {/* key: each state mounts fresh, with its own client */}
                <div key={demo.state}>{demo.render()}</div>
              </div>
            ),
          }))}
        />
      </div>
    </ToastProvider>
  );
}
