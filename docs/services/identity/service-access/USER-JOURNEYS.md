# Service access service — user journeys

> **Version 1 · Identity, third part.** Status: in design. Stories: `MVP1-E1-03`, `MVP1-E0-07`, `MVP1-E0-09`.

Service journeys: no person is on a screen.

## DocFlow moves a document on after extraction

**Who:** DocFlow, with no person present · **Starts when:** Receives `extraction.job.completed`. · **Stories:** `MVP1-E0-09`, `MVP1-E1-03`

| Step | The person | The system |
|---|---|---|
| 1 | Reads the document's owner from its process record. | Nothing is sent yet. |
| 2 | Asks Identity for a token for that owner (`on_behalf_of`). | Identity checks DocFlow may act for users and signs a 5-minute token with `act: service:docflow`. |
| 3 | Reads the fields from Extraction and creates the Review task with that token. | Extraction and Review check ownership as for any user, and audit the user and DocFlow. |

**Result:** The same rules apply as when the person clicks, and the audit says DocFlow did it for them.

## Delivery looks up an email

**Who:** Delivery, sending a paid-order email · **Starts when:** Has a queued message for a user. · **Stories:** `MVP1-E7-01`, `MVP1-E1-03`

| Step | The person | The system |
|---|---|---|
| 1 | Signs in as itself with its client secret. | Identity returns a service token with `identity:users.read`. |
| 2 | Calls `GET /users/{userId}`. | Identity returns the verified email. |

**Result:** Delivery knows the address at send time and stores none.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| A service's secret is wrong or revoked | The service's calls fail; its logs show the error. | `invalid_client` |
| A service that may not act for users tries to | Refused. | `delegation_not_allowed` |
| Work continues after the account was deleted | The step stops; nothing is done for a deleted user. | `user_not_found` |
| A service asks for a scope it was not given | Refused. | `invalid_scope` |
