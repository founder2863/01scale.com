"use client";

// @01scale/ui-upload: Upload's components (docs/services/upload/UI-COMPONENTS.md). The app supplies
// its own create and complete functions to wrap Upload in its own process; the components still
// know nothing about the app.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Dialog, ProgressBar, Skeleton, createClientContext, problemMessage } from "@01scale/ui-core";

/** A file, as the Upload API returns it. */
export type UploadFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  status: "pending_upload" | "ready" | "rejected" | "deleted";
  created_at?: string;
  rejection_detail?: string | null;
};

export type UploadClient = {
  /** POST /files: creates the file and returns its short-lived upload link. */
  createFile?: (file: { name: string; mime: string; size: number }) => Promise<{ file: UploadFile }>;
  /** PUT to the short-lived storage link the create step returned. */
  putToStorage: (fileId: string) => Promise<unknown>;
  /** POST /files/{fileId}/complete: Upload checks what arrived. */
  completeFile?: (fileId: string) => Promise<{ file: UploadFile }>;
  /** GET /files */
  listFiles?: (opts: { cursor?: string | null; status?: string; limit: number }) => Promise<{ data: UploadFile[]; next_cursor: string | null }>;
  /** GET /files/{fileId}/download-url */
  getDownloadUrl?: (fileId: string, download: boolean) => Promise<{ url: string; expires_at: string }>;
  /** DELETE /files/{fileId} */
  deleteFile?: (fileId: string) => Promise<unknown>;
};

function need<T>(fn: T | undefined, name: string): T {
  if (!fn) throw new Error(`The Upload client given to this component has no ${name}().`);
  return fn;
}

const { Provider, useClient } = createClientContext<UploadClient>("Upload");
export const UploadClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useUploadClient = useClient;

export const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

/** A file picked in the browser. `objectUrl` previews it locally; nothing is read by this package. */
export type PickedFile = { name: string; mime: string; size: number; objectUrl: string | null; sample?: boolean };

export type UploadState =
  | { status: "idle" }
  | { status: "uploading"; file: PickedFile; progress: number }
  | { status: "checking"; file: PickedFile; progress: number }
  | { status: "ready"; file: PickedFile; reference: string }
  | { status: "rejected"; file: PickedFile; reason: string }
  | { status: "failed"; file: PickedFile; code: string; reason: string };

type CreateFn = (file: PickedFile) => Promise<{ fileId: string; reference: string }>;
type CompleteFn = (reference: string) => Promise<void>;

/**
 * useUpload(): the upload steps without any visuals: create, send with progress, confirm.
 * An app can supply its own create and complete to wrap Upload in its own process.
 */
export function useUpload({ create, complete }: { create?: CreateFn; complete?: CompleteFn } = {}) {
  const upload = useClient();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  const start = useCallback(
    async (file: PickedFile) => {
      setState({ status: "uploading", file, progress: 5 });
      try {
        const created = create
          ? await create(file)
          : await need(upload.createFile, "createFile")({ name: file.name, mime: file.mime, size: file.size }).then(({ file: f }) => ({ fileId: f.id, reference: f.id }));
        setState({ status: "uploading", file, progress: 40 });
        await upload.putToStorage(created.fileId);
        setState({ status: "checking", file, progress: 85 });
        if (complete) await complete(created.reference);
        else await need(upload.completeFile, "completeFile")(created.fileId);
        setState({ status: "ready", file, reference: created.reference });
        return created.reference;
      } catch (error) {
        const code = (error as { problem?: { code?: string } })?.problem?.code ?? "unknown";
        const reason = problemMessage(error);
        const rejected = ["unsupported_file_type", "file_too_large", "too_many_pages", "validation_failed", "file_rejected"].includes(code);
        setState(rejected ? { status: "rejected", file, reason } : { status: "failed", file, code, reason });
        return null;
      }
    },
    [upload, create, complete],
  );

  return { state, start, reset: () => setState({ status: "idle" }) };
}

/** UploadArea: drop or pick a file, upload it with progress, report the result. Works without dragging. */
export function UploadArea({
  create,
  complete,
  onUploaded,
  sample,
  accept = "application/pdf,image/png,image/jpeg",
  limits = "PDF, PNG or JPEG · up to 10 MB and 10 pages",
  title = "Drop a file here, or choose one",
  footnote,
}: {
  create?: CreateFn;
  complete?: CompleteFn;
  onUploaded: (reference: string, file: PickedFile) => void;
  /** An optional sample file the person can try instead of their own. */
  sample?: { label: string; file: PickedFile };
  accept?: string;
  limits?: string;
  title?: string;
  footnote?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { state, start } = useUpload({ create, complete });
  const [dragging, setDragging] = useState(false);

  async function begin(file: PickedFile) {
    const reference = await start(file);
    if (reference) onUploaded(reference, file);
  }

  function pick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    const objectUrl = /^(image\/(png|jpeg)|application\/pdf)$/.test(file.type) ? URL.createObjectURL(file) : null;
    void begin({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, objectUrl });
  }

  if (state.status === "uploading" || state.status === "checking" || state.status === "ready")
    return <UploadProgress name={state.file.name} percent={state.status === "ready" ? 100 : state.progress} />;

  return (
    <div className="ui-stack">
      {state.status === "rejected" || state.status === "failed" ? (
        <Alert
          tone="danger"
          title={state.status === "rejected" ? `${state.file.name} can't be used` : `${state.file.name} didn't upload`}
          actions={
            <Button size="sm" variant="secondary" onClick={() => (state.status === "failed" ? void begin(state.file) : input.current?.click())}>
              {state.status === "failed" ? "Retry" : "Choose another file"}
            </Button>
          }
        >
          {state.reason}
        </Alert>
      ) : null}
      <div
        className={`ui-upload-dropzone${dragging ? " ui-upload-dropzone-active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
      >
        <span className="ui-upload-dropzone-icon" aria-hidden="true">
          ⇪
        </span>
        <p className="ui-upload-dropzone-title">{title}</p>
        <p className="ui-hint">{limits}</p>
        <div className="ui-inline ui-inline-center">
          {sample ? <Button onClick={() => void begin(sample.file)}>{sample.label}</Button> : null}
          <Button variant="secondary" onClick={() => input.current?.click()}>
            Choose a file
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          className="ui-visually-hidden"
          accept={accept}
          aria-label="Choose a file"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {footnote ? <p className="ui-hint">{footnote}</p> : null}
    </div>
  );
}

/** UploadProgress: the file's name and how far its upload has gone, announced to screen readers. */
export function UploadProgress({ name, percent }: { name: string; percent: number }) {
  return (
    <div className="ui-stack" aria-live="polite">
      <p style={{ margin: 0 }}>
        <strong>{name}</strong>
      </p>
      <ProgressBar value={percent} label={percent < 100 ? "Uploading and checking the file" : "Uploaded"} />
    </div>
  );
}

/** FilePreview: images and PDFs inline. `fallback` is shown when there is no local preview. */
export function FilePreview({ file, fallback }: { file: PickedFile; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [file.objectUrl]);
  if (!file.objectUrl) return <>{fallback ?? <Alert tone="info">No preview for {file.name}.</Alert>}</>;
  if (failed) return <Alert tone="warning">This file can&apos;t be shown here. It is stored and can still be read.</Alert>;
  return file.mime === "application/pdf" ? (
    <object className="ui-upload-preview" data={file.objectUrl} type="application/pdf" aria-label={`Preview of ${file.name}`}>
      <Alert tone="info">Your browser can&apos;t show PDFs inline. The file is stored and can still be read.</Alert>
    </object>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="ui-upload-preview" src={file.objectUrl} alt={`Preview of ${file.name}`} onError={() => setFailed(true)} />
  );
}

/** OpenFileButton: opens a stored file in a new tab, or downloads it, through a short-lived link. */
export function OpenFileButton({ fileId, download = false, onOpen }: { fileId: string; download?: boolean; onOpen?: (url: string) => void }) {
  const upload = useClient();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="ui-inline">
      <Button
        size="sm"
        variant="secondary"
        loading={working}
        onClick={async () => {
          setWorking(true);
          setError(null);
          try {
            const { url } = await need(upload.getDownloadUrl, "getDownloadUrl")(fileId, download);
            if (onOpen) onOpen(url);
            else window.open(url, "_blank", "noopener");
          } catch (e) {
            setError(problemMessage(e));
          } finally {
            setWorking(false);
          }
        }}
      >
        {download ? "Download" : "Open"}
      </Button>
      {error ? (
        <span className="ui-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}

/** DeleteFileButton: deletes a file after the person confirms. */
export function DeleteFileButton({ fileId, onDeleted }: { fileId: string; onDeleted?: () => void }) {
  const upload = useClient();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setWorking(true);
    setError(null);
    try {
      await need(upload.deleteFile, "deleteFile")(fileId);
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <Dialog
        open={open}
        onClose={() => !working && setOpen(false)}
        title="Delete this file?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button variant="danger" loading={working} onClick={remove}>
              {error ? "Retry" : "Delete"}
            </Button>
          </>
        }
      >
        <div className="ui-stack">
          <p style={{ margin: 0 }}>This can&apos;t be undone.</p>
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      </Dialog>
    </>
  );
}

const FILE_STATUS: Record<UploadFile["status"], { tone: "success" | "info" | "danger" | "neutral"; text: string }> = {
  ready: { tone: "success", text: "Ready" },
  pending_upload: { tone: "info", text: "Uploading" },
  rejected: { tone: "danger", text: "Rejected" },
  deleted: { tone: "neutral", text: "Deleted" },
};

/** FileList: the signed-in person's files, newest first, with open and delete. */
export function FileList({ status, pageSize = 20, emptyAction }: { status?: string; pageSize?: number; emptyAction?: ReactNode }) {
  const upload = useClient();
  const [files, setFiles] = useState<UploadFile[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(
    async (from: string | null) => {
      setError(null);
      if (from) setMore(true);
      try {
        const page = await need(upload.listFiles, "listFiles")({ cursor: from, status, limit: pageSize });
        setFiles((all) => (from && all ? [...all, ...page.data] : page.data));
        setCursor(page.next_cursor);
      } catch (e) {
        setError(problemMessage(e));
      } finally {
        setMore(false);
      }
    },
    [upload, status, pageSize],
  );
  useEffect(() => {
    void load(null);
  }, [load]);

  if (error && !files)
    return (
      <Alert tone="danger" title="Couldn't load your files." actions={<Button size="sm" variant="secondary" onClick={() => load(null)}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!files)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={52} />
        <Skeleton height={52} />
        <Skeleton height={52} />
      </div>
    );
  if (files.length === 0)
    return (
      <div className="ui-stack">
        <p style={{ margin: 0 }}>No files yet.</p>
        {emptyAction}
      </div>
    );
  return (
    <div className="ui-stack">
      <ul className="ui-upload-files">
        {files.map((file) => (
          <li key={file.id} className="ui-upload-file">
            <span className="ui-upload-file-name">
              {file.name}
              <span className="ui-hint">
                {file.mime.split("/")[1]?.toUpperCase()} · {formatBytes(file.size)}
                {file.created_at ? ` · ${new Date(file.created_at).toLocaleDateString()}` : ""}
              </span>
            </span>
            <Badge tone={FILE_STATUS[file.status].tone}>{FILE_STATUS[file.status].text}</Badge>
            <span className="ui-inline">
              {file.status === "ready" ? <OpenFileButton fileId={file.id} /> : null}
              <DeleteFileButton fileId={file.id} onDeleted={() => setFiles((all) => all?.filter((f) => f.id !== file.id) ?? null)} />
            </span>
          </li>
        ))}
      </ul>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {cursor ? (
        <div>
          <Button variant="secondary" size="sm" loading={more} onClick={() => load(cursor)}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
