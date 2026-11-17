# Upload service — UI components

> **Version 1 · Files to AWS S3.** Status: designed, not built. Stories: `MVP1-E2-01`, `MVP1-E2-02`, `MVP1-E2-03`, `MVP1-E2-04`, `MVP1-E2-05`.

What the Upload service ships for apps to use, as the package `packages/ui-upload`. Designed, not built.

## Rules

- Components call only the Upload API, plus the storage link that API hands out. They never call another service.
- An app can supply its own `create` and `complete` functions to wrap Upload in its own process (DocFlow does, to record the document as well). The components still know nothing about the app.
- They ship as the package `packages/ui-upload` and work in any app.
- Each component works on its own, given its inputs and a signed-in person. It may depend on Identity's login component and on nothing else from another service (Nikhil's decision on #36). Pages place components side by side and pass values between them.
- No tokens in browser JavaScript: requests carry the HttpOnly session cookie and the gateway does the rest. Upload and download links are short-lived and fixed to one file.
- Every action works without dragging: a phone uses the file picker or the camera.
- Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a way to retry.
- Keyboard reachable, visible focus, labelled controls, progress announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.

## UploadArea

*Component.* Where a person drops or picks a file; it checks the file, uploads it with progress, and reports the result.

| Input | Type | Meaning |
|---|---|---|
| `accept` | {mimes, maxBytes, maxPages}, optional | Limits to check in the browser and send to Upload. Default: the service's limits. |
| `create, complete` | functions, optional | Override the calls that create and confirm the file, for an app that wraps Upload. Default: Upload's own endpoints. |
| `onUploaded` | (file) => void | Called with the ready file. The app decides what happens next. |
| `camera` | boolean, optional | Show a Take photo button on phones. Default true. |

**States:** Idle: 'Drop a file here, or choose one', with Choose file and, on phones, Take photo; Dragging over: the area is highlighted; Refused in the browser: the reason (wrong type, too large) and the area stays ready; Uploading: the file name and an UploadProgress bar; Checking: 'Checking your file…'; Uploaded: 'Uploaded', then `onUploaded` is called; Rejected: the reason in plain words and Choose another file; Failed: the message for the error and Retry; Disabled: while the app does not allow another upload.

**Calls:** `POST /files`, the storage link (PUT), `POST /files/{fileId}/complete`.

## useUpload()

*Hook.* The upload steps without any visuals, for an app that wants its own design: create, send with progress, confirm, and retry with a fresh link when one has expired.

| Input | Type | Meaning |
|---|---|---|
| `accept` | {mimes, maxBytes, maxPages}, optional | As for UploadArea. |
| `create, complete` | functions, optional | As for UploadArea. |

**States:** `idle`; `uploading` with `progress` from 0 to 100; `checking`; `ready` with the file; `rejected` with the reason; `failed` with the error code.

**Calls:** `POST /files`, the storage link (PUT), `POST /files/{fileId}/complete`.

## UploadProgress

*Component.* A progress bar with the file name, the percentage, and Retry or Cancel.

| Input | Type | Meaning |
|---|---|---|
| `progress` | number 0 to 100 | How far the upload is. |
| `fileName` | string | Shown above the bar. |
| `onRetry, onCancel` | functions, optional | Shown as buttons when given. |

**States:** In progress (announced to screen readers every 25%); Complete; Stopped, with Retry.

**Calls:** None: it shows what useUpload reports..

## FileList

*Component.* The signed-in person's files, newest first, with type, size, date and status, and actions to open or delete each.

| Input | Type | Meaning |
|---|---|---|
| `status` | string, optional | Show only files with this status. |
| `pageSize` | number, optional | How many to load at a time. Default 20. |

**States:** Loading: placeholder rows of the same height; Empty: 'No files yet.' and, if the app provides one, an upload button; Loaded, with Load more when there is a next page; Failed: 'Couldn't load your files.' and Retry.

**Calls:** `GET /files`.

## OpenFileButton

*Component.* Opens a stored file in a new tab, or downloads it.

| Input | Type | Meaning |
|---|---|---|
| `fileId` | string | The file. |
| `download` | boolean, optional | Download instead of opening. Default false. |

**States:** Default; Working: disabled while the link is fetched; Failed: the message (still uploading, expired, not found) next to the button.

**Calls:** `GET /files/{fileId}/download-url`.

## FilePreview

*Component.* Shows a stored PDF page by page, or an image, inside the page, so a person can read the document beside other information. New: decided on #36, for the extraction page (`MVP1-E3-04`) and any other app.

| Input | Type | Meaning |
|---|---|---|
| `fileId` | string | The file. |
| `page` | number, optional | The page to show; changing it scrolls to that page. Default 1. |
| `onPageChange` | (page) => void, optional | Called when the person moves to another page. |
| `highlight` | string, optional | Text to mark on the shown page, for example a field's source quote. Ignored if not found. |

**States:** Loading: a placeholder of the document's shape; Shown: one page at a time with page number, previous and next, and zoom; an image fits the width; Link expired: fetches a new 5-minute link without a reload; Not available: 'This document is no longer available' when the file was deleted or expired after 30 days; Failed: the message and Retry.

**Calls:** `GET /files/{fileId}/download-url?disposition=inline`.

## DeleteFileButton

*Component.* Deletes a file after the person confirms.

| Input | Type | Meaning |
|---|---|---|
| `fileId` | string | The file. |
| `onDeleted` | () => void, optional | Called after the file is deleted, for example to refresh a list. |

**States:** Default; Confirming: 'Delete this file? This can't be undone.'; Working: disabled; Failed: the message and Retry.

**Calls:** `DELETE /files/{fileId}`.
