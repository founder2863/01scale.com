# Payment service — user journeys

> **Version 1 · Stripe Checkout, test mode.** Status: designed, not built. Stories: `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`.

What a person sees and what the system does when paying, in version 1 (Stripe test mode).

## Pay for a document

**Who:** Someone whose results are ready · **Starts when:** Taps 'Pay $5.00'. · **Stories:** `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`

| Step | The person | The system |
|---|---|---|
| 1 | Sees the order summary, the price and a banner: 'Test mode — use card 4242 4242 4242 4242, any future date, any CVC'. | The app's page shows what is being bought. |
| 2 | Taps Pay $5.00. | The app's server asks Payment for an order; Payment creates it and a Stripe checkout page. |
| 3 | On Stripe's page (not 01scale's), enters the test card and pays. | Stripe takes the payment and sends the person back to the app's success address. |
| 4 | Sees 'Confirming payment…', then the downloads unlock. | Stripe's signed event reaches Payment, which marks the order paid and tells the app. The browser's return alone never unlocks anything. |

**Result:** The order is paid, recorded once, and the app has been told.

## Change your mind

**Who:** Someone on Stripe's page · **Starts when:** Taps back or Cancel on Stripe's page. · **Stories:** `MVP1-E6-03`

| Step | The person | The system |
|---|---|---|
| 1 | Returns to the app. | Stripe sends them to the cancel address. The order stays `pending`. |
| 2 | Sees 'Payment cancelled — you haven't been charged' and a Pay button. | Nothing was charged. |
| 3 | Taps Pay again within the hour. | Payment returns the same order and the same checkout page. No second order is made. |

**Result:** No duplicate orders, no charge until the person completes payment.

## Come back after the page expired

**Who:** Someone who left for more than an hour · **Starts when:** Taps Pay again. · **Stories:** `MVP1-E6-01`, `MVP1-E6-02`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Pay $5.00. | Stripe had expired the old page and told Payment, which marked that order `expired`. Payment creates a new order and page. |
| 2 | Pays as usual. | Only the new order becomes paid. |

**Result:** The expired attempt stays in the history; the person pays once.

## Card is declined

**Who:** Someone whose card fails · **Starts when:** Enters a declined test card on Stripe's page. · **Stories:** `MVP1-E6-02`

| Step | The person | The system |
|---|---|---|
| 1 | Sees Stripe's message on Stripe's page and tries another card. | Stripe handles the decline itself; nothing reaches 01scale until a payment succeeds or the page expires. |

**Result:** The person can retry on the same page.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Taps Pay for something already paid | Goes straight to the success page. | `already_paid` |
| The checkout page expired | A new checkout page when tapping Pay again. | Order `expired` |
| An async payment method fails later | 'Your payment didn't go through. Try again.' | Order `failed` |
| Stripe is unavailable when starting | 'Payments are unavailable for a moment. You haven't been charged.' | `stripe_unavailable` |
| Stripe's confirmation is slow to arrive | 'Confirming payment…' for a few seconds (the success page's job, `MVP1-E7-01`). | Order still `pending` |
| Follows a link to someone else's order | 'Not found.' | `order_not_found` |
| A forged or replayed Stripe event | Nothing: it is rejected and changes no order. | `invalid_stripe_signature` |
