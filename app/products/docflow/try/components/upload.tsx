"use client";

// Upload's components (docs/services/upload/UI-COMPONENTS.md). The app supplies its own create and
// complete functions (DocFlow records the document as well); the components know nothing about it.

import { useEffect, useRef, useState } from "react";
import { Alert, Button, ProgressBar } from "@01scale/ui-core";
import { SampleInvoice } from "../sample-invoice";
import { messageFor, useService } from "./platform-context";

export type PickedFile = { name: string; mime: string; size: number; objectUrl: string | null; isSample: boolean };

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; file: PickedFile; percent: number }
  | { kind: "rejected"; file: PickedFile; message: string };

/**
 * UploadArea: drop or pick a file, check it, upload it with progress and report the result.
 * Works without dragging: a phone uses the file picker or the camera.
 */
export function UploadArea({
  create,
  complete,
  onUploaded,
  sample,
}: {
  create: (file: PickedFile) => Promise<{ fileId: string; documentId: string }>;
  complete: (documentId: string) => Promise<void>;
  onUploaded: (documentId: string, file: PickedFile) => void;
  /** An optional sample file the person can try instead of their own. */
  sample?: PickedFile;
}) {
  const upload = useService("upload");
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);

  async function start(file: PickedFile) {
    setState({ kind: "uploading", file, percent: 5 });
    try {
      const { fileId, documentId } = await create(file);
      setState({ kind: "uploading", file, percent: 40 });
      await upload.putToStorage(fileId);
      setState({ kind: "uploading", file, percent: 85 });
      await complete(documentId);
      setState({ kind: "uploading", file, percent: 100 });
      onUploaded(documentId, file);
    } catch (error) {
      setState({ kind: "rejected", file, message: messageFor(error) });
    }
  }

  function pick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    // The file stays in this browser tab: an object URL for the preview, nothing uploaded.
    const objectUrl = /^(image\/(png|jpeg)|application\/pdf)$/.test(file.type) ? URL.createObjectURL(file) : null;
    void start({ name: file.name, mime: file.type || "application/octet-stream", size: file.size, objectUrl, isSample: false });
  }

  if (state.kind === "uploading") return <UploadProgress name={state.file.name} percent={state.percent} />;

  return (
    <div className="df-stack">
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
        className={`df-dropzone${dragging ? " df-dropzone-active" : ""}`}
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
        <span className="df-dropzone-icon" aria-hidden="true">
          ⇪
        </span>
        <p className="df-dropzone-title">Drop an invoice here, or choose a file</p>
        <p className="ui-hint">PDF, PNG or JPEG · up to 10 MB and 10 pages</p>
        <div className="df-row df-row-center">
          {sample ? <Button onClick={() => void start(sample)}>Try the sample invoice</Button> : null}
          <Button variant="secondary" onClick={() => input.current?.click()}>
            Choose a file
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          className="ui-visually-hidden"
          accept="application/pdf,image/png,image/jpeg"
          aria-label="Choose an invoice file"
          tabIndex={-1}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="ui-hint">
        Prototype: your file never leaves this browser tab. Extraction is simulated, so the fields shown afterwards are the sample invoice&apos;s.
      </p>
    </div>
  );
}

/** UploadProgress: the file's name and how far its upload has gone, announced to screen readers. */
export function UploadProgress({ name, percent }: { name: string; percent: number }) {
  return (
    <div className="df-stack" aria-live="polite">
      <p style={{ margin: 0 }}>
        <strong>{name}</strong>
      </p>
      <ProgressBar value={percent} label={percent < 100 ? "Uploading and checking the file" : "Uploaded"} />
    </div>
  );
}

/** FilePreview: the stored file on screen; images and PDFs inline. */
export function FilePreview({ file, highlight }: { file: PickedFile; highlight?: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [file.objectUrl]);
  if (file.isSample || !file.objectUrl) return <SampleInvoice highlight={highlight} />;
  if (failed) return <Alert tone="warning">This file can&apos;t be shown here. It is stored and can still be read.</Alert>;
  return file.mime === "application/pdf" ? (
    <object className="df-filepreview" data={file.objectUrl} type="application/pdf" aria-label={`Preview of ${file.name}`}>
      <Alert tone="info">Your browser can&apos;t show PDFs inline. The file is stored and can still be read.</Alert>
    </object>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="df-filepreview" src={file.objectUrl} alt={`Preview of ${file.name}`} onError={() => setFailed(true)} />
  );
}
