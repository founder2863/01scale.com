"use client";

// The DocFlow V1 clickable prototype (MVP1-E0-18 "Try it", for the DocFlow app), built from the
// design system (MVP1-E0-19) and from each service's designed components.
//
// The shell plays the part of DocFlow's pages: it places the services' components side by side and
// passes values between them, and calls only DocFlow's own API for its process. The services
// answer from an in-browser mock (mock-platform.ts) until they are built.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Badge, Button, Card, Checkbox, Skeleton, Tabs, ToastProvider, problemMessage, useToast } from "@01scale/ui-core";
import { MessageStatus } from "@01scale/ui-delivery";
import { ExtractionProgress, FieldList, NextStepButton, type Job } from "@01scale/ui-extraction";
import { CreateAccountButton, SignInButton, UserMenu } from "@01scale/ui-identity";
import { formatAmount, OrderStatus, PaymentSummary, usePaymentClient, type Order } from "@01scale/ui-payment";
import { CompleteReviewButton, ReviewQueue, type Task } from "@01scale/ui-review";
import { FilePreview, UploadArea, type PickedFile } from "@01scale/ui-upload";
import "@01scale/ui-extraction/styles.css";
import "@01scale/ui-identity/styles.css";
import "@01scale/ui-payment/styles.css";
import "@01scale/ui-review/styles.css";
import "@01scale/ui-upload/styles.css";
import { ApiError, createPlatform, type CheckResult, type DocflowDocument, type LogEntry, type Outputs, type Settings } from "./mock-platform";
import { SAMPLE_FILE_NAME, SAMPLE_FILE_SIZE, SampleInvoice } from "./sample-invoice";
import { CsvPreview, DocumentsList, DownloadButtons, JsonPreview, ResultsFieldEditor } from "./components/docflow";
import { ServiceClients, useDocflow } from "./clients";
import { CognitoStandIn, StripeCheckoutStandIn } from "./stand-ins";
import "./prototype.css";

type Screen = "welcome" | "signin" | "documents" | "upload" | "uploaded" | "extract" | "review" | "results" | "checkout" | "success";

const JOURNEY: { title: string; service: string; screens: Screen[]; detail: string }[] = [
  { title: "Sign in", service: "Identity · AWS Cognito", screens: ["welcome", "signin"], detail: "Cognito's hosted page through OIDC with PKCE; DocFlow never sees a password." },
  { title: "My documents", service: "DocFlow", screens: ["documents"], detail: "Documents with status and next action, or 'Upload your first invoice' with a sample." },
  { title: "Upload and preview", service: "Upload · AWS S3", screens: ["upload", "uploaded"], detail: "A short-lived link uploads straight to private storage; Upload checks the real file type and size." },
  { title: "Extract the fields", service: "LLM Extraction · Claude", screens: ["extract"], detail: "Five steps tick off; each field gets a confidence and the exact quote it came from." },
  { title: "Review flagged fields", service: "Human Review", screens: ["review"], detail: "Accept, edit or mark not on document. DocFlow re-checks the rules before completing." },
  { title: "Preview results", service: "DocFlow", screens: ["results"], detail: "JSON and CSV from Review's latest values. Downloads are locked until payment." },
  { title: "Pay $5.00", service: "Payment · Stripe Checkout", screens: ["checkout"], detail: "DocFlow's server sets the price; Stripe's hosted page takes the card in test mode." },
  { title: "Download and email", service: "DocFlow · Delivery", screens: ["success"], detail: "Payment's event unlocks the downloads; Delivery emails a link back." },
];

const CALLER_LABEL: Record<LogEntry["caller"], string> = {
  browser: "Browser",
  docflow: "DocFlow server",
  event: "Signed event",
  stripe: "Stripe",
};

export default function DocFlowPrototype() {
  return (
    <ToastProvider>
      <Prototype />
    </ToastProvider>
  );
}

function Prototype() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const settings = useRef<Settings>({ failNextExtraction: false });
  const [failNext, setFailNext] = useState(false);
  const [generation, setGeneration] = useState(0);
  settings.current.onFailureUsed = () => setFailNext(false);
  const onLog = useCallback((entry: LogEntry) => setLog((all) => [entry, ...all].slice(0, 80)), []);
  // A new platform on every Reset: nothing is kept between runs or visits (E0-18 AC4).
  const platform = useMemo(() => createPlatform(settings.current, onLog), [generation, onLog]); // eslint-disable-line react-hooks/exhaustive-deps

  const [screen, setScreen] = useState<Screen>("welcome");
  const [email, setEmail] = useState<string | null>(null);
  const [doc, setDoc] = useState<DocflowDocument | null>(null);
  const [files, setFiles] = useState<Record<string, PickedFile>>({});
  const stage = useRef<HTMLDivElement>(null);

  function go(next: Screen) {
    setScreen(next);
    // Move focus to the new step's heading, so keyboard and screen-reader users follow along.
    requestAnimationFrame(() => stage.current?.querySelector<HTMLElement>("h2")?.focus());
  }

  function reset() {
    Object.values(files).forEach((f) => f.objectUrl && URL.revokeObjectURL(f.objectUrl));
    settings.current.failNextExtraction = false;
    setFailNext(false);
    setLog([]);
    setEmail(null);
    setDoc(null);
    setFiles({});
    setGeneration((g) => g + 1);
    go("welcome");
  }

  // Back on the results after paying, the journey is complete.
  const [showAllCalls, setShowAllCalls] = useState(false);
  const stepIndex = screen === "results" && doc?.status === "paid" ? JOURNEY.length - 1 : JOURNEY.findIndex((s) => s.screens.includes(screen));
  const current = Math.max(0, stepIndex);

  async function openDocument(d: DocflowDocument) {
    const { document } = await platform.docflow.get(d.id);
    setDoc(document);
    const next: Record<DocflowDocument["status"], Screen> = {
      pending_upload: "upload",
      uploaded: "extract",
      rejected: "upload",
      extracting: "extract",
      extraction_failed: "extract",
      needs_review: "review",
      reviewed: "results",
      paid: "results",
    };
    go(next[document.status]);
  }

  const sample: PickedFile = { name: SAMPLE_FILE_NAME, mime: "application/pdf", size: SAMPLE_FILE_SIZE, objectUrl: null, sample: true };

  const uploadArea = (
    <UploadArea
      title="Drop an invoice here, or choose a file"
      sample={{ label: "Try the sample invoice", file: sample }}
      footnote="Prototype: your file never leaves this browser tab. Extraction is simulated, so the fields shown afterwards are the sample invoice's."
      create={async (file) => {
        // DocFlow wraps Upload in its own process: it records the document, then Upload makes the file.
        const { document } = await platform.docflow.create(file.name, file.mime, file.size, !!file.sample);
        setFiles((all) => ({ ...all, [document.id]: file }));
        return { fileId: document.file_id, reference: document.id };
      }}
      complete={async (documentId) => {
        const { document } = await platform.docflow.uploadComplete(documentId);
        setDoc(document);
      }}
      onUploaded={() => go("uploaded")}
    />
  );

  const file = doc ? files[doc.id] ?? sample : sample;

  return (
    <ServiceClients platform={platform}>
      <div className="df-proto ui-root">
        <div className="df-controls">
          <p className="df-controls-note">
            <Badge tone="warning">Prototype</Badge> Services answer from an in-browser mock of their designed APIs, with synthetic data. Nothing is stored or sent.
          </p>
          <div className="df-row">
            <Checkbox
              label="Make the next extraction fail"
              checked={failNext}
              onChange={(e) => {
                settings.current.failNextExtraction = e.target.checked;
                setFailNext(e.target.checked);
              }}
            />
            <Button size="sm" variant="secondary" onClick={reset}>
              ↺ Reset
            </Button>
          </div>
        </div>

        {/* The written journey, one line: where you are, which service answers, what happens (E0-18 AC1). */}
        <nav className="df-stepper" aria-label="The journey">
          <ol className="df-stepper-dots">
            {JOURNEY.map((step, i) => (
              <li
                key={step.title}
                className={i === current ? "df-dot df-dot-now" : i < current ? "df-dot df-dot-done" : "df-dot"}
                aria-current={i === current ? "step" : undefined}
                title={step.title}
              >
                <span aria-hidden="true">{i < current ? "✓" : i + 1}</span>
                <span className="ui-visually-hidden">
                  {step.title}
                  {i < current ? ", done" : ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="df-stepper-text">
            <strong>
              Step {current + 1} of {JOURNEY.length} · {JOURNEY[current].title}
            </strong>{" "}
            <span className="df-stepper-service">{JOURNEY[current].service}</span>
            <span className="df-stepper-detail">{JOURNEY[current].detail}</span>
          </p>
        </nav>

        <div className="df-layout">
          <div className="df-app" aria-label="DocFlow prototype">
            <div className="df-appbar">
              <span className="df-appname">
                <span className="df-logo" aria-hidden="true">
                  D
                </span>
                DocFlow
              </span>
              {email ? (
                <UserMenu
                  email={email}
                  onSignedOut={() => {
                    setEmail(null);
                    setDoc(null);
                    go("welcome");
                  }}
                />
              ) : null}
            </div>
            <div className="df-stage" ref={stage}>
              {screen === "welcome" ? (
                <Card title={<span tabIndex={-1}>Turn an invoice into checked data</span>}>
                  <div className="df-stack">
                    <p>Upload an invoice. Claude reads it, you check anything it isn&apos;t sure about, and you download the results as JSON and CSV.</p>
                    <div className="df-row">
                      <SignInButton onStart={() => go("signin")} />
                      <CreateAccountButton onStart={() => go("signin")} />
                    </div>
                  </div>
                </Card>
              ) : null}

              {screen === "signin" ? (
                <>
                  <h2 tabIndex={-1} className="ui-visually-hidden">
                    Sign in
                  </h2>
                  <CognitoStandIn
                    onCancel={() => go("welcome")}
                    onSignedIn={(address) => {
                      setEmail(address);
                      go("documents");
                    }}
                  />
                </>
              ) : null}

              {screen === "documents" ? (
                <Card
                  title={<span tabIndex={-1}>My documents</span>}
                  actions={
                    <Button size="sm" onClick={() => go("upload")}>
                      + Upload
                    </Button>
                  }
                >
                  <DocumentsList
                    onOpen={openDocument}
                    emptyState={
                      <div className="df-stack">
                        <p>
                          <strong>Upload your first invoice.</strong> No invoice to hand? Try the sample.
                        </p>
                        {uploadArea}
                      </div>
                    }
                  />
                </Card>
              ) : null}

              {screen === "upload" ? (
                <Card title={<span tabIndex={-1}>Upload an invoice</span>} actions={<BackButton onClick={() => go("documents")} />}>
                  {uploadArea}
                </Card>
              ) : null}

              {screen === "uploaded" && doc ? (
                <Card title={<span tabIndex={-1}>{file.name}</span>} subtitle="Uploaded and checked. Extraction has started.">
                  <div className="df-stack">
                    <FilePreview file={file} fallback={<SampleInvoice />} />
                    <Button block onClick={() => go("extract")}>
                      Continue
                    </Button>
                  </div>
                </Card>
              ) : null}

              {screen === "extract" && doc ? <ExtractScreen doc={doc} file={file} setDoc={setDoc} go={go} /> : null}
              {screen === "review" && doc ? <ReviewScreen doc={doc} file={file} setDoc={setDoc} go={go} /> : null}
              {screen === "results" && doc ? <ResultsScreen doc={doc} setDoc={setDoc} go={go} /> : null}
              {screen === "checkout" && doc?.order_id ? (
                <CheckoutScreen
                  orderId={doc.order_id}
                  onPaid={(orderId) => {
                    go("success");
                    // Payment's signed event reaches DocFlow a moment later, through the outbox.
                    setTimeout(() => void platform.docflow.onOrderPaid(orderId), 900);
                  }}
                  onCancel={() => go("results")}
                />
              ) : null}
              {screen === "success" && doc ? <SuccessScreen doc={doc} setDoc={setDoc} go={go} /> : null}
            </div>
          </div>

          <details className="df-panel df-apilog">
            <summary>
              <strong>API calls</strong> <span className="ui-hint">{log.length ? `${log.length} so far, newest first` : "none yet"}</span>
            </summary>
            <ol className="df-log" aria-live="off">
              {(showAllCalls ? log : log.slice(0, 8)).map((entry) => (
                <li key={entry.id}>
                  <span className={`df-log-status df-log-${entry.status < 300 ? "ok" : entry.status < 500 ? "warn" : "bad"}`}>{entry.status}</span>
                  <span className="df-log-main">
                    <code>
                      {entry.method} {entry.path}
                    </code>
                    <span className="ui-hint">
                      {CALLER_LABEL[entry.caller]} · {entry.at}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {log.length > 8 ? (
              <Button size="sm" variant="ghost" onClick={() => setShowAllCalls((v) => !v)}>
                {showAllCalls ? "Show the latest 8" : `Show all ${log.length}`}
              </Button>
            ) : null}
          </details>
        </div>
      </div>
    </ServiceClients>
  );
}

function BackButton({ onClick, label = "← My documents" }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClick}>
      {label}
    </Button>
  );
}

type ScreenProps = { doc: DocflowDocument; setDoc: (d: DocflowDocument) => void; go: (s: Screen) => void };

// ------------------------------------------------------------------ Extract

function ExtractScreen({ doc, file, setDoc, go }: ScreenProps & { file: PickedFile }) {
  const docflow = useDocflow();
  const [job, setJob] = useState<Job | null>(null);
  const [retrying, setRetrying] = useState(false);

  return (
    <Card title={<span tabIndex={-1}>Reading {file.name}</span>} actions={<BackButton onClick={() => go("documents")} />}>
      <div className="df-split">
        <div className="df-split-doc">
          <FilePreview file={file} fallback={<SampleInvoice />} />
        </div>
        <div className="df-stack">
          <ExtractionProgress
            key={doc.job_id ?? "none"}
            jobId={doc.job_id!}
            onFinished={async (finished) => {
              // DocFlow hears Extraction's event and hands the fields to Review.
              const { document } = await docflow.get(doc.id);
              setDoc(document);
              setJob(finished);
            }}
            onRetry={async () => {
              setRetrying(true);
              setJob(null);
              const { document } = await docflow.retryExtraction(doc.id);
              setDoc(document);
              setRetrying(false);
            }}
          />
          {retrying ? <p className="ui-hint">Starting again…</p> : null}
          {/* The next step comes first, so nobody scrolls past 21 fields to find it. */}
          <NextStepButton job={job} onReview={() => go("review")} onContinue={() => go("results")} />
          {job?.status === "extracted" ? (
            <>
              <h3 className="df-h3">The {job.fields_flagged} fields to check</h3>
              <FieldList jobId={job.id} flaggedOnly />
              {job.fields_total > job.fields_flagged ? (
                <p className="df-locked-note">
                  <span aria-hidden="true">🔒</span> The other {job.fields_total - job.fields_flagged} fields were read with high confidence. They unlock after payment.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Review

function ReviewScreen({ doc, file, setDoc, go }: ScreenProps & { file: PickedFile }) {
  const docflow = useDocflow();
  const [task, setTask] = useState<Task | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [failed, setFailed] = useState<CheckResult[] | null>(null);
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const queue = useRef<HTMLDivElement>(null);

  return (
    <Card title={<span tabIndex={-1}>Check the flagged fields</span>} subtitle="The highlighted text on the invoice is where each value came from." actions={<BackButton onClick={() => go("documents")} />}>
      <div className="df-split">
        <div className="df-split-doc df-sticky">
          <FilePreview file={file} fallback={<SampleInvoice highlight={quote} />} />
        </div>
        <div className="df-stack" ref={queue}>
          <ReviewQueue
            key={version}
            taskId={doc.review_task_id!}
            onChanged={(t) => {
              setTask(t);
              setFailed(null);
            }}
            onFocusEvidence={setQuote}
            // Before payment, only the flagged fields (MVP1-E5-03 AC4).
            allowShowAll={doc.status === "paid"}
          />
          {failed ? (
            <Alert
              tone="warning"
              title="A check still fails"
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setVersion((v) => v + 1);
                    queue.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Fix it
                </Button>
              }
            >
              <ul className="df-list">
                {failed.map((r) => (
                  <li key={r.rule}>{r.message}</li>
                ))}
              </ul>
              <Checkbox label="Values are correct as on the document" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            </Alert>
          ) : null}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <CompleteReviewButton
            task={task}
            checksOverridden={override}
            complete={async (overridden) => {
              setError(null);
              try {
                const { document } = await docflow.completeReview(doc.id, overridden);
                setDoc(document);
                return true;
              } catch (e) {
                if (e instanceof ApiError && e.problem.code === "checks_failed") setFailed(e.problem.failed ?? []);
                else setError(problemMessage(e));
                return false;
              }
            }}
            onCompleted={() => go("results")}
          />
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ Results

function ResultsScreen({ doc, setDoc, go }: ScreenProps) {
  const docflow = useDocflow();
  const toast = useToast();
  const [outputs, setOutputs] = useState<Outputs | null>(null);
  const [tab, setTab] = useState("json");

  const load = useCallback(async () => setOutputs(await docflow.outputs(doc.id)), [docflow, doc.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const failed = outputs?.checks.filter((c) => !c.passed) ?? [];
  const stem = doc.file_name.replace(/\.[^.]+$/, "");
  return (
    <div className="df-stack">
      <Card
        title={<span tabIndex={-1}>Results for {doc.file_name}</span>}
        subtitle={outputs?.locked ? "Preview the results; downloads unlock after payment." : "Paid. Download as often as you like."}
        actions={<BackButton onClick={() => go("documents")} />}
      >
        {!outputs ? (
          <div className="df-stack" aria-busy="true">
            <Skeleton height={44} width="60%" />
            <Skeleton height={320} />
          </div>
        ) : (
          <div className="df-stack">
            {failed.length ? (
              <Alert tone="warning" title="A value breaks a rule">
                {failed.map((f) => f.message).join(" ")} The download still works: the values are yours. Use Edit values to fix it.
              </Alert>
            ) : null}
            <Tabs
              label="Results views"
              value={tab}
              onChange={setTab}
              items={[
                { id: "json", label: "JSON", content: <JsonPreview values={outputs.values} preview={outputs.preview} /> },
                { id: "csv", label: "CSV", content: <CsvPreview values={outputs.values} preview={outputs.preview} /> },
                {
                  id: "edit",
                  label: "Edit values",
                  content: (
                    <ResultsFieldEditor
                      taskId={doc.review_task_id!}
                      checks={outputs.checks}
                      locked={outputs.locked}
                      onSaved={async () => {
                        await load();
                        toast.show("Saved. The previews now use the corrected value.", "success");
                      }}
                    />
                  ),
                },
              ]}
            />
            <DownloadButtons documentId={doc.id} locked={outputs.locked} fileStem={stem} />
          </div>
        )}
      </Card>
      {outputs?.locked ? (
        <PaymentSummary
          description={`DocFlow results for ${doc.file_name}`}
          amount={500}
          onPay={async () => {
            try {
              const { order } = await docflow.checkout(doc.id);
              setDoc({ ...doc, order_id: order.id });
              go("checkout");
            } catch (e) {
              if (e instanceof ApiError && e.problem.code === "already_paid") go("success");
              else toast.show(problemMessage(e), "danger");
            }
          }}
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Checkout and success

function CheckoutScreen({ orderId, onPaid, onCancel }: { orderId: string; onPaid: (orderId: string) => void; onCancel: () => void }) {
  const payment = usePaymentClient();
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    void payment.getOrder(orderId).then((r) => setOrder(r.order));
  }, [payment, orderId]);
  return (
    <>
      <h2 tabIndex={-1} className="ui-visually-hidden">
        Pay
      </h2>
      {order ? <StripeCheckoutStandIn order={order} onPaid={() => onPaid(order.id)} onCancel={onCancel} /> : <p className="ui-hint">Opening checkout…</p>}
    </>
  );
}

function SuccessScreen({ doc, setDoc, go }: ScreenProps) {
  const docflow = useDocflow();
  const [paidDoc, setPaidDoc] = useState<DocflowDocument | null>(doc.status === "paid" ? doc : null);

  async function waitForDocflow() {
    for (let i = 0; i < 20; i++) {
      const { document } = await docflow.get(doc.id);
      if (document.status === "paid") {
        setPaidDoc(document);
        setDoc(document);
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return (
    <Card title={<span tabIndex={-1}>{paidDoc ? "Payment confirmed" : "Thanks! Confirming your payment"}</span>} subtitle={`${formatAmount(500)} · ${doc.file_name}`}>
      <div className="df-stack">
        <OrderStatus orderId={doc.order_id!} onPaid={() => void waitForDocflow()} />
        {paidDoc ? (
          <>
            <DownloadButtons documentId={doc.id} locked={false} fileStem={doc.file_name.replace(/\.[^.]+$/, "")} />
            {paidDoc.message_id ? <MessageStatus messageId={paidDoc.message_id} /> : null}
            <div className="df-row">
              <Button variant="secondary" onClick={() => go("results")}>
                See or correct the results
              </Button>
              <Button variant="ghost" onClick={() => go("documents")}>
                My documents
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
