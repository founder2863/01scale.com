# Payment service — UI components

> **Version 1 · Stripe Checkout, test mode.** Status: in design. Stories: `MVP1-E6-01`, `MVP1-E6-02`, `MVP1-E6-03`.

What the Payment service ships for apps to use, as the package `packages/ui-payment`. Designed, not built.

## Rules

- Components call only the Payment API, and only to read: creating an order is an app's server's job, so no browser code can set a price.
- They ship as the package `packages/ui-payment` and show any order an app describes.
- In version 1 a test-mode banner is always shown next to any Pay button.
- Amounts are formatted from minor units with the order's currency, never computed in the browser.
- Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.
- Keyboard reachable, visible focus, labelled controls, status changes announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.

## PaymentSummary

*Component.* What is being bought, the price, the test-mode banner and the Pay button.

| Input | Type | Meaning |
|---|---|---|
| `description` | string | What the person pays for. |
| `amount, currency` | number, string | The price in minor units. |
| `onPay` | () => Promise<string> | Called on Pay; the app's server creates the order and returns the checkout address to go to. |

**States:** Ready; Working: the button disabled while the app creates the order; Cancelled: 'Payment cancelled — you haven't been charged'; Failed: the message and Pay again.

**Calls:** None directly: the app's `onPay` calls its server, which calls `POST /orders`..

## TestModeBanner

*Component.* 'Test mode — use card 4242 4242 4242 4242, any future date, any CVC'.

| Input | Type | Meaning |
|---|---|---|

**States:** Shown.

**Calls:** None..

## OrderStatus

*Component.* Follows an order until it is paid, expired or failed, for a success page.

| Input | Type | Meaning |
|---|---|---|
| `orderId` | string | The order. |
| `timeoutSeconds` | number, optional | How long to keep checking. Default 30. |
| `onSettled` | (order) => void | Called when the order is no longer pending, or on timeout. |

**States:** Confirming: 'Confirming payment…'; Paid; Expired; Failed; Timed out: still pending after the limit.

**Calls:** `GET /orders/{orderId}` every 2 seconds.

## OrderList

*Component.* The person's orders with date, description, amount and status, for an account page.

| Input | Type | Meaning |
|---|---|---|
| `pageSize` | number, optional | Default 20. |

**States:** Loading; Empty: 'No payments yet.'; Loaded, with Load more; Failed: Retry.

**Calls:** `GET /orders`.

## Pages provided by Stripe in version 1

These are Stripe's pages, not 01scale components.

| Page | What it does |
|---|---|
| Stripe Checkout | Where the person enters a card and pays. Stripe's page, at checkout.stripe.com: card details never reach 01scale. |
