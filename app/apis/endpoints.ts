// Generated from the API design in docs/epics. Design only: none of these are built yet.
// One group per platform service, plus the gateway and the DocFlow app.
export type Endpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  access: "Public" | "Signed in" | "Admin" | "Service";
  story: string;
};

export type ApiGroup = {
  tag: string;
  epic: string;
  title: string;
  about: string;
  endpoints: Endpoint[];
};

export const apiGroups: ApiGroup[] = [
  {
    "tag": "Platform",
    "epic": "platform",
    "title": "Every service",
    "about": "Endpoints every service provides, from the shared service template.",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/{service}/v1/audit-events",
        "summary": "List my audit events in that service (admins: all users).",
        "access": "Signed in",
        "story": "MVP1-E0-02"
      },
      {
        "method": "GET",
        "path": "/api/{service}/v1/health",
        "summary": "Liveness check for that service.",
        "access": "Public",
        "story": "MVP1-E0-05"
      },
      {
        "method": "GET",
        "path": "/api/{service}/v1/openapi.json",
        "summary": "That service's OpenAPI 3.1 contract.",
        "access": "Public",
        "story": "MVP1-E0-05"
      },
      {
        "method": "POST",
        "path": "/api/{service}/mcp",
        "summary": "That service's MCP server: its operations exposed as tools for AI agents.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      }
    ]
  },
  {
    "tag": "Platform",
    "epic": "gateway",
    "title": "Gateway",
    "about": "The single front door at 01scale.com: routes each request to the service that owns it.",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/health",
        "summary": "Health of the platform: the gateway and each service behind it.",
        "access": "Public",
        "story": "MVP1-E0-08"
      },
      {
        "method": "GET",
        "path": "/api/openapi.json",
        "summary": "One combined OpenAPI document for every service.",
        "access": "Public",
        "story": "MVP1-E0-08"
      },
      {
        "method": "POST",
        "path": "/api/mcp",
        "summary": "One combined MCP server: every service's tools, namespaced by service.",
        "access": "Signed in",
        "story": "MVP1-E0-08"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "identity",
    "title": "Identity",
    "about": "Sign-in, sessions, accounts, API keys and the tokens every other service trusts.",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/identity/v1/api-keys",
        "summary": "List my API keys (name, prefix, scopes, last used). Never returns the secret.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/api-keys",
        "summary": "Create an API key for an agent or script. The secret is shown once.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/api-keys/{keyId}",
        "summary": "Revoke an API key immediately.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/auth/login",
        "summary": "Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE).",
        "access": "Public",
        "story": "MVP1-E1-02"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/auth/callback",
        "summary": "OIDC redirect target: exchanges the code and creates the session.",
        "access": "Public",
        "story": "MVP1-E1-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/logout",
        "summary": "End the current session and sign out of the identity provider.",
        "access": "Signed in",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/session",
        "summary": "Who am I: the current session and user, or 401.",
        "access": "Signed in",
        "story": "MVP1-E1-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/token",
        "summary": "Exchange a session cookie or API key for a short-lived access token (called by the gateway).",
        "access": "Service",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/jwks",
        "summary": "The public keys services use to verify access tokens.",
        "access": "Public",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/me",
        "summary": "My account: email and joined date.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/password-change",
        "summary": "Start a password change through the identity provider.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/me",
        "summary": "Delete my account. Every service then deletes that user's data.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/magic-links",
        "summary": "Request a sign-in email. Always answers the same way.",
        "access": "Public",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/magic-links/confirm",
        "summary": "Exchange a magic-link token for a session (deliberate POST).",
        "access": "Public",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/email-codes/verify",
        "summary": "Sign in with the 6-digit code from the same email.",
        "access": "Public",
        "story": "MVP2-E8-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/passkeys/registration-options",
        "summary": "WebAuthn options to register a new passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/passkeys",
        "summary": "Verify the registration and save the passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/passkeys",
        "summary": "List my passkeys.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "PATCH",
        "path": "/api/identity/v1/passkeys/{passkeyId}",
        "summary": "Rename a passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/passkeys/{passkeyId}",
        "summary": "Remove a passkey (needs recent re-authentication).",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/passkeys/authentication-options",
        "summary": "WebAuthn options to sign in with a passkey (no email needed).",
        "access": "Public",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/passkeys/verify",
        "summary": "Verify a passkey assertion and create a session.",
        "access": "Public",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/recovery-codes",
        "summary": "Regenerate recovery codes; the old set stops working.",
        "access": "Signed in",
        "story": "MVP2-E8-05"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/recovery-codes/verify",
        "summary": "Sign in with a single-use recovery code.",
        "access": "Public",
        "story": "MVP2-E8-05"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/sessions",
        "summary": "List my active sessions with device and last active time.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/sessions/{sessionId}",
        "summary": "Revoke one session.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/sessions",
        "summary": "Sign out everywhere else.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/reauthentication",
        "summary": "Start re-authentication for a sensitive action.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/reauthentication/verify",
        "summary": "Finish re-authentication; valid for 5 minutes.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/email-change",
        "summary": "Ask to change my email (confirmation goes to the new address).",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/email-change/confirm",
        "summary": "Confirm the new email address.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/admin/migration-report",
        "summary": "Users migrated from Cognito vs not yet migrated.",
        "access": "Admin",
        "story": "MVP2-E8-08"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/phone",
        "summary": "Add a phone number; sends a 6-digit code.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/phone/verify",
        "summary": "Verify the phone number.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/me/phone",
        "summary": "Remove my phone number.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "upload",
    "title": "Upload",
    "about": "Secure file intake and storage with short-lived links.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/upload/v1/files",
        "summary": "Create a file record and get a presigned upload URL.",
        "access": "Signed in",
        "story": "MVP1-E2-02"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files/{fileId}",
        "summary": "Get one file's details and status.",
        "access": "Signed in",
        "story": "MVP1-E2-02"
      },
      {
        "method": "DELETE",
        "path": "/api/upload/v1/files/{fileId}",
        "summary": "Delete a file and its stored object.",
        "access": "Signed in",
        "story": "MVP1-E2-02"
      },
      {
        "method": "POST",
        "path": "/api/upload/v1/files/{fileId}/complete",
        "summary": "Confirm the upload; the service verifies the stored file.",
        "access": "Signed in",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files/{fileId}/download-url",
        "summary": "A short-lived link to read the file.",
        "access": "Signed in",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files",
        "summary": "List my files.",
        "access": "Signed in",
        "story": "MVP1-E2-05"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "extraction",
    "title": "LLM Extraction",
    "about": "Turns a file into structured fields with confidence and evidence.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/extraction/v1/jobs",
        "summary": "Start an extraction job for a file. Safe to call twice.",
        "access": "Signed in",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}",
        "summary": "Extraction job status, for polling.",
        "access": "Signed in",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}/fields",
        "summary": "The extracted fields with value, confidence and evidence.",
        "access": "Signed in",
        "story": "MVP1-E3-02"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/validations",
        "summary": "Run the rule checks for a schema on a set of values.",
        "access": "Signed in",
        "story": "MVP1-E3-03"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/admin/jobs",
        "summary": "Last 100 jobs with tokens, cost, duration and failure rate.",
        "access": "Admin",
        "story": "MVP1-E3-05"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/job-groups",
        "summary": "Run several extraction jobs as one group with a concurrency limit.",
        "access": "Signed in",
        "story": "MVP2-E9-02"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/job-groups/{groupId}",
        "summary": "Group status with each job's current step.",
        "access": "Signed in",
        "story": "MVP2-E9-02"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}/enrichment",
        "summary": "Web-sourced vendor metadata with citations for a job.",
        "access": "Signed in",
        "story": "MVP2-E11-01"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "review",
    "title": "Human Review",
    "about": "A person checks the fields the system is unsure about.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/review/v1/tasks",
        "summary": "Create a review task from a set of fields.",
        "access": "Signed in",
        "story": "MVP1-E4-01"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/tasks/{taskId}",
        "summary": "The review queue: flagged fields first, lowest confidence first.",
        "access": "Signed in",
        "story": "MVP1-E4-01"
      },
      {
        "method": "PATCH",
        "path": "/api/review/v1/tasks/{taskId}/fields/{fieldId}",
        "summary": "Accept, edit or mark a field as not on the document.",
        "access": "Signed in",
        "story": "MVP1-E4-02"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/complete",
        "summary": "Complete the task once every flagged field is resolved.",
        "access": "Signed in",
        "story": "MVP1-E4-03"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/admin/eval-candidates",
        "summary": "Human corrections waiting for approval as eval cases.",
        "access": "Admin",
        "story": "MVP1-E4-04"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/admin/eval-candidates/export",
        "summary": "Export approved corrections as ground-truth files.",
        "access": "Admin",
        "story": "MVP1-E4-04"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/admin/quality",
        "summary": "Judge vs human: agreement, confusion matrix, weakest fields (30 days).",
        "access": "Admin",
        "story": "MVP2-E10-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/admin/quality/export",
        "summary": "Export judge/human disagreements as eval candidates.",
        "access": "Admin",
        "story": "MVP2-E10-03"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/tasks/{taskId}/chat/messages",
        "summary": "The correction chat history for a task.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/chat/messages",
        "summary": "Ask the correction agent to fix data in plain language.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/apply",
        "summary": "Apply a proposed change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/reject",
        "summary": "Reject a proposed change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/undo",
        "summary": "Undo an applied change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "payment",
    "title": "Payment",
    "about": "Orders, checkout and payment status.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/payment/v1/orders",
        "summary": "Create an order and a Stripe Checkout session. Called by an app's server, never the browser.",
        "access": "Service",
        "story": "MVP1-E6-01"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/webhooks/stripe",
        "summary": "Stripe webhook: marks orders paid, expired or failed.",
        "access": "Service",
        "story": "MVP1-E6-02"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/orders",
        "summary": "List my orders.",
        "access": "Signed in",
        "story": "MVP1-E6-03"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/orders/{orderId}",
        "summary": "Get one order, for payment and success pages to poll.",
        "access": "Signed in",
        "story": "MVP1-E6-03"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/payment-methods/setup-intents",
        "summary": "Start saving a card (Stripe SetupIntent).",
        "access": "Signed in",
        "story": "MVP2-E13-02"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/payment-methods",
        "summary": "List my saved cards.",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "PATCH",
        "path": "/api/payment/v1/payment-methods/{paymentMethodId}",
        "summary": "Make a card the default.",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "DELETE",
        "path": "/api/payment/v1/payment-methods/{paymentMethodId}",
        "summary": "Remove a saved card (needs recent re-authentication).",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/payments",
        "summary": "Charge a saved card. Called by an app's server, which sets the amount.",
        "access": "Service",
        "story": "MVP2-E13-04"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/payments",
        "summary": "Payment history, newest first.",
        "access": "Signed in",
        "story": "MVP2-E13-05"
      }
    ]
  },
  {
    "tag": "Service",
    "epic": "delivery",
    "title": "Delivery",
    "about": "Email and, later, SMS and push notifications.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/delivery/v1/messages",
        "summary": "Send a templated email to a user. Called by an app's server.",
        "access": "Service",
        "story": "MVP1-E7-03"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/messages",
        "summary": "My messages and their delivery status.",
        "access": "Signed in",
        "story": "MVP1-E7-03"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/notification-preferences",
        "summary": "My notification settings per channel and event.",
        "access": "Signed in",
        "story": "MVP2-E14-01"
      },
      {
        "method": "PUT",
        "path": "/api/delivery/v1/notification-preferences",
        "summary": "Replace my notification settings.",
        "access": "Signed in",
        "story": "MVP2-E14-01"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/webhooks/sms",
        "summary": "Inbound SMS webhook: handles STOP opt-outs.",
        "access": "Service",
        "story": "MVP2-E14-02"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/push/public-key",
        "summary": "The VAPID public key for web push.",
        "access": "Public",
        "story": "MVP2-E14-03"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/push-subscriptions",
        "summary": "Register this device for push notifications.",
        "access": "Signed in",
        "story": "MVP2-E14-03"
      },
      {
        "method": "DELETE",
        "path": "/api/delivery/v1/push-subscriptions/{subscriptionId}",
        "summary": "Remove a device.",
        "access": "Signed in",
        "story": "MVP2-E14-03"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/notifications",
        "summary": "Notify a user about an event on every channel they have enabled. Called by an app's server.",
        "access": "Service",
        "story": "MVP2-E14-04"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/notifications",
        "summary": "My notification log: each attempt per channel.",
        "access": "Signed in",
        "story": "MVP2-E14-04"
      }
    ]
  },
  {
    "tag": "App",
    "epic": "docflow",
    "title": "DocFlow",
    "about": "The first app: the invoice process assembled from the platform services.",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/docflow/v1/webhooks/{service}",
        "summary": "Receives signed events from platform services and moves the process forward.",
        "access": "Service",
        "story": "MVP1-E0-09"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/stats",
        "summary": "My DocFlow totals for the account page.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents",
        "summary": "Start the DocFlow process for one invoice: creates the document and its upload.",
        "access": "Signed in",
        "story": "MVP1-E2-02"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/upload-complete",
        "summary": "Confirm the upload and start extraction.",
        "access": "Signed in",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents",
        "summary": "List my DocFlow documents with status and the next action.",
        "access": "Signed in",
        "story": "MVP1-E2-05"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}",
        "summary": "Get one DocFlow document and the IDs of its parts in each service.",
        "access": "Signed in",
        "story": "MVP1-E2-05"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/retry-extraction",
        "summary": "Retry a failed extraction for a document.",
        "access": "Signed in",
        "story": "MVP1-E3-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/complete-review",
        "summary": "Finish review for a document: re-checks the corrected data and builds the outputs.",
        "access": "Signed in",
        "story": "MVP1-E4-03"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs",
        "summary": "The outputs available for a document, and whether download is unlocked.",
        "access": "Signed in",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/preview",
        "summary": "Preview the JSON or CSV on screen before paying.",
        "access": "Signed in",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/download",
        "summary": "Download an output. Locked until the order is paid.",
        "access": "Signed in",
        "story": "MVP1-E5-03"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/checkout",
        "summary": "Start payment for a document.",
        "access": "Signed in",
        "story": "MVP1-E6-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches",
        "summary": "Create a batch of up to 10 documents; each file is checked on its own.",
        "access": "Signed in",
        "story": "MVP2-E9-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/process",
        "summary": "Start extraction for the batch once the uploads are confirmed.",
        "access": "Signed in",
        "story": "MVP2-E9-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches",
        "summary": "List my batches.",
        "access": "Signed in",
        "story": "MVP2-E9-03"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}",
        "summary": "Batch status with each document's step and status.",
        "access": "Signed in",
        "story": "MVP2-E9-03"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/review",
        "summary": "Review state across a batch: flagged fields left per document.",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "PATCH",
        "path": "/api/docflow/v1/batches/{batchId}/documents/{documentId}",
        "summary": "Leave a document out of the batch (or put it back).",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/complete-review",
        "summary": "Complete the batch review and build the batch outputs.",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs",
        "summary": "The outputs available for a batch.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs/{format}/preview",
        "summary": "Preview the combined JSON or CSV.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs/{format}/download",
        "summary": "Download batch.json, batch.csv or batch.zip.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/pay",
        "summary": "Pay for a batch with my default card in one tap.",
        "access": "Signed in",
        "story": "MVP2-E13-04"
      }
    ]
  }
];
