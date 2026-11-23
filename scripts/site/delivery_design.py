"""Design of the Delivery service, version 1 (email through Resend).

Data only: scripts/site/render.py turns MODULE into docs/services/delivery/*.md and
app/products/delivery.ts. Run `npm run site:data` after any change.
Stories: MVP1-E7-03 (Delivery). The success page and secure downloads in
MVP1-E7-01 and MVP1-E7-02 belong to the DocFlow app (MVP1-E0-09) and are noted here.
"""
import json

from render import column, component, endpoint, error, journey, param, problem, response

KEY = "delivery"
COMPLETE = True

BASE = "/api/delivery/v1"
U1 = "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e"
M1 = "0193b140-2b3c-7d4e-8f50-6172839a0b1c"   # a sent message
M2 = "0193b150-0011-7223-8445-566778899aab"   # a failed message
D1 = "0193b0c4-91aa-7b33-8c44-5d6e7f8a9b0c"

MSG_SENT = {"id": M1, "app": "docflow", "reference": f"docflow:{D1}", "channel": "email", "template": "order_paid", "status": "sent",
            "attempts": 1, "last_error": None, "sent_at": "2026-11-17T09:17:09Z", "created_at": "2026-11-17T09:17:04Z"}

NOT_AUTH = error("401", "not_authenticated", "No valid access token.")

ENDPOINTS = [
    endpoint(
        "send-message", "POST", f"{BASE}/messages", "Service", "MVP1-E7-03",
        "Send a templated email to a user",
        "An app's server asks Delivery to email one of its users, acting for that user. Delivery looks up the address, fills the template, sends it through Resend and retries if needed. Only a delegated token is accepted, so a browser can never send email in 01scale's name.",
        [
            param("Authorization", "header", "string", "Yes", "`Bearer <delegated token>` with `delivery:write` and `act`.", "Who receives it is the token's `sub`. Delivery looks up their verified email from Identity at send time; apps never pass addresses."),
            param("template", "body", "string", "Yes", "In version 1, `order_paid`.", "Which email. Each template has fixed wording, a plain-text and an HTML version."),
            param("data", "body", "object", "Yes", "The template's fields only. For `order_paid`: `document_name` (1 to 255 characters), `amount` and `currency` (minor units and code), `link_path` (a path on 01scale.com).", "What fills the template. Links are paths, so an email can only point at 01scale.com."),
            param("reference", "body", "string", "Yes", "1 to 200 characters.", "The app's own label, for finding the message later."),
            param("Idempotency-Key", "header", "string", "Yes", "1 to 255 characters. DocFlow uses the Payment event's ID.", "The same key never sends a second email."),
        ],
        [
            "Validates the template's data and records the message as `queued`; answers `202` at once.",
            "In the background: looks up the user's email through Identity `GET /api/identity/v1/users/{userId}` with Delivery's own service token (`identity:users.read`), renders the template, and sends it through Resend from `receipts@01scale.com`.",
            "On a failure Resend says is temporary, retries 3 times, after 1, 5 and 25 seconds. Then the message is `failed` with the reason, and Delivery announces `delivery.message.failed`.",
            "On success the message is `sent` with Resend's message ID, and `delivery.message.sent` is recorded in the audit log.",
        ],
        [response("202", "Accepted", "`message` (status `queued`).")],
        [
            error("422", "unknown_template", "`template` is not one Delivery has."),
            error("422", "validation_failed", "`data` is missing a field or has one the template does not use."),
            error("422", "idempotency_key_reused", "Same key, different body."),
            error("403", "service_only", "The token is not a delegated token: a browser session, an API key or a service acting as itself."),
        ],
        "POST /api/delivery/v1/messages HTTP/1.1\nAuthorization: Bearer <delegated token: the user, act service:docflow>\nIdempotency-Key: evt_order_paid_0193b120\nContent-Type: application/json\n\n"
        + json.dumps({"template": "order_paid", "reference": f"docflow:{D1}",
                      "data": {"document_name": "acme-invoice-0042.pdf", "amount": 500, "currency": "USD", "link_path": f"/documents/{D1}/success"}}, indent=2),
        "HTTP/1.1 202 Accepted\nContent-Type: application/json\n\n" + json.dumps({"message": {**MSG_SENT, "status": "queued", "attempts": 0, "sent_at": None}}, indent=2),
    ),
    endpoint(
        "list-messages", "GET", f"{BASE}/messages", "Signed in", "MVP1-E7-03",
        "My messages and their status",
        "The signed-in person's messages, newest first. The success page uses it to show 'Email couldn't be sent' when a send failed.",
        [
            param("reference", "query", "string", "No", "Exact match.", "Only messages about this reference."),
            param("cursor, limit", "query", "string, integer", "No", "`limit` 1 to 100, default 20.", "Paging."),
        ],
        ["Read only. Never returns the email address or the email's content: only template, status and times."],
        [response("200", "Always, even when empty", "`data[]` of messages and `next_cursor`.")],
        [error("422", "validation_failed", "A filter is not valid."), NOT_AUTH],
        f"GET /api/delivery/v1/messages?reference=docflow:{D1} HTTP/1.1\nHost: 01scale.com\nAuthorization: Bearer <access token>",
        json.dumps({"data": [MSG_SENT], "next_cursor": None}, indent=2),
    ),
    endpoint(
        "events", "POST", f"{BASE}/events", "Service", "MVP1-E1-05",
        "Receive platform events",
        "Where other services' signed events arrive. In version 1 Delivery acts on one: a user's account was deleted.",
        [
            param("X-01scale-Signature", "header", "string", "Yes", "HMAC-SHA256 of the raw body, compared in constant time.", "Proves the event came from the platform."),
            param("event_id, type, data", "body", "uuid, string, object", "Yes", "Processed once per `event_id`; acts on `identity.user.deleted` with `{user_id}`.", "The event."),
        ],
        ["Cancels that user's queued messages and deletes their message records."],
        [response("200", "Accepted, including a repeat or an ignored type", "No body.")],
        [error("401", "invalid_signature", "The signature is missing or wrong.")],
        "POST /api/delivery/v1/events HTTP/1.1\nX-01scale-Signature: sha256=8c1f...\nContent-Type: application/json\n\n"
        + json.dumps({"event_id": "0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "type": "identity.user.deleted", "occurred_at": "2026-11-17T10:00:00Z", "data": {"user_id": U1}}, indent=2),
        "HTTP/1.1 200 OK",
    ),
]

MESSAGES = {"name": "delivery.messages", "purpose": "One row per email asked for. It records what was sent and whether it arrived at Resend; never the address or the content.", "columns": [
    column("id", "uuid", "No", "", "Primary key. UUIDv7", "The message's ID."),
    column("owner_id", "uuid", "No", "", "", "The user it is for. A plain ID; the address is looked up at send time, never stored."),
    column("app", "text", "No", "", "1 to 50 characters, from the `app` claim of the delegated token", "Which app asked."),
    column("reference", "text", "No", "", "1 to 200 characters", "The app's label."),
    column("idempotency_key", "text", "No", "", "1 to 255 characters; unique per app", "The key that stops a second send."),
    column("channel", "text", "No", "'email'", "`email` in version 1", "How it is sent. SMS and push arrive in MVP2."),
    column("template", "text", "No", "", "`order_paid` in version 1", "Which email."),
    column("status", "text", "No", "'queued'", "`queued`, `sent`, `failed` or `cancelled`", "Where the message is."),
    column("attempts", "smallint", "No", "0", "0 to 4", "Sends tried: the first and up to 3 retries."),
    column("provider_message_id", "text", "Yes", "", "Set exactly when sent", "Resend's ID, to trace a message with Resend."),
    column("last_error", "text", "Yes", "", "Set when failed", "The provider's reason, without any personal data."),
    column("sent_at", "timestamptz", "Yes", "", "Set exactly when sent", "When Resend accepted it."),
    column("created_at", "timestamptz", "No", "now()", "", "When it was asked for."),
], "constraints": [
    "`messages_pkey`: primary key (`id`)",
    "`messages_idempotency_key`: unique (`app`, `idempotency_key`), so the same request never sends twice",
    "`messages_values_check`: channel, template and status only the listed values; attempts 0 to 4",
    "`messages_sent_check`: `sent_at` and `provider_message_id` are set exactly when `status` is `sent`",
    "`messages_failed_check`: `last_error` is set when `status` is `failed`",
    "`messages_owner_idx`: index on (`owner_id`, `created_at` desc), for a person's messages",
    "`messages_queued_idx`: partial index on (`created_at`) where `status = 'queued'`, for the sender",
], "sampleCols": ["id", "owner_id", "app", "reference", "idempotency_key", "channel", "template", "status", "attempts", "provider_message_id", "last_error", "sent_at", "created_at"],
   "sampleRows": [
       [M1, U1, "docflow", f"docflow:{D1}", "evt_order_paid_0193b120", "email", "order_paid", "sent", "1", "re_8f1c2a3b4c5d", "(empty)", "2026-11-17 09:17:09+00", "2026-11-17 09:17:04+00"],
       [M2, U1, "docflow", "docflow:0193b129-0000-7000-8000-000000000002", "evt_order_paid_0193b131", "email", "order_paid", "failed", "4", "(empty)", "Mailbox unavailable", "(empty)", "2026-11-17 11:02:00+00"],
   ]}

INBOUND = {"name": "delivery.inbound_events", "purpose": "One row per platform event Delivery has acted on.", "columns": [
    column("event_id", "uuid", "No", "", "Primary key", "The event's ID."),
    column("type", "text", "No", "", "1 to 100 characters", "What happened."),
    column("created_at", "timestamptz", "No", "now()", "", "When Delivery processed it."),
], "constraints": ["`inbound_events_pkey`: primary key (`event_id`)"], "sampleCols": ["event_id", "type", "created_at"],
   "sampleRows": [["0193b2aa-6f01-7c2d-9e3f-4a5b6c7d8e9f", "identity.user.deleted", "2026-11-17 10:00:01+00"]]}

DDL = """-- Delivery service, version 1. Schema: delivery.
-- IDs are UUIDv7 values generated by the service.
-- Checked with `npm run schema:check`: runs on PGlite, and every sample row passes every constraint.

create schema if not exists delivery;

create table delivery.messages (
  id                  uuid        primary key,
  owner_id            uuid        not null,
  app                 text        not null,
  reference           text        not null,
  idempotency_key     text        not null,
  channel             text        not null default 'email',
  template            text        not null,
  status              text        not null default 'queued',
  attempts            smallint    not null default 0,
  provider_message_id text,
  last_error          text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),

  constraint messages_idempotency_key unique (app, idempotency_key),
  constraint messages_text_check check (
    length(app) between 1 and 50 and length(reference) between 1 and 200
    and length(idempotency_key) between 1 and 255
  ),
  constraint messages_values_check check (
    channel in ('email') and template in ('order_paid')
    and status in ('queued', 'sent', 'failed', 'cancelled')
    and attempts between 0 and 4
  ),
  constraint messages_sent_check check (
    (status = 'sent') = (sent_at is not null)
    and (sent_at is null) = (provider_message_id is null)
  ),
  constraint messages_failed_check check (status <> 'failed' or last_error is not null)
);

create index messages_owner_idx on delivery.messages (owner_id, created_at desc);
create index messages_queued_idx on delivery.messages (created_at) where status = 'queued';

create table delivery.inbound_events (
  event_id   uuid        primary key,
  type       text        not null,
  created_at timestamptz not null default now()
);

-- The service's database login reaches only this schema.
grant usage on schema delivery to delivery_service;
grant select, insert, update, delete on delivery.messages to delivery_service;
grant select, insert on delivery.inbound_events, delivery.audit_events to delivery_service;
"""

JOURNEYS = [
    journey("Get the receipt email", "Someone who has just paid", "Stripe confirms the payment.", ["MVP1-E7-03"], [
        ("Is on the success page; nothing to do.", "Payment tells DocFlow the order is paid; DocFlow's server asks Delivery to send `order_paid`, using the payment event's ID so it is sent once."),
        ("Within a minute, receives 'Your DocFlow results are ready' with the document name, the amount paid and a 'View your results' button.", "Delivery looks up the verified address, sends the email through Resend from receipts@01scale.com, signed so it passes SPF and DKIM."),
        ("Taps 'View your results'.", "The link goes to the success page on 01scale.com, which asks them to sign in if needed. The email never contains a file link."),
    ], "The person has a record of the payment and a way back to the results, without any file being reachable from the email itself."),
    journey("Confirmation is slow", "Someone on the success page", "Stripe's confirmation takes longer than 30 seconds.", ["MVP1-E7-01", "MVP1-E7-03"], [
        ("Sees 'Confirming payment…', then after 30 seconds 'We'll email you when it's ready.'", "DocFlow's success page stops polling the order (its own job, `MVP1-E7-01`)."),
        ("Receives the email a little later and opens the results from it.", "When the payment is confirmed, the email is sent as usual: it never depended on the page staying open."),
    ], "Closing the page never loses the results."),
    journey("The email cannot be sent", "Someone whose mailbox rejects the email", "Resend reports a failure.", ["MVP1-E7-03"], [
        ("Is on the success page, downloads working.", "Delivery retries 3 times; all fail; the message is `failed`."),
        ("Sees 'Email couldn't be sent. Your files are here to download.'", "The success page reads the message's status from Delivery."),
    ], "The person still has the files; nothing else depends on the email."),
]

EDGE_CASES = [
    {"situation": "Resend is down or rejects the email", "sees": "On the success page: 'Email couldn't be sent. Your files are here to download.'", "code": "Message `failed`"},
    {"situation": "The payment event arrives twice", "sees": "Only one email.", "code": "Same idempotency key"},
    {"situation": "The account is deleted before the email goes", "sees": "Nothing is sent.", "code": "Message `cancelled`"},
    {"situation": "Someone tries to send email from a browser", "sees": "Refused.", "code": "`service_only`"},
]

UI_RULES = [
    "Components only read message status; sending is an app's server's job.",
    "They ship as the package `packages/ui-delivery` and show any app's messages by reference.",
    "No email address or message content is ever shown or sent to the browser.",
    "Keyboard reachable, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.",
]

COMPONENTS = [
    component("MessageStatus", "Component", "One line about the email for a reference: on its way, sent, or couldn't be sent.",
        [("reference", "string", "The app's reference, for example the document."), ("pendingText", "string, optional", "Shown while queued. Default 'We'll email you a copy.'")],
        ["Loading: nothing shown, so the page does not jump", "Queued: 'We'll email you a copy.'", "Sent: 'A copy is in your email.'", "Failed: 'Email couldn't be sent.'", "None found: nothing shown"],
        ["`GET /messages?reference=…`"]),
]

HOSTED = []

for _e in ENDPOINTS:
    if _e["id"] == "send-message":
        _e["scope"] = "`delivery:write`, on a delegated token only"

MODULE = {
    "slug": "download-and-email-delivery",
    "docsPath": "docs/services/delivery",
    "extraDocs": [],
    "labels": {"flow": "How an email is delivered", "hosted": "Pages provided by an outside service"},
    "notes": {
        "journey": "What a person sees and what the system does when results are delivered, in version 1.",
        "ui": "What the Delivery service ships for apps to use, as the package `packages/ui-delivery`.",
        "hosted": "", "token": "",
        "schema": "The SQL for the Delivery service's tables, in the `delivery` schema. No other service can read them.",
    },
    "overview": {
        "name": "Delivery", "version": "Version 1 · Email through Resend", "status": "Designed, not built", "uiStatus": "UI components built in `@01scale/ui-delivery` 0.1.1, against a stand-in client; the service is designed, not built", "base": BASE,
        "what": [
            "Delivery is the platform service that sends messages to users on an app's behalf. In DocFlow it sends the email that confirms a payment and links back to the results.",
            "An app's server names the user, a template and the template's values; Delivery looks up the user's verified address, fills the template, sends it through Resend and retries if sending fails. Apps never handle email addresses.",
            "In this module the downloads themselves and the success page belong to the DocFlow app: it checks that the order is paid and hands out a 5-minute link to the file. Delivery's part is the email.",
        ],
        "why": [
            {"title": "One way to reach a person", "text": "Every app sends through the same service, with the same templates, retries and records, and MVP2 adds SMS and push behind the same request."},
            {"title": "Addresses stay in Identity", "text": "Apps pass a user ID, never an email address, so personal data is not copied around the platform."},
            {"title": "Sent once, by the server", "text": "Emails are triggered by verified server events and an idempotency key, so a repeated event or a closed browser never duplicates or loses one."},
            {"title": "Trustworthy mail", "text": "Fixed templates, links that can only point at 01scale.com, and a verified sending domain keep the email out of spam and out of phishing."},
        ],
        "scope_in": ["Send the `order_paid` email, in plain text and HTML, through Resend", "Look up the verified address at send time", "Retry 3 times with backoff, then record the failure and announce it", "Show a person the status of their messages", "Cancel and delete a deleted account's messages"],
        "scope_out": ["The success page and secure downloads: the DocFlow app (`MVP1-E7-01`, `MVP1-E7-02`), designed with the DocFlow app shell", "SMS, push and notification preferences: `MVP2-E14`", "Marketing email: not planned"],
        "stories": ["MVP1-E7-01", "MVP1-E7-02", "MVP1-E7-03"],
    },
    "flow": [
        {"who": "Payment", "what": "Marks the order paid from Stripe's verified event and tells DocFlow."},
        {"who": "DocFlow's server", "what": "Calls `POST /messages` with the user, `order_paid`, the document name, amount and the success page's path, keyed by the payment event's ID."},
        {"who": "Delivery", "what": "Records the message `queued` and answers at once."},
        {"who": "Delivery", "what": "Looks up the user's verified address through Identity, renders the template and sends it through Resend from receipts@01scale.com."},
        {"who": "Resend", "what": "Accepts the email for delivery, signed for SPF and DKIM."},
        {"who": "Delivery", "what": "Marks it `sent`; or after 3 failed retries `failed`, and announces `delivery.message.failed`."},
    ],
    "concepts": [
        {"term": "Template", "meaning": "A fixed email with named blanks. Version 1 has one: `order_paid`."},
        {"term": "Idempotency key", "meaning": "A value that makes the same request send only one email, however often it is repeated."},
        {"term": "SPF and DKIM", "meaning": "DNS records that let mailboxes verify an email really came from 01scale.com."},
    ],
    "quickstart": [
        {"title": "Send an email from an app's server", "text": "Name the user and the template; never an address.",
         "lang": "ts", "code": 'await callService("/api/delivery/v1/messages", { onBehalfOf: userId }, {\n  template: "order_paid", reference: `docflow:${documentId}`,\n  data: { document_name: "invoice.pdf", amount: 500, currency: "USD", link_path: `/documents/${documentId}/success` },\n}, { headers: { "Idempotency-Key": paymentEventId } });'},
        {"title": "Show the email's status", "text": "On a page the person is looking at.",
         "lang": "tsx", "code": 'import { MessageStatus } from "@01scale/ui-delivery";\n\n<MessageStatus reference={`docflow:${documentId}`} />'},
    ],
    "env": [
        {"name": "DELIVERY_DATABASE_URL", "value": "Neon connection string for the `delivery_service` role", "secret": "Yes"},
        {"name": "RESEND_API_KEY", "value": "The Resend API key", "secret": "Yes"},
        {"name": "EMAIL_FROM", "value": "`DocFlow <receipts@01scale.com>`, on a domain verified in Resend", "secret": "No"},
        {"name": "IDENTITY_API_URL", "value": "Where Delivery looks up a user's verified email", "secret": "No"},
        {"name": "IDENTITY_JWKS_URL", "value": "`https://01scale.com/api/identity/v1/jwks`", "secret": "No"},
        {"name": "EVENTS_SIGNING_KEY", "value": "32 random bytes, base64", "secret": "Yes"},
    ],
    "openQuestions": [
        "Decided by Nikhil on 20 Nov 2026 (#68): Delivery reads the verified address with Identity `GET /api/identity/v1/users/{userId}`, a service-only endpoint that needs the scope `identity:users.read`. It is designed with Account management (`MVP1-E1-05`, PR #70). The event that triggers an email never carries the address.",
        "Resend can report bounces and complaints by webhook. Version 1 records only whether Resend accepted the email; should a later bounce mark it failed?",
    ],
    "errorSample": problem("unknown_template", "Unknown template", 422, "There is no template called order_shipped."),
    "endpoints": ENDPOINTS,
    "noEndpoint": [
        {"topic": "The success page (MVP1-E7-01)", "how": "DocFlow's page polls the Payment order for up to 30 seconds, then says 'We'll email you when it's ready'. It reads the email's status from `GET /messages`. Designed with the DocFlow app shell."},
        {"topic": "Secure downloads (MVP1-E7-02)", "how": "DocFlow's download endpoint checks ownership and the paid order, then redirects to a 5-minute Upload link and records `delivery.downloaded`. Designed with the DocFlow app shell."},
        {"topic": "Events Delivery announces", "how": "`delivery.message.sent` and `delivery.message.failed`, with `{message_id, app, reference}`."},
        {"topic": "Sending domain (MVP1-E7-03 AC3)", "how": "01scale.com is verified in Resend with its SPF and DKIM DNS records. Setup steps belong in `docs/infra/` when the service is built."},
        {"topic": "AI agents", "how": "`GET /messages` is a tool on Delivery's MCP server. Sending is never offered to agents."},
        {"topic": "Health and contract", "how": "`GET /health` and `GET /openapi.json` from the service template (`MVP1-E0-05`)."},
    ],
    "tables": [MESSAGES, INBOUND],
    "entities": [
        {"name": "Message", "table": "`delivery.messages`", "what": "One email asked for, and whether it was sent.", "relations": "Belongs to one user and one app, by ID and name."},
        {"name": "Processed event", "table": "`delivery.inbound_events`", "what": "A platform event already acted on.", "relations": "Stands alone."},
    ],
    "lifecycles": [{"name": "Message", "text": "`queued` → `sent`, or `failed` after the last retry, or `cancelled` if the account is deleted first."}],
    "otherTables": "The service template also gives Delivery `audit_events`, `idempotency_keys` and `outbound_events`.",
    "notStored": ["Email addresses: looked up at send time.", "The email's content: rebuilt from the template if ever needed.", "File links: emails link to pages on 01scale.com, never to files."],
    "ddl": DDL,
    "queries": [{"title": "Send once (`POST /messages`)", "sql": "insert into delivery.messages (id, owner_id, app, reference, idempotency_key, template)\nvalues ($1, $2, $3, $4, $5, $6)\non conflict (app, idempotency_key) do nothing\nreturning *;  -- no row: already accepted, return the existing message"}],
    "journeys": JOURNEYS,
    "edgeCases": EDGE_CASES,
    "uiRules": UI_RULES,
    "components": COMPONENTS,
    "hostedPages": HOSTED,
    "rules": [
        {"level": "API level: checked on every request before anything is stored", "items": [
            "Only an app's server can send; an idempotency key is required.",
            "Templates are fixed; `data` may hold only the template's fields; links are paths on 01scale.com.",
            "A person sees only their own messages, without addresses or content.",
        ]},
        {"level": "Schema level: enforced by the database, whatever the code does", "items": [
            "One message per app and idempotency key.",
            "A sent message always has Resend's ID and a time; a failed one always has a reason.",
            "Delivery's database login reaches only the `delivery` schema.",
        ]},
        {"level": "Data model level: business rules the service guarantees", "items": [
            "An email is triggered only by a server-side event, never by a browser.",
            "The same event never sends two emails.",
            "No email ever contains a link straight to a file.",
            "Addresses are never stored in Delivery.",
        ]},
    ],
}
