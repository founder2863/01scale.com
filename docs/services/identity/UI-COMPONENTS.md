# Identity service — UI components

> **Version 1 · Login with AWS Cognito.** Status: UI components built in `@01scale/ui-identity` 0.3.0 (MVP1-E0-19 AC5), against a stand-in client; the service is designed, not built.

The components the Identity service ships for apps to use, as the package `packages/ui-identity`. Built: every component is shown live, in each of its states, on the module's UI Components page.

## Rules

- Components call only the Identity API. They never read cookies or tokens from JavaScript; the session cookie is HttpOnly.
- They ship as the package `packages/ui-identity` and are used by any app, not only DocFlow.
- Every state listed above is designed, including loading and failure.
- Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, and usable at 320 pixels wide in light and dark mode.
- In version 1 the forms that take a password are AWS Cognito's hosted pages. 01scale never renders a password field.

## SignInButton

*Component.* A link that starts sign-in.

| Input | Type | Meaning |
|---|---|---|
| `returnTo` | string, optional | Page to land on afterwards. Defaults to the current page. |
| `label` | string, optional | Button text. Default 'Sign in'. |

**States:** Default; Focus (visible outline).

**Calls:** `GET /auth/login?mode=signin`.

## CreateAccountButton

*Component.* A link that starts sign-up.

| Input | Type | Meaning |
|---|---|---|
| `returnTo` | string, optional | Page to land on afterwards. |
| `label` | string, optional | Button text. Default 'Create account'. |

**States:** Default; Focus.

**Calls:** `GET /auth/login?mode=signup`.

## SessionProvider and useSession()

*Provider and hook.* Asks Identity once who is signed in and shares the answer with every component on the page.

| Input | Type | Meaning |
|---|---|---|
| `children` | nodes | The part of the page that needs to know the user. |

**States:** `loading`; `signed_in` with `user.id` and `user.email`; `signed_out`.

**Calls:** `GET /session`.

## UserMenu

*Component.* Shows the signed-in user's email with a Sign out action, or the Sign in button when signed out.

| Input | Type | Meaning |
|---|---|---|
| `returnTo` | string, optional | Passed to the Sign in button. |

**States:** Loading (placeholder of the same size, so the header does not jump); Signed out (shows SignInButton); Signed in, closed; Signed in, open.

**Calls:** `GET /session` (through useSession), `POST /auth/logout`.

## SignOutButton

*Component.* Ends the session and follows the returned logout address.

| Input | Type | Meaning |
|---|---|---|
| `label` | string, optional | Button text. Default 'Sign out'. |

**States:** Default; Working (disabled while the request runs); Failed (keeps the user signed in and shows a retry).

**Calls:** `POST /auth/logout`.

## RequireSignIn

*Wrapper.* Wraps a page that needs a signed-in user. Backs up the gateway's redirect for pages rendered in the browser.

| Input | Type | Meaning |
|---|---|---|
| `children` | nodes | The protected content. |
| `fallback` | node, optional | Shown while the session is loading. |

**States:** Loading (shows fallback); Signed in (shows children); Signed out (redirects to sign-in with `return_to` set to the current page).

**Calls:** `GET /session` (through useSession), `GET /auth/login`.

## SignInError

*Page.* The page at `/sign-in-error` that a browser lands on when sign-in fails: a plain-language message and one button to start again.

| Input | Type | Meaning |
|---|---|---|
| `code` | string | The error code from the callback, mapped to a friendly message. |

**States:** One message per error code; Unknown code (generic message).

**Calls:** `GET /auth/login`.

## Pages provided by AWS Cognito in version 1

These are not 01scale components. They are replaced by 01scale's own pages in version 2.

| Page | What it does |
|---|---|
| Sign in | Email and password, with links to create an account and to reset the password. |
| Create account | Email and password with the 12-character rule shown. |
| Verify email | Enter the 6-digit code; resend the code. |
| Forgot password | Enter email, then the code and a new password. |
