# @01scale/ui-upload changelog

## 0.2.0 — 22 Nov 2026 (MVP1-E0-19 AC5)

- New: useUpload() (UploadArea now runs on it), FileList, OpenFileButton and DeleteFileButton. The client adds createFile, completeFile, listFiles, getDownloadUrl and deleteFile; UploadArea's create and complete are now optional.
- Every component is shown live, in each of its states, on its module's UI Components section.

## 0.1.0 — 22 Nov 2026

- First components, as designed in `docs/services/upload/UI-COMPONENTS.md`, built on `@01scale/ui-core` 0.1.0. First used by the DocFlow V1 clickable prototype; the Upload service itself is not built yet, so the app supplies a mock client.
