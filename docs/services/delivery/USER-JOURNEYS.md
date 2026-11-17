# Delivery service — user journeys

> **Version 1 · Email through Resend.** Status: in design. Stories: `MVP1-E7-01`, `MVP1-E7-02`, `MVP1-E7-03`.

What a person sees and what the system does when results are delivered, in version 1.

## Get the receipt email

**Who:** Someone who has just paid · **Starts when:** Stripe confirms the payment. · **Stories:** `MVP1-E7-03`

| Step | The person | The system |
|---|---|---|
| 1 | Is on the success page; nothing to do. | Payment tells DocFlow the order is paid; DocFlow's server asks Delivery to send `order_paid`, using the payment event's ID so it is sent once. |
| 2 | Within a minute, receives 'Your DocFlow results are ready' with the document name, the amount paid and a 'View your results' button. | Delivery looks up the verified address, sends the email through Resend from receipts@01scale.com, signed so it passes SPF and DKIM. |
| 3 | Taps 'View your results'. | The link goes to the success page on 01scale.com, which asks them to sign in if needed. The email never contains a file link. |

**Result:** The person has a record of the payment and a way back to the results, without any file being reachable from the email itself.

## Confirmation is slow

**Who:** Someone on the success page · **Starts when:** Stripe's confirmation takes longer than 30 seconds. · **Stories:** `MVP1-E7-01`, `MVP1-E7-03`

| Step | The person | The system |
|---|---|---|
| 1 | Sees 'Confirming payment…', then after 30 seconds 'We'll email you when it's ready.' | DocFlow's success page stops polling the order (its own job, `MVP1-E7-01`). |
| 2 | Receives the email a little later and opens the results from it. | When the payment is confirmed, the email is sent as usual: it never depended on the page staying open. |

**Result:** Closing the page never loses the results.

## The email cannot be sent

**Who:** Someone whose mailbox rejects the email · **Starts when:** Resend reports a failure. · **Stories:** `MVP1-E7-03`

| Step | The person | The system |
|---|---|---|
| 1 | Is on the success page, downloads working. | Delivery retries 3 times; all fail; the message is `failed`. |
| 2 | Sees 'Email couldn't be sent. Your files are here to download.' | The success page reads the message's status from Delivery. |

**Result:** The person still has the files; nothing else depends on the email.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Resend is down or rejects the email | On the success page: 'Email couldn't be sent. Your files are here to download.' | Message `failed` |
| The payment event arrives twice | Only one email. | Same idempotency key |
| The account is deleted before the email goes | Nothing is sent. | Message `cancelled` |
| Someone tries to send email from a browser | Refused. | `service_only` |
