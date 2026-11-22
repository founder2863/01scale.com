"use client";

// @01scale/ui-review: Human Review's components (docs/services/review/UI-COMPONENTS.md). They work
// for any set of fields: labels come from field names, checks from field types. Evidence is always
// beside the value it supports. Re-checking values against document rules is the app's step.

import { useCallback, useEffect, useState } from "react";
import { Alert, Badge, Button, Checkbox, Input, ProgressBar, Skeleton, createClientContext, labelFromName, problemMessage } from "@01scale/ui-core";

// ---- Types, as the Review API returns them

export type FieldType = "text" | "date" | "money" | "number" | "currency";
export type ReviewField = {
  id: string;
  name: string;
  line_index: number | null;
  type: FieldType;
  original_value: string | null;
  value: string | null;
  confidence: number;
  source_page: number | null;
  source_quote: string | null;
  flagged: boolean;
  flag_reasons: string[];
  status: "pending" | "accepted" | "edited" | "not_present";
};
export type Task = { id: string; status: "open" | "completed"; resolved: number; total_flagged: number; can_complete: boolean };
export type Decision = "accept" | "edit" | "not_present";

/** A correction offered as an eval case (GET /admin/eval-candidates). Values only, never the document. */
export type EvalCandidate = {
  id: string;
  reference: string;
  field_name: string;
  line_index: number | null;
  model_value: string | null;
  human_value: string | null;
  status: "candidate" | "approved" | "rejected";
  created_at: string;
};

/** GET /admin/accuracy: counts and rates only. */
export type AccuracyReportData = {
  since: string;
  totals: { tasks: number; fields_reviewed: number; corrected: number; correction_rate: number; corrections_flagged: number };
  fields: { name: string; reviewed: number; flagged: number; corrected: number; not_present: number; approved_mistakes: number; correction_rate: number }[];
};

export type ReviewClient = {
  /** GET /admin/eval-candidates: 404 `not_found` to anyone who is not an admin. */
  listEvalCandidates?: (opts: { status: string; cursor?: string | null }) => Promise<{ data: EvalCandidate[]; next_cursor: string | null }>;
  /** PATCH /admin/eval-candidates/{candidateId} */
  decideEvalCandidate?: (candidateId: string, status: "approved" | "rejected") => Promise<{ candidate: EvalCandidate }>;
  /** GET /admin/accuracy: 404 `not_found` to anyone who is not an admin. */
  getAccuracy?: (since: string) => Promise<AccuracyReportData>;
  /** GET /tasks/{taskId} */
  getTask: (taskId: string) => Promise<{ task: Task; fields: ReviewField[] }>;
  /** PATCH /tasks/{taskId}/fields/{fieldId} */
  decide: (taskId: string, fieldId: string, action: Decision, value?: string) => Promise<{ field: ReviewField; resolved: number; can_complete: boolean }>;
};

const { Provider, useClient } = createClientContext<ReviewClient>("Review");
export const ReviewClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useReviewClient = useClient;

// ---- Checks by field type: the same in the edit box and in the API

export function validateValue(type: FieldType, value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter a value, or choose Not on document.";
  if (type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Use the format YYYY-MM-DD, for example 2026-11-02.";
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return "That date does not exist.";
  }
  if (type === "money" && !/^-?\d+(\.\d{2})$/.test(v)) return "Use digits with two decimals, for example 380.00.";
  if (type === "number" && !/^\d+(\.\d+)?$/.test(v)) return "Use digits only, for example 4.";
  if (type === "currency" && !/^[A-Z]{3}$/.test(v)) return "Use a three-letter currency code, for example USD.";
  return null;
}

export function formatHint(type: FieldType): string | undefined {
  return { date: "YYYY-MM-DD", money: "Digits with two decimals", number: "Digits", currency: "Three letters, like USD", text: undefined }[type];
}

// ---- Components

/** ResolvedCounter: 'N of M resolved', with a bar. */
export function ResolvedCounter({ resolved, total }: { resolved: number; total: number }) {
  return (
    <ProgressBar value={resolved} max={total} label={resolved === total ? "All checked" : "Flagged fields checked"} valueText={`${resolved} of ${total} resolved`} />
  );
}

const STATUS_BADGE: Record<ReviewField["status"], { tone: "neutral" | "success" | "info" | "warning"; text: string }> = {
  pending: { tone: "warning", text: "Waiting" },
  accepted: { tone: "success", text: "Accepted" },
  edited: { tone: "info", text: "Edited" },
  not_present: { tone: "neutral", text: "Not on document" },
};

/** FieldDecision: one field with Accept, Edit and Not on document; the edit box checks as the person types. */
export function FieldDecision({
  taskId,
  field,
  onDecided,
  onFocusEvidence,
  startEditing = false,
  compact = false,
}: {
  taskId: string;
  field: ReviewField;
  onDecided: (field: ReviewField) => void;
  /** Called with the field's quote when it gets focus, so the app can highlight it on the document. */
  onFocusEvidence?: (quote: string | null) => void;
  startEditing?: boolean;
  /** Value and buttons only, for an edit beside a value elsewhere. */
  compact?: boolean;
}) {
  const review = useClient();
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(field.value ?? "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = touched ? validateValue(field.type, draft) : null;
  const label = labelFromName(field.name, field.line_index);

  async function decide(action: Decision) {
    if (action === "edit") {
      setTouched(true);
      if (validateValue(field.type, draft)) return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await review.decide(taskId, field.id, action, draft);
      setEditing(false);
      onDecided(result.field);
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const badge = STATUS_BADGE[field.status];
  return (
    <div
      className={`ui-review-decision${field.status === "pending" ? " ui-review-decision-pending" : ""}`}
      onFocus={() => onFocusEvidence?.(field.source_quote)}
      onMouseEnter={() => onFocusEvidence?.(field.source_quote)}
    >
      <div className="ui-review-decision-head">
        <strong>{label}</strong>
        <span className="ui-inline">
          {!compact ? <Badge tone={field.flagged ? "warning" : "neutral"} icon={field.flagged ? "⚑" : undefined}>Confidence {field.confidence.toFixed(2)}</Badge> : null}
          <Badge tone={badge.tone}>{badge.text}</Badge>
        </span>
      </div>
      {editing ? (
        <form
          className="ui-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void decide("edit");
          }}
        >
          <Input
            label={`New value for ${label}`}
            hideLabel
            hint={formatHint(field.type)}
            value={draft}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              setTouched(true);
            }}
            error={invalid}
          />
          <div className="ui-inline">
            <Button type="submit" size="sm" loading={saving}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="ui-review-decision-value">
            {field.status === "edited" ? (
              <>
                <del className="ui-hint">{field.original_value ?? "empty"}</del> → <strong>{field.value}</strong>
              </>
            ) : field.value ? (
              field.value
            ) : (
              <em className="ui-hint">{field.status === "not_present" ? "Not on the document" : "Not found on the document"}</em>
            )}
          </p>
          {!compact ? (
            <div className="ui-review-evidence">
              {field.source_quote ? (
                <p>
                  <span className="ui-hint">On page {field.source_page}:</span> <q>{field.source_quote}</q>
                </p>
              ) : null}
              {field.flag_reasons.length ? (
                <ul>
                  {field.flag_reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <div className="ui-inline">
            <Button
              size="sm"
              variant={field.status === "accepted" ? "secondary" : "primary"}
              loading={saving}
              disabled={!field.value && !field.original_value}
              onClick={() => decide("accept")}
            >
              Accept
            </Button>
            <Button size="sm" variant="secondary" disabled={saving} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {!compact ? (
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => decide("not_present")}>
                Not on document
              </Button>
            ) : null}
          </div>
        </>
      )}
      {error ? (
        <Alert tone="danger" actions={<Button size="sm" variant="secondary" onClick={() => setError(null)}>Retry</Button>}>
          {error}
        </Alert>
      ) : null}
    </div>
  );
}

/** ReviewQueue: the task's flagged fields with their decisions, the counter, and 'Show all fields'. */
export function ReviewQueue({
  taskId,
  onChanged,
  onFocusEvidence,
  allowShowAll = true,
}: {
  taskId: string;
  onChanged?: (task: Task, fields: ReviewField[]) => void;
  onFocusEvidence?: (quote: string | null) => void;
  /** Whether the 'Show all fields' toggle is offered. An app can hide it, for example until payment. */
  allowShowAll?: boolean;
}) {
  const review = useClient();
  const [data, setData] = useState<{ task: Task; fields: ReviewField[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setError(null);
    try {
      const next = await review.getTask(taskId);
      setData(next);
      onChanged?.(next.task, next.fields);
    } catch (e) {
      setError(problemMessage(e));
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (error)
    return (
      <Alert tone="danger" title="Couldn't load this review." actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!data)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={20} />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </div>
    );

  const flagged = data.fields.filter((f) => f.flagged);
  const rest = data.fields.filter((f) => !f.flagged);
  return (
    <div className="ui-stack">
      <ResolvedCounter resolved={data.task.resolved} total={data.task.total_flagged} />
      {data.task.resolved === data.task.total_flagged ? <Alert tone="success">All checked. Complete the review when you&apos;re ready.</Alert> : null}
      {flagged.map((field) => (
        <FieldDecision key={field.id} taskId={taskId} field={field} onDecided={load} onFocusEvidence={onFocusEvidence} />
      ))}
      {allowShowAll ? (
        <Checkbox label={`Show all fields (${rest.length} more, already accepted)`} checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
      ) : null}
      {allowShowAll && showAll
        ? rest.map((field) => <FieldDecision key={field.id} taskId={taskId} field={field} onDecided={load} onFocusEvidence={onFocusEvidence} compact />)
        : null}
    </div>
  );
}

/** CompleteReviewButton: disabled until every flagged field is decided. The app supplies the complete step. */
export function CompleteReviewButton({
  task,
  complete,
  onCompleted,
  checksOverridden = false,
}: {
  task: Task | null;
  /** Returns true when the review is complete; the app shows its own message otherwise. */
  complete: (checksOverridden: boolean) => Promise<boolean>;
  onCompleted: () => void;
  checksOverridden?: boolean;
}) {
  const [working, setWorking] = useState(false);
  const left = task ? task.total_flagged - task.resolved : 0;
  return (
    <Button
      block
      loading={working}
      disabled={!task || left > 0}
      onClick={async () => {
        setWorking(true);
        try {
          if (await complete(checksOverridden)) onCompleted();
        } finally {
          setWorking(false);
        }
      }}
    >
      {!task || left === 0 ? "Complete review" : `${left} field${left === 1 ? "" : "s"} left`}
    </Button>
  );
}

// ---- Admin (MVP1-E4-05). Inside the app only; nothing here exports or copies user data.

const isNotFound = (e: unknown) => (e as { problem?: { status?: number } })?.problem?.status === 404;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** EvalCandidatesTable: corrections with both values, to approve as real model mistakes or reject. */
export function EvalCandidatesTable({ status = "candidate" }: { status?: string }) {
  const review = useClient();
  const [rows, setRows] = useState<EvalCandidate[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const load = useCallback(
    async (from: string | null) => {
      setError(null);
      try {
        if (!review.listEvalCandidates) throw new Error("The Review client given to EvalCandidatesTable has no listEvalCandidates().");
        const page = await review.listEvalCandidates({ status, cursor: from });
        setRows((all) => (from && all ? [...all, ...page.data] : page.data));
        setCursor(page.next_cursor);
      } catch (e) {
        if (isNotFound(e)) setNotFound(true);
        else setError(problemMessage(e));
      }
    },
    [review, status],
  );
  useEffect(() => {
    void load(null);
  }, [load]);

  async function decide(row: EvalCandidate, decision: "approved" | "rejected") {
    setDeciding(row.id);
    setRowError(null);
    try {
      if (!review.decideEvalCandidate) throw new Error("No decideEvalCandidate().");
      const { candidate } = await review.decideEvalCandidate(row.id, decision);
      setRows((all) => all?.map((r) => (r.id === row.id ? candidate : r)) ?? null);
    } catch (e) {
      setRowError({ id: row.id, message: problemMessage(e) });
    } finally {
      setDeciding(null);
    }
  }

  if (notFound) return <p className="ui-hint" style={{ margin: 0 }}>Not found.</p>;
  if (error && !rows)
    return (
      <Alert tone="danger" title="Couldn't load the corrections." actions={<Button size="sm" variant="secondary" onClick={() => load(null)}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!rows)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={72} />
        <Skeleton height={72} />
      </div>
    );
  if (rows.length === 0) return <p style={{ margin: 0 }}>No corrections waiting.</p>;
  return (
    <div className="ui-stack">
      <ul className="ui-review-candidates">
        {rows.map((row) => (
          <li key={row.id} className="ui-review-candidate">
            <div className="ui-review-decision-head">
              <strong>{labelFromName(row.field_name, row.line_index)}</strong>
              <span className="ui-hint">{new Date(row.created_at).toLocaleDateString()}</span>
            </div>
            <p className="ui-review-candidate-values">
              <span>
                <span className="ui-hint">Model read</span> <del>{row.model_value ?? "nothing"}</del>
              </span>
              <span aria-hidden="true">→</span>
              <span>
                <span className="ui-hint">Person corrected to</span> <strong>{row.human_value ?? "not on document"}</strong>
              </span>
            </p>
            {row.status === "candidate" ? (
              <div className="ui-inline">
                <Button size="sm" loading={deciding === row.id} onClick={() => decide(row, "approved")}>
                  Approve as a model mistake
                </Button>
                <Button size="sm" variant="secondary" disabled={deciding === row.id} onClick={() => decide(row, "rejected")}>
                  Reject
                </Button>
              </div>
            ) : (
              <Badge tone={row.status === "approved" ? "success" : "neutral"}>{row.status === "approved" ? "Approved" : "Rejected"}</Badge>
            )}
            {rowError?.id === row.id ? <Alert tone="danger">{rowError.message}</Alert> : null}
          </li>
        ))}
      </ul>
      {cursor ? (
        <div>
          <Button size="sm" variant="secondary" onClick={() => load(cursor)}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** AccuracyReport: per field, how often people corrected it and how well flagging caught it; numbers only. */
export function AccuracyReport({ since }: { since?: string }) {
  const review = useClient();
  const from = since ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [report, setReport] = useState<AccuracyReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      if (!review.getAccuracy) throw new Error("The Review client given to AccuracyReport has no getAccuracy().");
      setReport(await review.getAccuracy(from));
    } catch (e) {
      if (isNotFound(e)) setNotFound(true);
      else setError(problemMessage(e));
    }
  }, [review, from]);
  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) return <p className="ui-hint" style={{ margin: 0 }}>Not found.</p>;
  if (error)
    return (
      <Alert tone="danger" title="Couldn't load the report." actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!report)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={64} />
        <Skeleton height={180} />
      </div>
    );
  if (report.totals.fields_reviewed === 0) return <p style={{ margin: 0 }}>No reviews since {report.since}.</p>;
  const t = report.totals;
  return (
    <div className="ui-stack">
      <dl className="ui-review-totals">
        <div>
          <dt>Reviews</dt>
          <dd>{t.tasks}</dd>
        </div>
        <div>
          <dt>Fields checked</dt>
          <dd>{t.fields_reviewed}</dd>
        </div>
        <div>
          <dt>Corrected</dt>
          <dd>
            {t.corrected} <span className="ui-hint">({pct(t.correction_rate)})</span>
          </dd>
        </div>
        <div>
          <dt>Corrections that were flagged</dt>
          <dd>{pct(t.corrections_flagged)}</dd>
        </div>
      </dl>
      <div className="ui-review-tablebox" role="region" aria-label={`Accuracy per field since ${report.since}`} tabIndex={0}>
        <table className="ui-review-table">
          <caption className="ui-visually-hidden">Per field, since {report.since}</caption>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Checked</th>
              <th scope="col">Flagged</th>
              <th scope="col">Corrected</th>
              <th scope="col">Not on document</th>
              <th scope="col">Approved mistakes</th>
              <th scope="col">Correction rate</th>
            </tr>
          </thead>
          <tbody>
            {report.fields.map((f) => (
              <tr key={f.name}>
                <th scope="row">{labelFromName(f.name)}</th>
                <td className="ui-num">{f.reviewed}</td>
                <td className="ui-num">{f.flagged}</td>
                <td className="ui-num">{f.corrected}</td>
                <td className="ui-num">{f.not_present}</td>
                <td className="ui-num">{f.approved_mistakes}</td>
                <td className="ui-num">{pct(f.correction_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ui-hint" style={{ margin: 0 }}>
        Since {report.since}. Counts and rates only: no values from anyone&apos;s documents.
      </p>
    </div>
  );
}
