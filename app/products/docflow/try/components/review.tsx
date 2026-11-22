"use client";

// Human Review's components (docs/services/review/UI-COMPONENTS.md). Evidence is always beside the
// value it supports; on phones every action is a button at least 44 pixels tall.

import { useEffect, useState } from "react";
import { Alert, Badge, Button, Checkbox, Input, ProgressBar, Skeleton } from "@01scale/ui-core";
import type { ReviewField, Task } from "../mock-platform";
import { formatHint, validateValue } from "../mock-platform";
import { fieldLabel } from "../sample-invoice";
import { ConfidenceBadge, FieldEvidence } from "./extraction";
import { messageFor, useService } from "./platform-context";

/** ResolvedCounter: 'N of M resolved', with a bar. */
export function ResolvedCounter({ resolved, total }: { resolved: number; total: number }) {
  return <ProgressBar value={resolved} max={total} label={resolved === total ? "All checked" : "Flagged fields checked"} valueText={`${resolved} of ${total} resolved`} />;
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
  onFocusEvidence?: (quote: string | null) => void;
  startEditing?: boolean;
  compact?: boolean;
}) {
  const review = useService("review");
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(field.value ?? "");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = touched ? validateValue(field.type, draft) : null;
  const label = fieldLabel(field.name, field.line_index);

  async function decide(action: "accept" | "edit" | "not_present") {
    if (action === "edit") {
      setTouched(true);
      if (validateValue(field.type, draft)) return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await review.decide(taskId, field.id, action, draft);
      setEditing(false);
      onDecided(result.field as ReviewField);
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setSaving(false);
    }
  }

  const badge = STATUS_BADGE[field.status];
  return (
    <div className={`df-decision${field.status === "pending" ? " df-decision-pending" : ""}`} onFocus={() => onFocusEvidence?.(field.source_quote)} onMouseEnter={() => onFocusEvidence?.(field.source_quote)}>
      <div className="df-decision-head">
        <strong>{label}</strong>
        <span className="df-row">
          {!compact ? <ConfidenceBadge confidence={field.confidence} flagged={field.flagged} /> : null}
          <Badge tone={badge.tone}>{badge.text}</Badge>
        </span>
      </div>
      {editing ? (
        <form
          className="df-stack"
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
          <div className="df-row">
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
          <p className="df-decision-value">
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
          {!compact ? <FieldEvidence field={field} /> : null}
          <div className="df-row">
            <Button size="sm" variant={field.status === "accepted" ? "secondary" : "primary"} loading={saving} disabled={!field.value && !field.original_value} onClick={() => decide("accept")}>
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

/** ReviewQueue: the task's fields, flagged first, each with its decision, and the counter. */
export function ReviewQueue({
  taskId,
  onChanged,
  onFocusEvidence,
}: {
  taskId: string;
  onChanged?: (task: Task, fields: ReviewField[]) => void;
  onFocusEvidence?: (quote: string | null) => void;
}) {
  const review = useService("review");
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
      setError(messageFor(e));
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
      <div className="df-stack" aria-busy="true">
        <Skeleton height={20} />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </div>
    );

  const flagged = data.fields.filter((f) => f.flagged);
  const rest = data.fields.filter((f) => !f.flagged);
  return (
    <div className="df-stack">
      <ResolvedCounter resolved={data.task.resolved} total={data.task.total_flagged} />
      {data.task.resolved === data.task.total_flagged ? <Alert tone="success">All checked. Complete the review when you&apos;re ready.</Alert> : null}
      {flagged.map((field) => (
        <FieldDecision key={field.id} taskId={taskId} field={field} onDecided={load} onFocusEvidence={onFocusEvidence} />
      ))}
      <Checkbox label={`Show all fields (${rest.length} more, already accepted)`} checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
      {showAll ? rest.map((field) => <FieldDecision key={field.id} taskId={taskId} field={field} onDecided={load} onFocusEvidence={onFocusEvidence} compact />) : null}
    </div>
  );
}

/** CompleteReviewButton: disabled until every flagged field is decided. The app can supply its own complete step. */
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
      {!task ? "Complete review" : left > 0 ? `${left} field${left === 1 ? "" : "s"} left` : "Complete review"}
    </Button>
  );
}
