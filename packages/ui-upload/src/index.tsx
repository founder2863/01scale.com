"use client";

// @01scale/ui-upload: Upload's components (docs/services/upload/UI-COMPONENTS.md). The app supplies
// its own create and complete functions to wrap Upload in its own process; the components still
// know nothing about the app.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, ProgressBar, createClientContext, problemMessage } from "@01scale/ui-core";

export type UploadClient = {
  /** PUT to the short-lived storage link the create step returned. */
  putToStorage: (fileId: string) => Promise<unknown>;
};

const { Provider, useClient } = createClientContext<UploadClient>("Upload");
export const UploadClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useUploadClient = useClient;

/** A file picked in the browser. `objectUrl` previews it locally; nothing is read by this package. */
export type PickedFile = { name: string; mime: string; size: number; objectUrl: string | null; sample?: boolean };

type State = { kind: "idle" } | { kind: "uploading"; file: PickedFile; percent: number } | { kind: "rejected"; file: PickedFile; message: string };

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
  create: (file: PickedFile) => Promise<{ fileId: string; reference: string }>;
  complete: (reference: string) => Promise<void>;
  onUploaded: (reference: string, file: PickedFile) => void;
  /** An optional sample file the person can try instead of their own. */
  sample?: { label: string; file: PickedFile };
  accept?: string;
  limits?: string;
  title?: string;
  footnote?: ReactNode;
}) {
  const upload = useClient();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function start(file: PickedFile) {
    setState({ kind: "uploading", file, percent: 5 });
    try {
      const { fileId, reference } = await create(file);
      setState({ kind: "uploading", file, percent: 40 });
      await upload.putToStorage(fileId);
      setState({ kind: "uploading", file, percent: 85 });
      await complete(reference);
      setState({ kind: "uploading", file, percent: 100 });
      onUploaded(reference, file);
    } catch (error) {
      setState({ kind: "rejected", file, message: problemMessage(error) });
    }
  }

  function pick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    const objectUrl = /^(image\/(png|jpeg)|application\/pdf)$/.test(file.type) ? URL.createObjectURL(file) : null;
    void start({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, objectUrl });
  }

  if (state.kind === "uploading") return <UploadProgress name={state.file.name} percent={state.percent} />;

  return (
    <div className="ui-stack">
      {state.kind === "rejected" ? (
        <Alert
          tone="danger"
          title={`${state.file.name} can't be used`}
          actions={
            <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
              Choose another file
            </Button>
          }
        >
          {state.message}
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
          {sample ? <Button onClick={() => void start(sample.file)}>{sample.label}</Button> : null}
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
