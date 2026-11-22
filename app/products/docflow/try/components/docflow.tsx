"use client";

// DocFlow's own page sections (docs/services/docflow/UI-COMPONENTS.md). They belong to the app,
// not to a platform package: everything else on DocFlow's pages comes from the services' packages.

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Skeleton, labelFromName, problemMessage, useToast } from "@01scale/ui-core";
import { FieldDecision, useReviewClient, type ReviewField } from "@01scale/ui-review";
import type { CheckResult, DocflowDocument, DocStatus, InvoiceValues, Preview } from "../mock-platform";
import { buildCsv } from "../mock-platform";
import { useDocflow } from "../clients";

const STATUS: Record<DocStatus, { tone: "neutral" | "info" | "success" | "warning" | "danger"; text: string; next: string }> = {
  pending_upload: { tone: "neutral", text: "Uploading", next: "Open" },
  uploaded: { tone: "info", text: "Uploaded", next: "Open" },
  rejected: { tone: "danger", text: "Rejected", next: "Choose another file" },
  extracting: { tone: "info", text: "Extracting", next: "Watch progress" },
  extraction_failed: { tone: "danger", text: "Extraction failed", next: "Retry" },
  needs_review: { tone: "warning", text: "Needs review", next: "Review" },
  reviewed: { tone: "info", text: "Ready to pay", next: "See results" },
  paid: { tone: "success", text: "Paid", next: "Download" },
};

/** DocumentsList: my documents with status and next action; an empty state with the sample invoice. */
export function DocumentsList({ onOpen, emptyState }: { onOpen: (doc: DocflowDocument) => void; emptyState: React.ReactNode }) {
  const docflow = useDocflow();
  const [docs, setDocs] = useState<DocflowDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setDocs((await docflow.list()).data);
    } catch (e) {
      setError(problemMessage(e));
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error)
    return (
      <Alert tone="danger" actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!docs)
    return (
      <div className="df-stack" aria-busy="true">
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    );
  if (docs.length === 0) return <>{emptyState}</>;
  return (
    <ul className="df-doclist">
      {docs.map((doc) => (
        <li key={doc.id} className="df-docrow">
          <span className="df-docname">
            <span aria-hidden="true">📄</span> {doc.file_name}
            <span className="ui-hint df-docdate">{new Date(doc.created_at).toLocaleString()}</span>
          </span>
          <Badge tone={STATUS[doc.status].tone}>{STATUS[doc.status].text}</Badge>
          <Button size="sm" variant="secondary" onClick={() => onOpen(doc)}>
            {STATUS[doc.status].next}
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** What the preview leaves out before payment, in words. */
function heldBack(preview: Preview) {
  const parts = [
    preview.fields_hidden ? `${preview.fields_hidden} more field${preview.fields_hidden === 1 ? "" : "s"}` : null,
    preview.line_items_hidden ? `${preview.line_items_hidden} line item${preview.line_items_hidden === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return parts.length ? `${parts.join(" and ")} unlock after payment.` : "";
}

function LockedNote({ preview }: { preview?: Preview }) {
  if (!preview?.limited) return null;
  return (
    <p className="df-locked-note">
      <span aria-hidden="true">🔒</span> Preview: {heldBack(preview)}
    </p>
  );
}

/** JsonPreview: the JSON with syntax colours and folding; before payment, the preview fields only. */
export function JsonPreview({ values, preview }: { values: InvoiceValues; preview?: Preview }) {
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(window.matchMedia("(max-width: 640px)").matches), []);
  const data = { schema: "invoice-v1", values };
  return (
    <div className="df-stack">
      <div className="df-code" role="region" aria-label="JSON preview" tabIndex={0}>
        <JsonNode value={data} depth={0} foldDeep={phone} />
      </div>
      <LockedNote preview={preview} />
    </div>
  );
}

function JsonNode({ value, depth, foldDeep, name }: { value: unknown; depth: number; foldDeep: boolean; name?: string }) {
  const key = name !== undefined ? <span className="df-json-key">&quot;{name}&quot;</span> : null;
  if (value === null || typeof value !== "object")
    return (
      <div className="df-json-line">
        {key}
        {key ? ": " : null}
        <span className={value === null ? "df-json-null" : typeof value === "string" ? "df-json-string" : "df-json-number"}>{JSON.stringify(value)}</span>
      </div>
    );
  const isArray = Array.isArray(value);
  const entries = isArray ? (value as unknown[]).map((v, i) => [String(i), v] as const) : Object.entries(value as object);
  return (
    <details className="df-json-block" open={!(foldDeep && depth >= 2)}>
      <summary>
        {key}
        {key ? ": " : null}
        {isArray ? `[ ${entries.length} items ]` : "{ … }"}
      </summary>
      <div className="df-json-children">
        {entries.map(([k, v]) => (
          <JsonNode key={k} value={v} depth={depth + 1} foldDeep={foldDeep} name={isArray ? undefined : k} />
        ))}
      </div>
    </details>
  );
}

/** CsvPreview: the CSV as a table; before payment, the preview columns only. Wide tables scroll sideways inside their own box. */
export function CsvPreview({ values, preview }: { values: InvoiceValues; preview?: Preview }) {
  const rows = useMemo(() => {
    if (preview?.limited) {
      const keys = Object.keys(values).filter((k) => k !== "line_items");
      return [keys, keys.map((k) => (values[k] as string | null) ?? "")];
    }
    const text = buildCsv(values).replace(/^\uFEFF/, "").trim();
    return text.split("\r\n").map((line) => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.filter((c) => c !== "").map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')));
  }, [values, preview?.limited]);
  const [head, ...body] = rows;
  return (
    <div className="df-stack">
      <div className="df-tablebox" role="region" aria-label="CSV preview" tabIndex={0}>
        <table className="df-table">
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LockedNote preview={preview} />
    </div>
  );
}

/** ResultsFieldEditor: Edit beside each value, placing Review's FieldDecision for that field. */
export function ResultsFieldEditor({ taskId, checks, onSaved, locked = false }: { taskId: string; checks: CheckResult[]; onSaved: () => void; locked?: boolean }) {
  const review = useReviewClient();
  const [fields, setFields] = useState<ReviewField[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    setFields((await review.getTask(taskId)).fields);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!fields) return <Skeleton height={200} />;
  // Before payment, only the flagged fields; the ones read with high confidence unlock after payment (MVP1-E5-03 AC4).
  const shown = locked ? fields.filter((f) => f.flagged) : fields;
  const hidden = fields.length - shown.length;
  const failedFields = new Set(checks.filter((c) => !c.passed).flatMap((c) => c.fields));
  const key = (f: ReviewField) => (f.line_index === null ? f.name : `line_items[${f.line_index}].${f.name}`);
  return (
    <div className="df-stack">
    <ul className="df-fieldlist">
      {shown.map((field) =>
        editing === field.id ? (
          <li key={field.id}>
            <FieldDecision
              taskId={taskId}
              field={field}
              compact
              startEditing
              onDecided={async () => {
                setEditing(null);
                await load();
                onSaved();
              }}
            />
          </li>
        ) : (
          <li key={field.id} className={failedFields.has(key(field)) ? "df-flagged" : undefined}>
            <div className="df-fieldrow">
              <span className="df-fieldname">{labelFromName(field.name, field.line_index)}</span>
              <span className="df-fieldvalue">
                {field.value ?? <em className="ui-hint">empty</em>}
                {field.status === "edited" ? <Badge tone="info"> Edited</Badge> : null}
                {failedFields.has(key(field)) ? <Badge tone="warning" icon="!">Check failed</Badge> : null}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(field.id)} aria-label={`Edit ${labelFromName(field.name, field.line_index)}`}>
                Edit
              </Button>
            </div>
          </li>
        ),
      )}
    </ul>
    {hidden ? (
      <p className="df-locked-note">
        <span aria-hidden="true">🔒</span> {hidden} more field{hidden === 1 ? " was" : "s were"} read with high confidence. They unlock after payment.
      </p>
    ) : null}
    </div>
  );
}

/** DownloadButtons: Download JSON and Download CSV; 'Pay to download' while locked. */
export function DownloadButtons({ documentId, locked, fileStem }: { documentId: string; locked: boolean; fileStem: string }) {
  const docflow = useDocflow();
  const toast = useToast();
  const [working, setWorking] = useState<"json" | "csv" | null>(null);

  async function download(format: "json" | "csv") {
    setWorking(format);
    try {
      const content = await docflow.download(documentId, format);
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileStem}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.show(`Downloaded ${fileStem}.${format}`, "success");
    } catch (e) {
      toast.show(problemMessage(e), "danger");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="df-row">
      {(["json", "csv"] as const).map((format) => (
        <Button key={format} variant={locked ? "secondary" : "primary"} loading={working === format} onClick={() => download(format)} aria-describedby={locked ? "df-locked-note" : undefined}>
          {locked ? <span aria-hidden="true">🔒</span> : <span aria-hidden="true">⇩</span>} Download {format.toUpperCase()}
        </Button>
      ))}
      {locked ? (
        <span id="df-locked-note" className="ui-hint">
          Pay to download.
        </span>
      ) : null}
    </div>
  );
}

