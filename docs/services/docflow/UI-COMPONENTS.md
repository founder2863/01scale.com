# DocFlow service — UI components

> **Version 1 · The app that connects the services.** Status: in design. Stories: `MVP1-E0-09`, `MVP1-E2-05`, `MVP1-E5-01`, `MVP1-E5-02`, `MVP1-E5-03`, `MVP1-E5-04`, `MVP1-E7-01`, `MVP1-E7-02`.

DocFlow's own page sections. Everything else on DocFlow's pages comes from the services' component packages. Designed, not built.

## Rules

- DocFlow's pages are built from the services' components; DocFlow adds only the documents list and the results views.
- Same accessibility and size rules as every 01scale page.

## DocumentsList

*Page section.* My documents with name, date, status chip and the next action; an empty state with a sample invoice.

| Input | Type | Meaning |
|---|---|---|
| `pageSize` | number, optional | Default 20. |

**States:** Loading; Empty: 'Upload your first invoice' and the sample; Loaded; Failed: Retry.

**Calls:** `GET /documents`.

## JsonPreview

*Component.* The JSON with syntax highlighting and folding; usable on a phone.

| Input | Type | Meaning |
|---|---|---|
| `documentId` | string | The document. |

**States:** Loading; Shown, folded at the first level on phones; Not ready; Failed: Retry.

**Calls:** `GET /documents/{documentId}/outputs/json/preview`.

## CsvPreview

*Component.* The CSV as a table that scrolls inside its own box.

| Input | Type | Meaning |
|---|---|---|
| `documentId` | string | The document. |

**States:** Loading; Shown; Not ready; Failed: Retry.

**Calls:** `GET /documents/{documentId}/outputs/csv/preview`.

## DownloadButtons

*Component.* Download JSON and Download CSV; 'Pay to download' while locked.

| Input | Type | Meaning |
|---|---|---|
| `documentId` | string | The document. |
| `locked` | boolean | From the outputs request. |

**States:** Locked; Unlocked; Working.

**Calls:** `GET /documents/{documentId}/outputs/{format}/download`.
