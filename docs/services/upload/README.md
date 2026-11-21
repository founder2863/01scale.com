# Upload service — developer guide

> **Version 1 · Files to AWS S3.** Status: designed, not built. Stories: `MVP1-E2-01`, `MVP1-E2-02`, `MVP1-E2-03`, `MVP1-E2-04`, `MVP1-E2-05`.

The other documents for this service: [user journeys](USER-JOURNEYS.md), [UI components](UI-COMPONENTS.md), [API specification](API-SPEC.md), [data model](DATA-MODEL.md), [schema](SCHEMA.md). The same content is on the site at `/products/document-upload/readme`.

## What this service is

Upload is the platform service that takes a file from a person's browser or an app's server and keeps it safely, so other services can use it. In DocFlow it is the step where an invoice comes in.

The file goes straight from the browser to a private AWS S3 bucket using a link that works for 5 minutes and only for that one file. Upload never handles the bytes on the way in, so large files cost it nothing.

Before anyone can use the file, Upload checks what actually arrived: the right size, a real PDF, PNG or JPEG rather than something renamed, and no more pages than the app allows. Only then is the file `ready`.

## Why it exists

| Reason | In plain terms |
|---|---|
| One safe way in for files | Every app and service that needs a document gets it the same way, with the same checks, instead of each building its own upload. |
| Files never touch the web servers | Sending straight to storage keeps uploads fast, avoids server time limits, and means a large file cannot slow anything else down. |
| Trust what is stored | A file is only usable after its size, type and pages are checked against its real content, so extraction never receives a renamed spreadsheet or a 200-page PDF. |
| Private by design | The bucket is never public. Each link works for one file, for 5 minutes, for its owner, so a forwarded link is useless. |

## What is in this version

**In scope**

- Upload a PDF, PNG or JPEG of up to 10 MB and 10 pages from a browser, on a computer or a phone, including the phone's camera
- Store JSON and CSV files for an app's server, such as DocFlow's results
- Check every file's real type, size and page count before it can be used
- View or download a stored file through a short-lived link
- List and delete your files
- Delete all of a person's files when their account is deleted
- Remove files after 30 days, and abandoned uploads after 24 hours

**Not in this version**

- Several files at once: the batch upload in `MVP2-E9-01` is built by the DocFlow app on top of this service
- Virus scanning, retention rules and resumable uploads for very large files: later versions of Upload
- Sharing a file with another person: not planned
- Reading what a document says: that is the LLM Extraction service

## How an upload works

| Step | Who | What happens |
|---|---|---|
| 1 | Browser | The person drops or picks a file. The upload area checks its type and size first. |
| 2 | Upload | On `POST /files`, records the file as `pending_upload` and signs a 5-minute storage link fixed to that file's type and size. |
| 3 | Browser | Sends the file straight to the private S3 bucket with that link, showing progress. |
| 4 | Upload | On `POST /files/{fileId}/complete`, confirms the size, checks the first bytes match the type, counts PDF pages and fingerprints the content. The file becomes `ready`, or `rejected` and deleted. |
| 5 | App | Moves on with the ready file's ID. In DocFlow, it starts extraction. |
| 6 | Any service | Reads the file later through a 5-minute link from `GET /files/{fileId}/download-url`, forwarding the user's access token so only the owner's files are reachable. |

## Words used in this guide

| Term | Meaning |
|---|---|
| Presigned link | A storage address with a signature that allows one action on one file for a few minutes. It replaces passing the file through Upload. |
| Object | A file's bytes as S3 stores them, at a key like `users/{owner}/{file}/original.pdf`. |
| First bytes check | Every file type starts with a known signature, for example `%PDF-`. Checking it catches a file renamed to look like something else. |
| `accept` | An app's own limits for an upload, which can only be tighter than Upload's. |
| Fingerprint | The SHA-256 of the content, which changes if a single byte changes. |

## Quick start

These examples work once the service is built and deployed behind the gateway.

### 1. Let a person upload a file

Drop the component into a page. It handles checking, progress, retries and the result.

```tsx
import { UploadArea } from "@01scale/ui-upload";

<UploadArea
  accept={{ mimes: ["application/pdf", "image/png", "image/jpeg"], maxBytes: 10_485_760, maxPages: 10 }}
  onUploaded={(file) => router.push(`/files/${file.id}`)}
/>
```

### 2. Upload from code or an agent

Three calls: create the file, send the bytes to the link, then confirm. The `headers` returned must be sent exactly.

```ts
const { file, upload } = await api.post("/api/upload/v1/files", {
  file_name: "invoice.pdf", mime: "application/pdf", size: bytes.length,
});
await fetch(upload.url, { method: "PUT", headers: upload.headers, body: bytes });
const { file: checked } = await api.post(`/api/upload/v1/files/${file.id}/complete`);
if (checked.status === "rejected") console.log(checked.rejection_reason);
```

### 3. Open a stored file

Ask for a link when you need it; it works for 5 minutes.

```ts
const { url } = await api.get(`/api/upload/v1/files/${fileId}/download-url?disposition=inline`);
window.open(url, "_blank");
```

### 4. Read a file inside another service

Forward the user's access token, so Upload applies its own ownership check.

```ts
const res = await fetch(`${UPLOAD_URL}/api/upload/v1/files/${fileId}/download-url`, {
  headers: { Authorization: request.headers.get("authorization")! },
});
const { url } = await res.json();
const bytes = await (await fetch(url)).arrayBuffer();
```

## Endpoints at a glance

Base address: `https://01scale.com/api/upload/v1`

| Method | Path | Access | Scope | Purpose |
|---|---|---|---|---|
| `POST` | `/files` | Signed in | `upload:write` | Create a file and get an upload link |
| `POST` | `/files/{fileId}/complete` | Signed in | `upload:write` | Confirm the upload and check the file |
| `GET` | `/files/{fileId}` | Signed in | `upload:read` | Get one file |
| `GET` | `/files` | Signed in | `upload:read` | List my files |
| `GET` | `/files/{fileId}/download-url` | Signed in | `upload:read` | Get a link to read the file |
| `DELETE` | `/files/{fileId}` | Signed in | `upload:write` | Delete a file |
| `POST` | `/events` | Service | None: HMAC signature | Receive platform events |

## Configuration

Environment variables on the service's own deployment. Secrets are never committed.

| Variable | Value | Secret |
|---|---|---|
| `UPLOAD_DATABASE_URL` | Neon connection string for the `upload_service` role | Yes |
| `UPLOAD_BUCKET` | `01scale-uploads` | No |
| `AWS_REGION` | `us-east-1` | No |
| `UPLOAD_AWS_ACCESS_KEY_ID` | The access key of the IAM user that may only read, write, check and delete objects in this bucket (`MVP1-E2-01`) | Yes |
| `UPLOAD_AWS_SECRET_ACCESS_KEY` | That IAM user's secret key | Yes |
| `IDENTITY_JWKS_URL` | `https://01scale.com/api/identity/v1/jwks`: where access tokens are verified | No |
| `EVENTS_SIGNING_KEY` | 32 random bytes, base64: verifies the signature on platform events | Yes |

## Open questions

- Decided by Nikhil on 17 Nov 2026 (#64): these are demo services, with no batch or programmatic use yet. Each user may make 10 requests a minute that change something, on any service, and 60 reads a minute so pages and progress checks keep working; calls with an API key are limited to 10 a minute in total. Higher limits come with paid plans (`MVP2-E13-06`).
- Decided (#64): files are deleted after 30 days with no notice beforehand. The upload story says so, and each file's `expires_at` is returned with it.
- Decided (#64): each uploaded file is its own file. Several photos of the pages of one invoice are several files, and several documents; joining them into one is not in this version.
- `FilePreview` renders PDFs in the browser (for example with PDF.js) from the 5-minute inline link; the file never passes through Upload's API. Which library is chosen when the component is built.
