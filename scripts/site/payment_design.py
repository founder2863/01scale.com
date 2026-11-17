"""Design of the Payment service, version 1 (Stripe Checkout, test mode).

Data only: scripts/site/render.py turns MODULE into docs/services/payment/*.md and
app/products/payment.ts. Run `npm run site:data` after any change.
Stories: MVP1-E6-01 to MVP1-E6-03. DocFlow's checkout endpoint in MVP1-E6-01 is
designed with the DocFlow app shell, MVP1-E0-09.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "payment"
COMPLETE = True

BASE = "/api/payment/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"   # a user, from Identity
O1 = "0193b120-5a6b-7c7d-8e8f-9a0b1c2d3e4f"   # a paid order
O2 = "0193b130-1122-7334-8556-6778899aabbc"   # an expired order
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"   # DocFlow's document, as a reference
CS1 = "cs_test_a1B2c3D4e5F6g7H8i9J0exampleSession"
CHECKOUT = f"https://checkout.stripe.com/c/pay/{CS1}#fidkdWxOYHwnPyd1blpxYHZxWjA0example"

ORDER_PENDING = {"id": O1, "app": "docflow", "reference": f"docflow:{D1}", "description": "Invoice extraction: acme-invoice-0042.pdf",
                 "amount": 500, "currency": "USD", "status": "pending", "checkout_url": CHECKOUT,
                 "checkout_expires_at": "2026-11-17T10:16:10Z", "paid_at": None, "created_at": "2026-11-17T09:16:10Z"}
ORDER_PAID = {**ORDER_PENDING, "status": "paid", "checkout_url": None, "paid_at": "2026-11-17T09:17:02Z"}

NOT_FOUND = error("404", "order_not_found", "No such order, or it belongs to another user. The same answer in both cases.")
NOT_AUTH = error("401", "not_authenticated", "No valid access token.")
STRIPE_DOWN = error("503", "stripe_unavailable", "Stripe could not be reached. Nothing was charged; safe to retry.")

ENDPOINTS = [
    endpoint(
        "create-order", "POST", f"{BASE}/orders", "Service", "MVP1-E6-01",
        "Create an order and a checkout page",
        "An app's server asks for payment for something it sells. Payment records an order and returns the address of Stripe's checkout page. Never callable from a browser, so a browser can never set a price.",
        [
            param("user_id", "body", "uuid", "Yes", "The user who will pay.", "Who the order is for. The app's service token proves the app may act for its users."),
            param("reference", "body", "string", "Yes", "1 to 200 characters; unique per app while an order is open or paid.", "What is being paid for, in the app's own terms. DocFlow sends `docflow:{document_id}`."),
            param("description", "body", "string", "Yes", "1 to 200 characters.", "What the person sees on the checkout page and the receipt."),
            param("amount", "body", "integer", "Yes", "50 to 100,000 minor units (cents), so $0.50 to $1,000.", "The price, set by the app's server. $0.50 is Stripe's smallest charge in USD."),
            param("currency", "body", "string", "Yes", "In version 1, `USD`.", "The currency, as an ISO 4217 code."),
            param("success_url, cancel_url", "body", "string", "Yes", "HTTPS addresses on 01scale.com (or localhost in development).", "Where Stripe sends the person afterwards. `{ORDER_ID}` in the address is replaced with the order's ID."),
        ],
        [
            "If the app already has a `paid` order for this reference, refuses with `409 already_paid`.",
            "If it has a `pending` order whose checkout page is still open, returns that order with `200`: no second order, no second page.",
            "Otherwise records an order as `pending` and creates a Stripe Checkout session in test mode with the order's ID as `client_reference_id` and in `metadata.order_id`, using the order's ID as Stripe's idempotency key.",
            "The checkout page stays open for 1 hour, then Stripe expires it.",
            "Records `order.created` in the audit log.",
        ],
        [response("201", "A new order was created", "`order` and `checkout_url`."), response("200", "An open order for this reference already existed", "That `order` and its `checkout_url`.")],
        [
            error("409", "already_paid", "This reference is already paid; `order_id` names the paid order."),
            error("422", "validation_failed", "An input is missing or out of range; `errors[]` lists each."),
            error("403", "service_only", "The caller is not an app's server."),
            STRIPE_DOWN,
        ],
        "POST /api/payment/v1/orders HTTP/1.1\nAuthorization: Bearer <DocFlow service token>\nContent-Type: application/json\n\n"
        + json.dumps({"user_id": U1, "reference": f"docflow:{D1}", "description": "Invoice extraction: acme-invoice-0042.pdf", "amount": 500, "currency": "USD",
                      "success_url": f"https://01scale.com/documents/{D1}/success?order={{ORDER_ID}}", "cancel_url": f"https://01scale.com/documents/{D1}/pay?cancelled=1"}, indent=2),
        json.dumps({"order": ORDER_PENDING, "checkout_url": CHECKOUT}, indent=2),
    ),
    endpoint(
        "stripe-webhook", "POST", f"{BASE}/webhooks/stripe", "Service", "MVP1-E6-02",
        "Receive Stripe's events",
        "Stripe tells Payment what happened on its checkout page. This, not the browser, is what marks an order paid.",
        [
            param("Stripe-Signature", "header", "string", "Yes", "Verified against the raw body with the webhook signing secret, rejecting timestamps older than 5 minutes.", "Proves the event came from Stripe and is not a replay."),
            param("(body)", "body", "Stripe event", "Yes", "Read as raw bytes for the signature check, then parsed.", "The event."),
        ],
        [
            "Records the event's ID first; if it was already recorded, answers `200` and changes nothing.",
            "`checkout.session.completed` with `payment_status: paid`: the order becomes `paid` with `paid_at`; records `order.paid`; announces `payment.order.paid`.",
            "`checkout.session.expired`: a `pending` order becomes `expired`; announces `payment.order.expired`.",
            "`checkout.session.async_payment_failed`: the order becomes `failed`; announces `payment.order.failed`.",
            "Any other event type is recorded and ignored.",
            "An order that is already `paid` never goes back to another status.",
        ],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("400", "invalid_signature", "The signature is missing, wrong or too old.")],
        "POST /api/payment/v1/webhooks/stripe HTTP/1.1\nStripe-Signature: t=1794826622,v1=5257a869e7ec...\nContent-Type: application/json\n\n"
        + json.dumps({"id": "evt_test_1Q2w3E4r5T6y", "type": "checkout.session.completed", "data": {"object": {"id": CS1, "client_reference_id": O1, "payment_status": "paid", "metadata": {"order_id": O1}}}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
    endpoint(
        "get-order", "GET", f"{BASE}/orders/{{orderId}}", "Signed in", "MVP1-E6-03",
        "Get one order",
        "An order and its status. The success page polls it until the payment is confirmed.",
        [param("orderId", "path", "uuid", "Yes", "A UUID.", "The order.")],
        ["Read only. `checkout_url` is included only while the order is `pending` and its page is open."],
        [response("200", "The order is the caller's", "`order`: `id`, `app`, `reference`, `description`, `amount`, `currency`, `status` (`pending`, `paid`, `expired`, `failed`), `checkout_url`, `checkout_expires_at`, `paid_at`, `created_at`.")],
        [NOT_FOUND, NOT_AUTH],
        f"GET /api/payment/v1/orders/{O1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"order": ORDER_PAID}, indent=2),
    ),
    endpoint(
        "list-orders", "GET", f"{BASE}/orders", "Signed in", "MVP1-E6-03",
        "List my orders",
        "The caller's orders, newest first. Used on the account page and to find an order by its reference.",
        [
            param("reference", "query", "string", "No", "Exact match.", "Only orders for this reference."),
            param("status", "query", "string", "No", "`pending`, `paid`, `expired` or `failed`.", "Only orders with this status."),
            param("cursor, limit", "query", "string, integer", "No", "`limit` 1 to 100, default 20.", "Paging."),
        ],
        ["Read only."],
        [response("200", "Always, even when empty", "`data[]` of orders and `next_cursor`.")],
        [error("422", "validation_failed", "A filter is not valid."), NOT_AUTH],
        f"GET /api/payment/v1/orders?reference=docflow:{D1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [ORDER_PAID], "next_cursor": None}, indent=2),
    ),
    endpoint(
        "events", "POST", f"{BASE}/events", "Service", "MVP1-E1-05",
        "Receive platform events",
        "Where other services' signed events arrive. In version 1 Payment acts on one: a user's account was deleted.",
        [
            param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body, compared in constant time.", "Proves the event came from the platform."),
            param("event_id, type, data", "body", "uuid, string, object", "Yes", "Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`.", "The event."),
        ],
        ["Keeps the user's orders as payment records (`MVP1-E1-05`: orders are kept, anonymized) but removes the link to the person: `owner_id` becomes empty."],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/payment/v1/events HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n"
        + json.dumps({"event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "type": "identity.user.deleted", "occurred_at": "2026-11-17T10:00:00Z", "data": {"user_id": U1}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
]

# ------------------------------------------------------------------ data model and schema
ORDERS = {"name": "payment.orders", "purpose": "One row per request for payment. The order, not Stripe, is the record an app checks before unlocking anything.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The order's ID; also Stripe's `client_reference_id` and idempotency key."),
    column("owner_id", "uuid", "Yes", "", "Empty only after the owner's account is deleted", "Who pays. A plain ID."),
    column("app", "text", "No", "", "1 to 50 characters, from the calling app's service token", "Which app asked for payment, for example `docflow`."),
    column("reference", "text", "No", "", "1 to 200 characters", "What is paid for, in the app's terms."),
    column("description", "text", "No", "", "1 to 200 characters", "Shown on the checkout page and the receipt."),
    column("amount", "integer", "No", "", "50 to 100,000", "The price in minor units (cents). Never a decimal."),
    column("currency", "text", "No", "", "`USD` in version 1", "ISO 4217 code."),
    column("status", "text", "No", "'pending'", "`pending`, `paid`, `expired` or `failed`", "Where the payment is."),
    column("stripe_session_id", "text", "Yes", "", "Unique. Starts `cs_`", "Stripe's checkout session, to match its events to this order."),
    column("checkout_url", "text", "Yes", "", "Stripe's address; kept only while pending", "Where the person pays; returned again if they click Pay twice."),
    column("checkout_expires_at", "timestamptz", "Yes", "", "1 hour after creation", "When Stripe closes the checkout page."),
    column("paid_at", "timestamptz", "Yes", "", "Set exactly when paid", "When Stripe confirmed payment."),
    column("created_at", "timestamptz", "No", "now()", "", "When the order was created."),
], "constraints": [
    "`orders_pkey`: primary key (`id`)",
    "`orders_stripe_session_id_key`: unique (`stripe_session_id`)",
    "`orders_amount_check`: `amount` 50 to 100,000; `currency` is `USD`",
    "`orders_status_check`: only the four statuses",
    "`orders_paid_check`: `paid_at` is set exactly when `status` is `paid`",
    "`orders_checkout_check`: `checkout_url` only while `pending`",
    "`orders_open_reference_idx`: unique (`app`, `reference`) where `status` in (`pending`, `paid`), so the same thing is never on two open orders or paid twice",
    "`orders_owner_id_idx`: index on (`owner_id`, `created_at` desc), for a user's orders",
], "sampleCols": ["id", "owner_id", "app", "reference", "description", "amount", "currency", "status", "stripe_session_id", "checkout_url", "checkout_expires_at", "paid_at", "created_at"],
   "sampleRows": [
       [O1, U1, "docflow", f"docflow:{D1}", "Invoice extraction: acme-invoice-0042.pdf", "500", "USD", "paid", CS1, "(empty)", "2026-11-17 10:16:10+00", "2026-11-17 09:17:02+00", "2026-11-17 09:16:10+00"],
       [O2, U1, "docflow", "docflow:0193b129-0000-7000-8000-000000000001", "Invoice extraction: march.pdf", "500", "USD", "expired", "cs_test_expiredSessionExample", "(empty)", "2026-11-16 11:00:00+00", "(empty)", "2026-11-16 10:00:00+00"],
   ]}

STRIPE_EVENTS = {"name": "payment.stripe_events", "purpose": "One row per Stripe event received, written before the event is acted on, so a repeat changes nothing.", "columns": [
    column("event_id", "text", "No", "", "Primary key. Starts `evt_`", "Stripe's event ID."),
    column("type", "text", "No", "", "1 to 100 characters", "Stripe's event type."),
    column("order_id", "uuid", "Yes", "", "", "The order it concerned, when there was one."),
    column("created_at", "timestamptz", "No", "now()", "", "When Payment processed it."),
], "constraints": ["`stripe_events_pkey`: primary key (`event_id`)", "`stripe_events_id_check`: `event_id` starts with `evt_`"],
   "sampleCols": ["event_id", "type", "order_id", "created_at"],
   "sampleRows": [["evt_test_1Q2w3E4r5T6y", "checkout.session.completed", O1, "2026-11-17 09:17:03+00"]]}

INBOUND = {"name": "payment.inbound_events", "purpose": "One row per platform event Payment has acted on, so a repeat has no effect.", "columns": [
    column("event_id", "uuid", "No", "", "Primary key", "The event's ID."),
    column("type", "text", "No", "", "1 to 100 characters", "What happened."),
    column("created_at", "timestamptz", "No", "now()", "", "When Payment processed it."),
], "constraints": ["`inbound_events_pkey`: primary key (`event_id`)"], "sampleCols": ["event_id", "type", "created_at"],
   "sampleRows": [["0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "identity.user.deleted", "2026-11-17 10:00:01+00"]]}

DDL = """-- Payment service, version 1. Schema: payment.
-- IDs are UUIDv7 values generated by the service.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists payment;

create table payment.orders (
  id                  uuid        primary key,
  owner_id            uuid,
  app                 text        not null,
  reference           text        not null,
  description         text        not null,
  amount              integer     not null,
  currency            text        not null,
  status              text        not null default 'pending',
  stripe_session_id   text,
  checkout_url        text,
  checkout_expires_at timestamptz,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),

  constraint orders_stripe_session_id_key unique (stripe_session_id),
  constraint orders_text_check check (
    length(app) between 1 and 50
    and length(reference) between 1 and 200
    and length(description) between 1 and 200
  ),
  constraint orders_amount_check check (amount between 50 and 100000 and currency = 'USD'),
  constraint orders_status_check check (status in ('pending', 'paid', 'expired', 'failed')),
  constraint orders_paid_check check ((status = 'paid') = (paid_at is not null)),
  constraint orders_checkout_check check (checkout_url is null or status = 'pending'),
  constraint orders_session_check check (left(stripe_session_id, 3) = 'cs_')
);

-- Never two open orders, and never two payments, for the same thing in the same app.
create unique index orders_open_reference_idx on payment.orders (app, reference)
  where status in ('pending', 'paid');
create index orders_owner_id_idx on payment.orders (owner_id, created_at desc);

create table payment.stripe_events (
  event_id   text        primary key,
  type       text        not null,
  order_id   uuid,
  created_at timestamptz not null default now(),

  constraint stripe_events_id_check check (left(event_id, 4) = 'evt_' and length(type) between 1 and 100)
);

create table payment.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

-- The service's database login reaches only this schema. Orders are never deleted.
grant usage on schema payment to payment_service;
grant select, insert, update on payment.orders to payment_service;
grant select, insert on payment.stripe_events, payment.inbound_events to payment_service;
grant select, insert on payment.audit_events to payment_service;
"""

# ------------------------------------------------------------------ journeys and components
JOURNEYS = [
    journey("Pay for a document", "Someone whose results are ready", "Taps 'Pay $5.00'.", ["MVP1-E6-01", "MVP1-E6-02", "MVP1-E6-03"], [
        ("Sees the order summary, the price and a banner: 'Test mode — use card 4242 4242 4242 4242, any future date, any CVC'.", "The app's page shows what is being bought."),
        ("Taps Pay $5.00.", "The app's server asks Payment for an order; Payment creates it and a Stripe checkout page."),
        ("On Stripe's page (not 01scale's), enters the test card and pays.", "Stripe takes the payment and sends the person back to the app's success address."),
        ("Sees 'Confirming payment…', then the downloads unlock.", "Stripe's signed event reaches Payment, which marks the order paid and tells the app. The browser's return alone never unlocks anything."),
    ], "The order is paid, recorded once, and the app has been told."),
    journey("Change your mind", "Someone on Stripe's page", "Taps back or Cancel on Stripe's page.", ["MVP1-E6-03"], [
        ("Returns to the app.", "Stripe sends them to the cancel address. The order stays `pending`."),
        ("Sees 'Payment cancelled — you haven't been charged' and a Pay button.", "Nothing was charged."),
        ("Taps Pay again within the hour.", "Payment returns the same order and the same checkout page. No second order is made."),
    ], "No duplicate orders, no charge until the person completes payment."),
    journey("Come back after the page expired", "Someone who left for more than an hour", "Taps Pay again.", ["MVP1-E6-01", "MVP1-E6-02"], [
        ("Taps Pay $5.00.", "Stripe had expired the old page and told Payment, which marked that order `expired`. Payment creates a new order and page."),
        ("Pays as usual.", "Only the new order becomes paid."),
    ], "The expired attempt stays in the history; the person pays once."),
    journey("Card is declined", "Someone whose card fails", "Enters a declined test card on Stripe's page.", ["MVP1-E6-02"], [
        ("Sees Stripe's message on Stripe's page and tries another card.", "Stripe handles the decline itself; nothing reaches 01scale until a payment succeeds or the page expires."),
    ], "The person can retry on the same page."),
]

EDGE_CASES = [
    {"situation": "Taps Pay for something already paid", "sees": "Goes straight to the success page.", "code": "`already_paid`"},
    {"situation": "The checkout page expired", "sees": "A new checkout page when tapping Pay again.", "code": "Order `expired`"},
    {"situation": "An async payment method fails later", "sees": "'Your payment didn't go through. Try again.'", "code": "Order `failed`"},
    {"situation": "Stripe is unavailable when starting", "sees": "'Payments are unavailable for a moment. You haven't been charged.'", "code": "`stripe_unavailable`"},
    {"situation": "Stripe's confirmation is slow to arrive", "sees": "'Confirming payment…' for a few seconds (the success page's job, `MVP1-E7-01`).", "code": "Order still `pending`"},
    {"situation": "Follows a link to someone else's order", "sees": "'Not found.'", "code": "`order_not_found`"},
    {"situation": "A forged or replayed Stripe event", "sees": "Nothing: it is rejected and changes no order.", "code": "`invalid_signature`"},
]

UI_RULES = [
    "Components call only the Payment API, and only to read: creating an order is an app's server's job, so no browser code can set a price.",
    "They ship as the package `packages/ui-payment` and show any order an app describes.",
    "In version 1 a test-mode banner is always shown next to any Pay button.",
    "Amounts are formatted from minor units with the order's currency, never computed in the browser.",
    "Every request has a loading state that keeps the layout still, and a failure state with a plain-language message and a retry.",
    "Keyboard reachable, visible focus, labelled controls, status changes announced to screen readers, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.",
]

COMPONENTS = [
    component("PaymentSummary", "Component", "What is being bought, the price, the test-mode banner and the Pay button.",
        [("description", "string", "What the person pays for."), ("amount, currency", "number, string", "The price in minor units."), ("onPay", "() => Promise<string>", "Called on Pay; the app's server creates the order and returns the checkout address to go to.")],
        ["Ready", "Working: the button disabled while the app creates the order", "Cancelled: 'Payment cancelled — you haven't been charged'", "Failed: the message and Pay again"],
        ["None directly: the app's `onPay` calls its server, which calls `POST /orders`."]),
    component("TestModeBanner", "Component", "'Test mode — use card 4242 4242 4242 4242, any future date, any CVC'.", [], ["Shown"], ["None."]),
    component("OrderStatus", "Component", "Follows an order until it is paid, expired or failed, for a success page.",
        [("orderId", "string", "The order."), ("timeoutSeconds", "number, optional", "How long to keep checking. Default 30."), ("onSettled", "(order) => void", "Called when the order is no longer pending, or on timeout.")],
        ["Confirming: 'Confirming payment…'", "Paid", "Expired", "Failed", "Timed out: still pending after the limit"],
        ["`GET /orders/{orderId}` every 2 seconds"]),
    component("OrderList", "Component", "The person's orders with date, description, amount and status, for an account page.",
        [("pageSize", "number, optional", "Default 20.")],
        ["Loading", "Empty: 'No payments yet.'", "Loaded, with Load more", "Failed: Retry"],
        ["`GET /orders`"]),
]

HOSTED_PAGES = [
    {"page": "Stripe Checkout", "what": "Where the person enters a card and pays. Stripe's page, at checkout.stripe.com: card details never reach 01scale."},
]

# ------------------------------------------------------------------ read me
MODULE = {
    "slug": "payment",
    "docsPath": "docs/services/payment",
    "extraDocs": [],
    "labels": {"flow": "How a payment works", "hosted": "Pages provided by Stripe in version 1"},
    "notes": {
        "journey": "What a person sees and what the system does when paying, in version 1 (Stripe test mode).",
        "ui": "What the Payment service ships for apps to use, as the package `packages/ui-payment`.",
        "hosted": "These are Stripe's pages, not 01scale components.",
        "token": "",
        "schema": "The SQL for the Payment service's tables, in the `payment` schema. No other service can read them.",
    },
    "overview": {
        "name": "Payment", "version": "Version 1 · Stripe Checkout, test mode", "status": "Designed, not built", "base": BASE,
        "what": [
            "Payment is the platform service that takes a one-time payment for something an app sells. In DocFlow it is the step where a person pays before downloading the results.",
            "An app's server asks for an order with a price; Payment returns the address of Stripe's own checkout page, where the person pays. Card details never touch 01scale.",
            "Stripe's signed message, not the person's browser, is what marks an order paid. Payment then tells the app, and the app unlocks what was bought. Version 1 runs in Stripe's test mode only.",
        ],
        "why": [
            {"title": "One trusted record of who paid for what", "text": "Apps check the order's status before unlocking anything, instead of each talking to Stripe."},
            {"title": "Prices are never set by a browser", "text": "Only an app's server can create an order, so nobody can change a price in their browser."},
            {"title": "Charged once, even when things repeat", "text": "Clicking twice, a repeated Stripe message or a retried request never creates a second order or charge."},
            {"title": "No card data to protect", "text": "Stripe's hosted page takes the card, which keeps 01scale out of most of the card-security rules."},
        ],
        "scope_in": ["One-time payment for one item, in USD, through Stripe Checkout in test mode", "Reuse the open checkout page when Pay is clicked again", "Mark orders paid, expired or failed from Stripe's signed events, once each", "Tell the app when an order changes", "List a person's orders; keep them, anonymized, if the account is deleted"],
        "scope_out": ["Saved cards and one-tap payment: `MVP2-E13`", "Paying for a batch of documents: `MVP2-E13-04`", "Refunds: not designed", "Live (real-money) payments: not planned for the portfolio", "Currencies other than USD"],
        "stories": ["MVP1-E6-01", "MVP1-E6-02", "MVP1-E6-03"],
    },
    "flow": [
        {"who": "App's server", "what": "Calls `POST /orders` with the user, a reference, a description and the price. In DocFlow, when the person taps Pay."},
        {"who": "Payment", "what": "Records a `pending` order and creates a Stripe Checkout session; returns its address. A second call for the same reference returns the same order."},
        {"who": "Browser", "what": "Goes to Stripe's page; the person pays there."},
        {"who": "Stripe", "what": "Sends the person back to the app, and separately sends Payment a signed `checkout.session.completed` event."},
        {"who": "Payment", "what": "Verifies the signature, records the event once, marks the order `paid`, and announces `payment.order.paid`."},
        {"who": "App", "what": "Receives the event (or sees the order paid when polling) and unlocks what was bought."},
    ],
    "concepts": [
        {"term": "Order", "meaning": "One request for payment, with its price and status. The record an app trusts."},
        {"term": "Checkout session", "meaning": "Stripe's hosted payment page for one order, open for 1 hour."},
        {"term": "Webhook", "meaning": "A message Stripe sends to Payment's server when something happens, signed so it can be verified."},
        {"term": "Minor units", "meaning": "The amount in the currency's smallest unit: 500 means $5.00."},
        {"term": "Reference", "meaning": "What is being paid for, in the app's own terms; one open or paid order per reference."},
    ],
    "quickstart": [
        {"title": "Ask for payment (app server)", "text": "Set the price on the server and send the person to the returned address.",
         "lang": "ts", "code": 'const { order, checkout_url } = await serviceApi.post("/api/payment/v1/orders", {\n  user_id: userId, reference: `myapp:${itemId}`, description: "Report export",\n  amount: 500, currency: "USD",\n  success_url: `https://01scale.com/items/${itemId}/paid?order={ORDER_ID}`,\n  cancel_url: `https://01scale.com/items/${itemId}`,\n});\nreturn redirect(checkout_url);'},
        {"title": "Confirm before unlocking", "text": "Trust the order's status, never the browser arriving at the success page.",
         "lang": "ts", "code": 'const { order } = await api.get(`/api/payment/v1/orders/${orderId}`);\nif (order.status !== "paid") return status(402);'},
        {"title": "Show progress on a success page", "text": "The component polls until the order settles.",
         "lang": "tsx", "code": 'import { OrderStatus } from "@01scale/ui-payment";\n\n<OrderStatus orderId={orderId} onSettled={(o) => o.status === "paid" && unlock()} />'},
    ],
    "env": [
        {"name": "PAYMENT_DATABASE_URL", "value": "Neon connection string for the `payment_service` role", "secret": "Yes"},
        {"name": "STRIPE_SECRET_KEY", "value": "A Stripe test-mode secret key (`sk_test_…`). Live keys are refused at start-up.", "secret": "Yes"},
        {"name": "STRIPE_WEBHOOK_SECRET", "value": "The signing secret of the webhook endpoint (`whsec_…`)", "secret": "Yes"},
        {"name": "IDENTITY_JWKS_URL", "value": "`https://01scale.com/api/identity/v1/jwks`", "secret": "No"},
        {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64: signs and verifies platform events", "secret": "Yes"},
        {"name": "EVENT_SUBSCRIBERS", "value": "The webhook addresses that receive Payment's events, for example DocFlow's", "secret": "No"},
    ],
    "openQuestions": [
        "Stripe Checkout pages are kept open for 1 hour here (Stripe allows 30 minutes to 24 hours). Is an hour right?",
        "Refunds are not designed. In test mode they matter only for the demo; should the admin be able to refund?",
        "Rate limits are starting values.",
    ],
    "errorSample": problem("already_paid", "Already paid", 409, "This item is already paid for."),
    "endpoints": ENDPOINTS,
    "noEndpoint": [
        {"topic": "Events Payment announces", "how": "`payment.order.paid`, `payment.order.expired` and `payment.order.failed`, with `{order_id, app, reference, amount, currency}`, signed and delivered with retries from the outbox to the app that created the order."},
        {"topic": "The checkout page (MVP1-E6-01)", "how": "Stripe's hosted page. 01scale never receives card details."},
        {"topic": "DocFlow's checkout endpoint", "how": "`POST /api/docflow/v1/documents/{documentId}/checkout` belongs to the DocFlow app, which sets the $5.00 price and calls `POST /orders` from its server. Designed with the DocFlow app shell (`MVP1-E0-09`)."},
        {"topic": "AI agents", "how": "Each read endpoint is a tool on Payment's MCP server, `POST /api/payment/mcp`. An agent can receive a checkout address to hand to the person, but can never complete a payment itself."},
        {"topic": "Health and contract", "how": "`GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`)."},
    ],
    "tables": [ORDERS, STRIPE_EVENTS, INBOUND],
    "entities": [
        {"name": "Order", "table": "`payment.orders`", "what": "One request for payment.", "relations": "Belongs to one user and one app, by ID and name. Matches one Stripe checkout session."},
        {"name": "Stripe event", "table": "`payment.stripe_events`", "what": "A message from Stripe already processed.", "relations": "Refers to an order by ID."},
        {"name": "Processed event", "table": "`payment.inbound_events`", "what": "A platform event already acted on.", "relations": "Stands alone."},
    ],
    "lifecycles": [
        {"name": "Order", "text": "`pending` when created → `paid` when Stripe confirms, `expired` when Stripe closes the page unpaid, or `failed` when a delayed payment fails. A paid order never changes again; an expired or failed one is replaced by a new order if the person pays later."},
        {"name": "Checkout address", "text": "Kept while the order is pending, so Pay can reuse it; cleared when the order settles."},
    ],
    "otherTables": "The service template also gives Payment `audit_events`, `idempotency_keys` and `outbound_events`. Payment writes `order.created`, `order.paid`, `order.expired` and `order.failed` to `audit_events` and announces the same through `outbound_events`.",
    "notStored": ["Card numbers, expiry dates and CVCs: they go to Stripe only.", "Stripe's full event bodies: only the event ID and type.", "Prices: each app's server sets its own, per order."],
    "ddl": DDL,
    "queries": [
        {"title": "Reuse an open order, or create one (`POST /orders`)", "sql": "select * from payment.orders\nwhere app = $1 and reference = $2 and status in ('pending', 'paid');\n-- paid: 409 already_paid; pending with an open page: return it; none: insert a new order"},
        {"title": "Apply a Stripe event once (`POST /webhooks/stripe`)", "sql": "insert into payment.stripe_events (event_id, type, order_id) values ($1, $2, $3)\non conflict (event_id) do nothing;\n-- no row inserted: already processed, answer 200\nupdate payment.orders set status = 'paid', paid_at = now(), checkout_url = null\nwhere id = $3 and status = 'pending';"},
    ],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "uiRules": UI_RULES,
    "components": COMPONENTS,
    "hostedPages": HOSTED_PAGES,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "Only an app's server can create an order; the price is never taken from a browser.",
            "Amount 50 to 100,000 minor units, in USD; return addresses on 01scale.com only.",
            "One open or paid order per app and reference: asking again returns the open one or refuses with `already_paid`.",
            "Stripe events must carry a valid signature no older than 5 minutes, and are processed once per event ID.",
            "Another user's order answers `404 order_not_found`.",
            "Only test-mode Stripe keys are accepted in version 1.",
        ]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": [
            "Never two pending-or-paid orders for the same app and reference (partial unique index).",
            "A paid order always has its payment time; a checkout address exists only while pending.",
            "Amounts are whole minor units within range; currency is USD.",
            "Each Stripe event and platform event is recorded once (primary keys).",
            "Payment's database login reaches only the `payment` schema and cannot delete orders.",
        ]},
        {"level": "Data model level: business rules the service guarantees", "items": [
            "An order becomes paid only from a verified Stripe event, never from the browser's return.",
            "A paid order never changes status again.",
            "Charging twice for the same reference is impossible, even when requests or events repeat.",
            "An app learns of every change through a signed event, and can always confirm by reading the order.",
            "Deleting an account keeps its orders as payment records without the link to the person.",
        ]},
    ],
}
