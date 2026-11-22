"use client";

// @01scale/ui-review: Human Review's components (docs/services/review/UI-COMPONENTS.md). They work
// for any set of fields: labels come from field names, checks from field types. Evidence is always
// beside the value it supports. Re-checking values against document rules is the app's step.

import { useEffect, useState } from "react";
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

export type ReviewClient = {
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
