# Identity service — user journeys

> **Version 1 · Login with AWS Cognito.** Status: designed, not built.

What a person sees and what the system does, for login in version 1.

## Create an account

**Who:** A new visitor · **Starts when:** Taps Create account on any 01scale page. · **Stories:** `MVP1-E1-02`, `MVP1-E1-03`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Create account. | Identity starts a login and sends the browser to the sign-up page hosted by AWS Cognito. |
| 2 | Enters an email and a password of 12 or more characters. | Cognito checks the password rules and emails a 6-digit code. |
| 3 | Enters the code from the email. | Cognito marks the email as verified and sends the browser back to 01scale. |
| 4 | Lands on the page they wanted, signed in, with their email shown in the header. | Identity creates the user and a session, sets the session cookie, and records `auth.signup` and `auth.signin`. |

**Result:** A verified user exists and is signed in for 7 days on this browser.

## Sign in

**Who:** A returning user · **Starts when:** Taps Sign in. · **Stories:** `MVP1-E1-03`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Sign in. | Identity sends the browser to Cognito's sign-in page. |
| 2 | Enters email and password. | Cognito checks them and sends the browser back with a one-time code. |
| 3 | Lands on the page they wanted, signed in. | Identity checks the response, finds the user, creates a session and records `auth.signin`. |

**Result:** A new session on this browser. Sessions on other devices are untouched.

## Open a protected page while signed out

**Who:** Anyone following a link · **Starts when:** Opens a page such as `/documents` without being signed in. · **Stories:** `MVP1-E1-06`

| Step | The person | The system |
|---|---|---|
| 1 | Opens the link. | The gateway sees there is no session and redirects to sign-in, remembering the page as `return_to`. |
| 2 | Signs in (or creates an account). | As in the journeys above. |
| 3 | Arrives on the page they first asked for. | Identity redirects to `return_to`, which may only be a page on 01scale.com. |

**Result:** The user never has to find their way back.

## Forgot password

**Who:** A user who cannot sign in · **Starts when:** Taps Forgot your password? on the sign-in page. · **Stories:** `MVP1-E1-04`

| Step | The person | The system |
|---|---|---|
| 1 | Enters their email. | Cognito answers the same way whether or not the account exists, and emails a reset code if it does. |
| 2 | Enters the code and a new password. | Cognito changes the password. |
| 3 | Signs in with the new password. | Identity creates a new session and revokes every older session for that user, recording `auth.sessions_revoked`. |

**Result:** Only the browser that just signed in stays signed in.

## Sign out

**Who:** A signed-in user · **Starts when:** Opens the user menu and taps Sign out. · **Stories:** `MVP1-E1-03`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Sign out. | Identity revokes the session, clears the cookie and records `auth.signout`. |
| 2 | Is returned to the home page, signed out. | The browser is sent through Cognito's logout address so Cognito's own session ends too. |

**Result:** The next sign-in shows the login form again. A token already issued to a service stops working within 5 minutes.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Cancels on the sign-in page | Returns to 01scale signed out, with a short message. | `provider_error` |
| Takes longer than 10 minutes to sign in | Sees 'Sign-in took too long' and a button to start again. | `login_expired` |
| Opens the sign-in link in a different browser | Sees 'Sign-in could not be completed' and starts again. | `login_state_mismatch` |
| Has not verified their email | Is asked to enter the code first; no 01scale user is created. | `email_not_verified` |
| Session reaches 7 days | Is asked to sign in again and returns to the same page. | `not_authenticated` |
| AWS Cognito is unavailable | Sees 'Sign-in is temporarily unavailable. Try again.' | `provider_unavailable` |
