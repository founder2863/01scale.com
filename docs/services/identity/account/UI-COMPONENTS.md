# Account management service — UI components

> **Version 1 · Identity, second part.** Status: in design. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

Identity's account components, in the package `packages/ui-identity` with Login's. Any app can place them on its account page. Designed, not built.

## Rules

- Components call only Identity's API; the account page adds DocFlow's and Payment's components beside them.
- A secret is shown once, in a box with Copy, and never stored in the browser.
- Destructive buttons say exactly what they do and need a second step.
- Same accessibility and size rules as every 01scale page.

## AccountDetails

*Component.* The person's email and the date they joined.

| Input | Type | Meaning |
|---|---|---|

**States:** Loading (fixed-height placeholder); Shown; Failed: Retry.

**Calls:** `GET /me`.

## PasswordChangeButton

*Component.* Change password, and the success message on return.

| Input | Type | Meaning |
|---|---|---|
| `changed` | boolean, optional | Show 'Your password was changed'; the page sets it from `password_changed=1`. |

**States:** Default; Working; Changed; Failed: Retry.

**Calls:** `POST /me/password-change`.

## DeleteAccountDialog

*Component.* Explains what is deleted and kept, and asks the person to type DELETE.

| Input | Type | Meaning |
|---|---|---|
| `onDeleted` | function, optional | Default: go to the home page with 'Your account was deleted'. |

**States:** Closed; Open, button inactive; Open, DELETE typed; Working; Failed: message and Try again.

**Calls:** `DELETE /me`.

## ApiKeysManager

*Component.* Lists keys and creates and revokes them; shows a new secret once with Copy.

| Input | Type | Meaning |
|---|---|---|
| `scopes` | string[], optional | Which scopes to offer. Default: all. |

**States:** Loading; Empty: 'No keys yet' and what keys are for; Listed; Creating; Secret shown once; Revoking; Limit reached; Failed: Retry.

**Calls:** `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/{keyId}`.

## Pages provided by an outside service

In this version, setting a new password happens on Cognito's hosted page.

| Page | What it does |
|---|---|
| Cognito: forgot password | Sends a code by email and sets the new password, then shows Cognito's sign-in. |
