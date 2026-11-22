"use client";

// @01scale/ui-extraction: LLM Extraction's components (docs/services/extraction/UI-COMPONENTS.md).
// They work for any schema: labels come from field names. Confidence is shown by colour and by
// words and numbers together, never colour alone.

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Skeleton, createClientContext, labelFromName, problemMessage } from "@01scale/ui-core";

// ---- Types, as the Extraction API returns them

export type StepName = "fetching_file" | "reading_text" | "reading_document" | "checking_rules" | "saving";
export const STEP_NAMES: readonly StepName[] = ["fetching_file", "reading_text", "reading_document", "checking_rules", "saving"];
export type Step = { name: StepName; state: "waiting" | "running" | "done" | "failed" };
export type Job = {
  id: string;
  file_id: string;
  schema: string;
  status: "queued" | "processing" | "extracted" | "failed";
  steps: Step[];
  fields_total: number;
  fields_flagged: number;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean;
};
export type ExtractedField = {
  id: string;
  name: string;
  line_index: number | null;
  value: string | null;
  confidence: number;
  source_page: number | null;
  source_quote: string | null;
  flagged: boolean;
  flag_reasons: string[];
};

export type ExtractionClient = {
  /** POST /jobs: starts a job for a ready file (or returns the one already running). */
  createJob?: (fileId: string, schema: string) => Promise<{ job: Job }>;
  /** GET /jobs/{jobId} */
  getJob: (jobId: string) => Promise<{ job: Job }>;
  /** GET /jobs/{jobId}/fields */
  getFields: (jobId: string, flagged?: boolean) => Promise<{ data: ExtractedField[] }>;
};

const { Provider, useClient } = createClientContext<ExtractionClient>("Extraction");
export const ExtractionClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useExtractionClient = useClient;

export type ExtractionJobState =
  | { status: "starting"; job: null }
  | { status: "queued" | "processing" | "extracted"; job: Job; step: StepName | null }
  | { status: "failed"; job: Job | null; code: string; message: string; retryable: boolean };

/**
 * useExtractionJob(): starts a job for a file, or follows one already started, and reports its
 * status, for an app with its own design.
 */
export function useExtractionJob({ fileId, jobId, schema = "invoice-v1", pollMs = 2000 }: { fileId?: string; jobId?: string; schema?: string; pollMs?: number }) {
  const extraction = useClient();
  const [state, setState] = useState<ExtractionJobState>({ status: "starting", job: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function run() {
      setState({ status: "starting", job: null });
      let id = jobId;
      try {
        if (!id) {
          if (!extraction.createJob || !fileId) throw new Error("useExtractionJob needs a jobId, or a fileId and createJob().");
          id = (await extraction.createJob(fileId, schema)).job.id;
        }
        const poll = async () => {
          const { job } = await extraction.getJob(id!);
          if (!alive) return;
          if (job.status === "failed")
            setState({ status: "failed", job, code: job.error_code ?? "failed", message: job.error_message ?? "", retryable: job.retryable });
          else setState({ status: job.status, job, step: job.steps.find((s) => s.state === "running")?.name ?? null });
          if (job.status === "queued" || job.status === "processing") timer = setTimeout(poll, pollMs);
        };
        await poll();
      } catch (e) {
        if (alive) setState({ status: "failed", job: null, code: (e as { problem?: { code?: string } })?.problem?.code ?? "unknown", message: problemMessage(e), retryable: true });
      }
    }
    void run();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [extraction, fileId, jobId, schema, pollMs, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

const STEP_LABEL: Record<StepName, string> = {
  fetching_file: "Fetching the file",
  reading_text: "Reading the text",
  reading_document: "Reading the document with Claude",
  checking_rules: "Checking the rules",
  saving: "Saving the fields",
};

/** ExtractionProgress: the steps of a running job, ticking off as they finish. */
export function ExtractionProgress({
  jobId,
  onFinished,
  onRetry,
  pollMs = 2000,
}: {
  jobId: string;
  onFinished: (job: Job) => void;
  onRetry?: () => void;
  pollMs?: number;
}) {
  const extraction = useClient();
  const [job, setJob] = useState<Job | null>(null);
  const [lost, setLost] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    finished.current = false;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    async function poll() {
      // Polling pauses while the tab is hidden and stops as soon as the job ends.
      if (document.hidden) {
        timer = setTimeout(poll, pollMs);
        return;
      }
      try {
        const { job } = await extraction.getJob(jobId);
        if (!alive) return;
        setLost(false);
        setJob(job);
        if (job.status === "extracted" || job.status === "failed") {
          if (!finished.current) {
            finished.current = true;
            onFinished(job);
          }
          return;
        }
      } catch {
        setLost(true);
      }
      timer = setTimeout(poll, pollMs);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const steps = job?.steps ?? STEP_NAMES.map((name) => ({ name, state: "waiting" as const }));
  const current = steps.find((s) => s.state === "running");
  return (
    <div className="ui-stack">
      <ol className="ui-extraction-steps">
        {steps.map((step) => (
          <li key={step.name} className={`ui-extraction-step ui-extraction-step-${step.state}`}>
            <span className="ui-extraction-step-icon" aria-hidden="true">
              {step.state === "done" ? "✓" : step.state === "failed" ? "✕" : step.state === "running" ? <span className="ui-spinner" /> : "○"}
            </span>
            <span>{STEP_LABEL[step.name]}</span>
            <span className="ui-visually-hidden">: {step.state}</span>
          </li>
        ))}
      </ol>
      <p className="ui-visually-hidden" aria-live="polite">
        {job?.status === "extracted" ? "Extraction finished." : current ? `${STEP_LABEL[current.name]}…` : ""}
      </p>
      {lost ? <Alert tone="warning">Reconnecting…</Alert> : null}
      {!job || job.status === "queued" ? <p className="ui-hint">Queued: starting in a moment.</p> : null}
      {job?.status === "failed" ? (
        <Alert
          tone="danger"
          title="Extraction failed"
          actions={
            job.retryable && onRetry ? (
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            ) : null
          }
        >
          {job.error_message}
        </Alert>
      ) : null}
      {job?.status === "extracted" ? (
        <Alert tone="success" title="Fields extracted">
          {job.fields_total} fields read; {job.fields_flagged} need a person to check them.
        </Alert>
      ) : null}
    </div>
  );
}

/** ConfidenceBadge: High from 0.85, Check from 0.6, Low below; a flag icon when flagged. */
export function ConfidenceBadge({ confidence, flagged }: { confidence: number; flagged: boolean }) {
  const [tone, word] =
    confidence >= 0.85 ? (["success", "High"] as const) : confidence >= 0.6 ? (["warning", "Check"] as const) : (["danger", "Low"] as const);
  return (
    <Badge tone={tone} icon={flagged ? "⚑" : undefined} title={flagged ? "Flagged for a person to check" : undefined}>
      {word} {confidence.toFixed(2)}
      {flagged ? <span className="ui-visually-hidden">, flagged</span> : null}
    </Badge>
  );
}

/** FieldEvidence: the exact quote, its page, and why the field was flagged. */
export function FieldEvidence({ field }: { field: Pick<ExtractedField, "source_quote" | "source_page" | "flag_reasons"> }) {
  return (
    <div className="ui-extraction-evidence">
      {field.source_quote ? (
        <p>
          <span className="ui-hint">On page {field.source_page}:</span> <q>{field.source_quote}</q>
        </p>
      ) : (
        <p className="ui-hint">Not found on the document.</p>
      )}
      {field.flag_reasons.length ? (
        <ul>
          {field.flag_reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** FieldList: every field with its value, confidence and flag. */
export function FieldList({ jobId, onSelect, flaggedOnly = false }: { jobId: string; onSelect?: (field: ExtractedField) => void; flaggedOnly?: boolean }) {
  const extraction = useClient();
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setFields((await extraction.getFields(jobId, flaggedOnly)).data);
    } catch (e) {
      setError(problemMessage(e));
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, flaggedOnly]);

  if (error)
    return (
      <Alert tone="danger" title="Couldn't load the fields." actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!fields)
    return (
      <div className="ui-stack" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  return (
    <ul className="ui-extraction-fields">
      {fields.map((field) => (
        <li key={field.id} className={field.flagged ? "ui-extraction-fields-flagged" : undefined}>
          <button type="button" className="ui-extraction-row ui-focusable" onClick={() => onSelect?.(field)}>
            <span className="ui-extraction-row-name">{labelFromName(field.name, field.line_index)}</span>
            <span className="ui-extraction-row-value">{field.value ?? <em className="ui-hint">Not found on the document</em>}</span>
            <ConfidenceBadge confidence={field.confidence} flagged={field.flagged} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** NextStepButton: 'Review N flagged fields' when anything is flagged, otherwise 'Continue to results'. */
export function NextStepButton({ job, onReview, onContinue }: { job: Job | null; onReview: () => void; onContinue: () => void }) {
  if (!job || job.status !== "extracted")
    return (
      <Button disabled block>
        Continue
      </Button>
    );
  return job.fields_flagged > 0 ? (
    <Button block onClick={onReview}>
      Review {job.fields_flagged} flagged field{job.fields_flagged === 1 ? "" : "s"}
    </Button>
  ) : (
    <Button block onClick={onContinue}>
      Continue to results
    </Button>
  );
}
