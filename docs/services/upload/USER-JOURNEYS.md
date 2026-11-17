# Upload service — user journeys

> **Version 1 · Files to AWS S3.** Status: designed, not built. Stories: `MVP1-E2-01`, `MVP1-E2-02`, `MVP1-E2-03`, `MVP1-E2-04`, `MVP1-E2-05`.

What a person sees and what the system does, for uploading a file in version 1.

## Upload a document on a computer

**Who:** Someone with a document on their computer · **Starts when:** Drags a file onto the upload area, or chooses Upload a file. · **Stories:** `MVP1-E2-02`, `MVP1-E2-03`, `MVP1-E2-04`

| Step | The person | The system |
|---|---|---|
| 1 | Drops a PDF onto the upload area, or picks it with Choose file. | The upload area checks the type and size in the browser first, so an obvious mistake is caught before anything is sent. |
| 2 | Sees the file name and a progress bar starting at 0%. | Upload records the file as `pending_upload` and returns a link valid for 5 minutes. |
| 3 | Watches the bar fill. | The browser sends the file straight to private storage with that link. Upload never handles the bytes. |
| 4 | Sees 'Checking your file…' for a moment. | Upload confirms the file arrived at the declared size, checks its first bytes match its type, and counts its pages. |
| 5 | Sees 'Uploaded' and is taken to the next step. | The file is `ready`. The app that uses Upload moves on; in DocFlow, the extraction page opens. |

**Result:** The file is stored privately, checked and ready to use. Only its owner can read it, through links that last 5 minutes.

## Upload from a phone

**Who:** Someone with a paper invoice or a file on their phone · **Starts when:** Taps Choose file or Take photo. · **Stories:** `MVP1-E2-04`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Take photo and photographs the invoice, or taps Choose file and picks a PDF or image. | The phone's own camera or file picker opens. Nothing depends on dragging, which phones cannot do. |
| 2 | Sees the photo's name and the progress bar. | As on a computer: the file is recorded and sent straight to storage. |
| 3 | Sees 'Uploaded' and moves on. | The photo is checked as a JPEG or PNG and counted as one page. |

**Result:** The same result as on a computer.

## Upload a file that is not what it says

**Who:** Someone who picked the wrong file, for example a renamed spreadsheet · **Starts when:** The browser reports a PDF, but the content is something else. · **Stories:** `MVP1-E2-03`

| Step | The person | The system |
|---|---|---|
| 1 | Uploads the file; the bar reaches 100%. | The file arrives in storage. |
| 2 | Sees 'This file isn't a readable PDF, PNG or JPEG. Choose another file.' | The check finds the first bytes do not match the type. Upload marks the file `rejected` with the reason `type_mismatch` and deletes it from storage at once. |
| 3 | Chooses another file. | A new upload starts. The rejected one is kept only as a record, without content. |

**Result:** Nothing unreadable is stored or passed on to extraction.

## Lose the connection during an upload

**Who:** Someone on a weak mobile connection · **Starts when:** The connection drops while the bar is moving. · **Stories:** `MVP1-E2-04`

| Step | The person | The system |
|---|---|---|
| 1 | Sees 'The upload stopped. Check your connection and try again.' and a Retry button. | The browser's transfer failed. Upload still has the file as `pending_upload`. |
| 2 | Taps Retry. | If the 5-minute link is still valid, the browser sends the file again with it; if not, it asks Upload for a new file and link. |
| 3 | Sees 'Uploaded'. | The check runs as usual. |

**Result:** The person never has to start over by hand. An upload abandoned altogether is deleted by the daily clean-up after 24 hours.

## Open a stored file

**Who:** The file's owner, for example checking the original next to extracted data · **Starts when:** Taps the file's name or View original. · **Stories:** `MVP1-E2-03`

| Step | The person | The system |
|---|---|---|
| 1 | Taps View original. | The app asks Upload for a link to the file. |
| 2 | Sees the PDF or image open in a new tab. | Upload returns a link valid for 5 minutes; the browser reads the file straight from storage. |
| 3 | Taps Download instead. | The link is made with `attachment`, so the file saves under its original name. Upload records `file.downloaded`. |

**Result:** The person sees their file. The link stops working after 5 minutes, so a forwarded link is of no use to anyone else.

## Delete a file

**Who:** The file's owner · **Starts when:** Chooses Delete on a file and confirms. · **Stories:** `MVP1-E2-02`

| Step | The person | The system |
|---|---|---|
| 1 | Chooses Delete, then confirms 'Delete this file? This can't be undone.' | The app asks Upload to delete the file. |
| 2 | Sees the file disappear from the list. | Upload removes the object from storage, marks the file `deleted` and records `file.deleted`. |

**Result:** The content is gone for good. A record that the file existed remains, without content, so the history still makes sense.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Picks a Word document or another unsupported type | 'PDF, PNG and JPEG files only.' Nothing is uploaded. | `unsupported_file_type` |
| Picks a file over 10 MB | 'This file is 14.2 MB. The limit is 10 MB.' Nothing is uploaded. | `file_too_large` |
| Uploads a PDF with more than 10 pages | 'This PDF has 14 pages. The limit is 10.' The file is deleted. | Rejected: `too_many_pages` |
| The content does not match the type | 'This file isn't a readable PDF, PNG or JPEG. Choose another file.' | Rejected: `type_mismatch` |
| The connection drops mid-upload | 'The upload stopped. Check your connection and try again.' with Retry. | `upload_missing` |
| Waits more than 5 minutes before the file is sent | Nothing different: the upload area asks for a new link and continues. | (S3 refuses the expired link) |
| What arrived is not the size declared | 'Something went wrong sending this file. Try again.' | `size_mismatch` |
| Opens a file that is still uploading | 'This file is still uploading.' | `file_not_ready` |
| Opens a file older than 30 days | 'This file was removed after 30 days. Upload it again to use it.' | `file_expired` |
| Follows a link to someone else's file | 'File not found.' Nothing reveals that the file exists. | `file_not_found` |
| Storage is unavailable | 'Uploads are unavailable for a moment. Try again shortly.' Nothing is lost. | `storage_unavailable` |
| Is signed out | Is taken to sign in, then returned to the upload page. | `not_authenticated` |
