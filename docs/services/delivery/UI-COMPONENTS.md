# Delivery service — UI components

> **Version 1 · Email through Resend.** Status: UI components built in `@01scale/ui-delivery` 0.1.1, against a stand-in client; the service is designed, not built. Stories: `MVP1-E7-01`, `MVP1-E7-02`, `MVP1-E7-03`.

What the Delivery service ships for apps to use, as the package `packages/ui-delivery`. Built: every component is shown live, in each of its states, on the module's UI Components page.

## Rules

- Components only read message status; sending is an app's server's job.
- They ship as the package `packages/ui-delivery` and show any app's messages by reference.
- No email address or message content is ever shown or sent to the browser.
- Keyboard reachable, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.

## MessageStatus

*Component.* One line about the email for a reference: on its way, sent, or couldn't be sent.

| Input | Type | Meaning |
|---|---|---|
| `reference` | string | The app's reference, for example the document. |
| `pendingText` | string, optional | Shown while queued. Default 'We'll email you a copy.' |

**States:** Loading: nothing shown, so the page does not jump; Queued: 'We'll email you a copy.'; Sent: 'A copy is in your email.'; Failed: 'Email couldn't be sent.'; None found: nothing shown.

**Calls:** `GET /messages?reference=…`.
