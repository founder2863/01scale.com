"use client";

// LLM Extraction's components (docs/services/extraction/UI-COMPONENTS.md). Confidence is shown by
// colour and by words and numbers together, never colour alone.

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Skeleton } from "@01scale/ui-core";
import type { ExtractedField, Job, StepName } from "../mock-platform";
import { fieldLabel } from "../sample-invoice";
import { messageFor, useService } from "./platform-context";

const STEP_LABEL: Record<StepName, string> = {
  fetching_file: "Fetching the file",
  reading_text: "Reading the text",
  reading_document: "Reading the invoice with Claude",
  checking_rules: "Checking the invoice's rules",
  saving: "Saving the fields",
};

/** ExtractionProgress: the steps of a running job, ticking off as they finish. Polls every 2 s (here 0.5 s). */
export function ExtractionProgress({
  jobId,
  onFinished,
  onRetry,
}: {
  jobId: string;
  onFinished: (job: Job) => void;
  onRetry?: () => void;
}) {
  const extraction = useService("extraction");
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
        timer = setTimeout(poll, 500);
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
      timer = setTimeout(poll, 500);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const steps = job?.steps ?? (Object.keys(STEP_LABEL) as StepName[]).map((name) => ({ name, state: "waiting" as const }));
  const current = steps.find((s) => s.state === "running");
  return (
    <div className="df-stack">
      <ol className="df-steps">
        {steps.map((step) => (
          <li key={step.name} className={`df-step df-step-${step.state}`}>
            <span className="df-step-icon" aria-hidden="true">
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
      {job?.status === "queued" || !job ? <p className="ui-hint">Queued: starting in a moment.</p> : null}
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
  const [tone, word] = confidence >= 0.85 ? (["success", "High"] as const) : confidence >= 0.6 ? (["warning", "Check"] as const) : (["danger", "Low"] as const);
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
    <div className="df-evidence">
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

/** FieldList: header fields, then line items, each with value, confidence and flag. */
export function FieldList({ jobId, onSelect, flaggedOnly = false }: { jobId: string; onSelect?: (field: ExtractedField) => void; flaggedOnly?: boolean }) {
  const extraction = useService("extraction");
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setFields((await extraction.getFields("browser", jobId, flaggedOnly)).data);
    } catch (e) {
      setError(messageFor(e));
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
      <div className="df-stack" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    );
  return (
    <ul className="df-fieldlist">
      {fields.map((field) => (
        <li key={field.id} className={field.flagged ? "df-flagged" : undefined}>
          <button type="button" className="df-fieldrow ui-focusable" onClick={() => onSelect?.(field)}>
            <span className="df-fieldname">{fieldLabel(field.name, field.line_index)}</span>
            <span className="df-fieldvalue">{field.value ?? <em className="ui-hint">Not found on the document</em>}</span>
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
