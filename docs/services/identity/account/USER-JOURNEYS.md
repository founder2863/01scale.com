# Account management service — user journeys

> **Version 1 · Identity, second part.** Status: designed, not built. Stories: `MVP1-E1-05`, `MVP1-E0-06`.

What a person sees on the account page, and how they let an agent act for them.

## See my account

**Who:** A signed-in user · **Starts when:** Opens Account from the user menu. · **Stories:** `MVP1-E1-05`

| Step | The person | The system |
|---|---|---|
| 1 | Sees their email, the date they joined, how many documents they have processed, and their orders. | The page reads Identity `GET /me`, DocFlow's totals and Payment's orders. |

**Result:** Nothing changes.

## Change my password

**Who:** A signed-in user · **Starts when:** Taps Change password on the account page. · **Stories:** `MVP1-E1-05`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Change password. | Identity starts a login and returns the address of Cognito's page. |
| 2 | On Cognito's page (not ours): receives a code by email, enters it and a new password. | Cognito changes the password. |
| 3 | Signs in with the new password on Cognito's page. | Identity signs them in, revokes their older sessions and records `auth.password_changed`. |
| 4 | Lands on the account page with 'Your password was changed'. | The page reads `password_changed=1`. |

**Result:** Only this browser stays signed in.

## Delete my account

**Who:** A signed-in user · **Starts when:** Taps Delete account on the account page. · **Stories:** `MVP1-E1-05`

| Step | The person | The system |
|---|---|---|
| 1 | Reads what will be deleted (documents, results, keys) and what is kept anonymized (orders, for records). | Nothing is sent yet. |
| 2 | Types DELETE; the button becomes active; taps it. | Identity deletes the Cognito user, then the account, and tells every service. |
| 3 | Lands on the home page, signed out, with 'Your account was deleted'. | Each service deletes or anonymizes that person's data as the event arrives. |

**Result:** The account is gone and cannot sign in. Signing up again with the same email creates a new, empty account.

## Give an agent access

**Who:** A user who uses an AI agent · **Starts when:** Opens API keys on the account page. · **Stories:** `MVP1-E0-06`

| Step | The person | The system |
|---|---|---|
| 1 | Taps New key, names it, picks what it may do and when it expires. | Nothing is sent until they confirm. |
| 2 | Taps Create; sees the secret once, with Copy and 'You won't see this again'. | Identity stores only the key's hash and records `auth.api_key_created`. |
| 3 | Pastes the key into the agent's settings. | The agent's calls go through the gateway, which exchanges the key for a 5-minute token. |
| 4 | Later sees 'Last used 2 minutes ago' beside the key. | Identity updates the key's last use at most once a minute. |

**Result:** The agent can do what the scopes allow and nothing else; paying still needs the person.

## Revoke a key

**Who:** A user · **Starts when:** Taps Revoke beside a key. · **Stories:** `MVP1-E0-06`

| Step | The person | The system |
|---|---|---|
| 1 | Confirms Revoke. | Identity revokes the key and records `auth.api_key_revoked`. |
| 2 | The key leaves the list. | The agent's next call fails with `invalid_api_key` within 5 minutes. |

**Result:** The key never works again.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Types something other than DELETE | The button stays inactive; if sent anyway, 'Type DELETE to confirm.' | `confirmation_mismatch` |
| Cognito is down while deleting | 'We couldn't delete your account right now. Nothing was deleted. Try again in a moment.' | `dependency_unavailable` |
| An agent tries to create a key, change the password or delete the account | The agent is told a person must do this in a browser. | `session_required` |
| Already has 10 keys | 'You have 10 keys. Revoke one to create another.' | `too_many_keys` |
| Leaves the name empty or picks no scope | The field is marked with what to fix. | `validation_failed` |
| Closes the dialog before copying the secret | The key is listed, but the secret cannot be shown again: revoke it and create another. | None |
| An agent uses a revoked or expired key | The agent is told the key is not valid. | `invalid_api_key` |
| Opens the account page after the session ended | Sign-in, then back to the account page. | `not_authenticated` |
