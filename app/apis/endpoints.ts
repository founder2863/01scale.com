// Generated from the API design in docs/epics. Design only: none of these are built yet.
export type Endpoint = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  access: "Public" | "Signed in" | "Admin" | "Service";
  story: string;
};

export type ApiGroup = { tag: string; epic: string; title: string; endpoints: Endpoint[] };

export const apiGroups: ApiGroup[] = [
  {
    "tag": "MVP1",
    "epic": "E0",
    "title": "Foundation",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/audit-events",
        "summary": "List audit events for the signed-in user (admins: all users).",
        "access": "Signed in",
        "story": "MVP1-E0-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/health",
        "summary": "Liveness check for uptime monitors and agents.",
        "access": "Public",
        "story": "MVP1-E0-05"
      },
      {
        "method": "GET",
        "path": "/api/v1/openapi.json",
        "summary": "The OpenAPI 3.1 description of every endpoint.",
        "access": "Public",
        "story": "MVP1-E0-05"
      },
      {
        "method": "GET",
        "path": "/api/v1/api-keys",
        "summary": "List my API keys (name, prefix, scopes, last used). Never returns the secret.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "POST",
        "path": "/api/v1/api-keys",
        "summary": "Create an API key for an agent or script. The secret is shown once.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/api-keys/{keyId}",
        "summary": "Revoke an API key immediately.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      },
      {
        "method": "POST",
        "path": "/api/mcp",
        "summary": "MCP server (Streamable HTTP): the same operations exposed as tools for AI agents.",
        "access": "Signed in",
        "story": "MVP1-E0-06"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E1",
    "title": "Accounts",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/auth/login",
        "summary": "Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE).",
        "access": "Public",
        "story": "MVP1-E1-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/auth/callback",
        "summary": "OIDC redirect target: exchanges the code, creates the app session.",
        "access": "Public",
        "story": "MVP1-E1-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/logout",
        "summary": "End the current session and sign out of the identity provider.",
        "access": "Signed in",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/session",
        "summary": "Who am I: the current session and user, or 401.",
        "access": "Signed in",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/me",
        "summary": "My account: email, joined date, documents processed.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "POST",
        "path": "/api/v1/me/password-change",
        "summary": "Start a password change through the identity provider.",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/me",
        "summary": "Delete my account, files and data (orders kept, anonymized).",
        "access": "Signed in",
        "story": "MVP1-E1-05"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E2",
    "title": "Document upload",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/documents",
        "summary": "Create a document and get a presigned upload URL.",
        "access": "Signed in",
        "story": "MVP1-E2-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/complete-upload",
        "summary": "Confirm the upload; the server verifies the file and queues extraction.",
        "access": "Signed in",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents",
        "summary": "List my documents with status and the next action.",
        "access": "Signed in",
        "story": "MVP1-E2-05"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}",
        "summary": "Get one document.",
        "access": "Signed in",
        "story": "MVP1-E2-05"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E3",
    "title": "Extraction",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/extraction",
        "summary": "Start (or retry) extraction. Safe to call twice.",
        "access": "Signed in",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/extraction",
        "summary": "Extraction job status, for polling.",
        "access": "Signed in",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/fields",
        "summary": "The extracted fields with value, confidence and evidence.",
        "access": "Signed in",
        "story": "MVP1-E3-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/file",
        "summary": "A short-lived link to view the original document.",
        "access": "Signed in",
        "story": "MVP1-E3-04"
      },
      {
        "method": "GET",
        "path": "/api/v1/admin/jobs",
        "summary": "Last 100 extraction jobs with tokens, cost, duration and failure rate.",
        "access": "Admin",
        "story": "MVP1-E3-05"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E4",
    "title": "Human review",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/review",
        "summary": "The review queue: flagged fields first, lowest confidence first.",
        "access": "Signed in",
        "story": "MVP1-E4-01"
      },
      {
        "method": "PATCH",
        "path": "/api/v1/documents/{documentId}/fields/{fieldId}",
        "summary": "Accept, edit or mark a field as not on the document.",
        "access": "Signed in",
        "story": "MVP1-E4-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/review/complete",
        "summary": "Complete the review; rule checks run again on the corrected data.",
        "access": "Signed in",
        "story": "MVP1-E4-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/admin/eval-candidates",
        "summary": "Human corrections waiting for approval as eval cases.",
        "access": "Admin",
        "story": "MVP1-E4-04"
      },
      {
        "method": "POST",
        "path": "/api/v1/admin/eval-candidates/export",
        "summary": "Export approved corrections as ground-truth files.",
        "access": "Admin",
        "story": "MVP1-E4-04"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E5",
    "title": "JSON and CSV output",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/outputs",
        "summary": "The outputs available for a document, and whether download is unlocked.",
        "access": "Signed in",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/outputs/{format}/preview",
        "summary": "Preview the JSON or CSV on screen before paying.",
        "access": "Signed in",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/outputs/{format}/download",
        "summary": "Download an output. Locked until the order is paid.",
        "access": "Signed in",
        "story": "MVP1-E5-03"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E6",
    "title": "Payment",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/orders",
        "summary": "Create an order and a Stripe Checkout session for a document.",
        "access": "Signed in",
        "story": "MVP1-E6-01"
      },
      {
        "method": "POST",
        "path": "/api/v1/webhooks/stripe",
        "summary": "Stripe webhook: marks orders paid, expired or failed.",
        "access": "Service",
        "story": "MVP1-E6-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/orders",
        "summary": "List my orders.",
        "access": "Signed in",
        "story": "MVP1-E6-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/orders/{orderId}",
        "summary": "Get one order, for the payment and success pages to poll.",
        "access": "Signed in",
        "story": "MVP1-E6-03"
      }
    ]
  },
  {
    "tag": "MVP1",
    "epic": "E7",
    "title": "Delivery",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/orders/{orderId}/deliveries",
        "summary": "Delivery attempts for an order (email status).",
        "access": "Signed in",
        "story": "MVP1-E7-03"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E8",
    "title": "Passwordless identity",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/auth/magic-links",
        "summary": "Request a sign-in email. Always answers the same way.",
        "access": "Public",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/magic-links/confirm",
        "summary": "Exchange a magic-link token for a session (deliberate POST).",
        "access": "Public",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/email-codes/verify",
        "summary": "Sign in with the 6-digit code from the same email.",
        "access": "Public",
        "story": "MVP2-E8-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/passkeys/registration-options",
        "summary": "WebAuthn options to register a new passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/v1/passkeys",
        "summary": "Verify the registration and save the passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "GET",
        "path": "/api/v1/passkeys",
        "summary": "List my passkeys.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "PATCH",
        "path": "/api/v1/passkeys/{passkeyId}",
        "summary": "Rename a passkey.",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/passkeys/{passkeyId}",
        "summary": "Remove a passkey (needs recent re-authentication).",
        "access": "Signed in",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/passkeys/authentication-options",
        "summary": "WebAuthn options to sign in with a passkey (no email needed).",
        "access": "Public",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/passkeys/verify",
        "summary": "Verify a passkey assertion and create a session.",
        "access": "Public",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/v1/recovery-codes",
        "summary": "Regenerate recovery codes; the old set stops working.",
        "access": "Signed in",
        "story": "MVP2-E8-05"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/recovery-codes/verify",
        "summary": "Sign in with a single-use recovery code.",
        "access": "Public",
        "story": "MVP2-E8-05"
      },
      {
        "method": "GET",
        "path": "/api/v1/sessions",
        "summary": "List my active sessions with device and last active time.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/sessions/{sessionId}",
        "summary": "Revoke one session.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/sessions",
        "summary": "Sign out everywhere else.",
        "access": "Signed in",
        "story": "MVP2-E8-06"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/reauthentication",
        "summary": "Start re-authentication for a sensitive action.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/v1/auth/reauthentication/verify",
        "summary": "Finish re-authentication; valid for 5 minutes.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/v1/me/email-change",
        "summary": "Ask to change my email (confirmation goes to the new address).",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/v1/me/email-change/confirm",
        "summary": "Confirm the new email address.",
        "access": "Signed in",
        "story": "MVP2-E8-07"
      },
      {
        "method": "GET",
        "path": "/api/v1/admin/migration-report",
        "summary": "Users migrated from Cognito vs not yet migrated.",
        "access": "Admin",
        "story": "MVP2-E8-08"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E9",
    "title": "Multi-document pipeline",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/batches",
        "summary": "Create a batch of up to 10 documents; each file is checked on its own.",
        "access": "Signed in",
        "story": "MVP2-E9-01"
      },
      {
        "method": "POST",
        "path": "/api/v1/batches/{batchId}/process",
        "summary": "Start the pipeline once the uploads are confirmed.",
        "access": "Signed in",
        "story": "MVP2-E9-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/batches",
        "summary": "List my batches.",
        "access": "Signed in",
        "story": "MVP2-E9-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/batches/{batchId}",
        "summary": "Batch status with each document's step and status.",
        "access": "Signed in",
        "story": "MVP2-E9-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/internal/pipeline-events",
        "summary": "Progress events from the Lambda pipeline.",
        "access": "Service",
        "story": "MVP2-E9-02"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E10",
    "title": "LLM as judge",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/admin/quality",
        "summary": "Judge vs human: agreement, confusion matrix, weakest fields (30 days).",
        "access": "Admin",
        "story": "MVP2-E10-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/admin/quality/export",
        "summary": "Export judge/human disagreements as eval candidates.",
        "access": "Admin",
        "story": "MVP2-E10-03"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E11",
    "title": "Enrichment and chat correction",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/enrichment",
        "summary": "Web-sourced vendor metadata with citations.",
        "access": "Signed in",
        "story": "MVP2-E11-02"
      },
      {
        "method": "PATCH",
        "path": "/api/v1/documents/{documentId}/enrichment/{enrichmentId}",
        "summary": "Accept or reject one enrichment value.",
        "access": "Signed in",
        "story": "MVP2-E11-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/documents/{documentId}/chat/messages",
        "summary": "The correction chat history for a document.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/chat/messages",
        "summary": "Ask the correction agent to fix data in plain language.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/proposals/{proposalId}/apply",
        "summary": "Apply a proposed change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/proposals/{proposalId}/reject",
        "summary": "Reject a proposed change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/documents/{documentId}/proposals/{proposalId}/undo",
        "summary": "Undo an applied change.",
        "access": "Signed in",
        "story": "MVP2-E11-03"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E12",
    "title": "Multi-document review and outputs",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/batches/{batchId}/review",
        "summary": "Review state across a batch: flagged fields left per document.",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "PATCH",
        "path": "/api/v1/batches/{batchId}/documents/{documentId}",
        "summary": "Leave a document out of the batch (or put it back).",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "POST",
        "path": "/api/v1/batches/{batchId}/review/complete",
        "summary": "Complete the batch review.",
        "access": "Signed in",
        "story": "MVP2-E12-01"
      },
      {
        "method": "GET",
        "path": "/api/v1/batches/{batchId}/outputs",
        "summary": "The outputs available for a batch.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/batches/{batchId}/outputs/{format}/preview",
        "summary": "Preview the combined JSON or CSV.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/batches/{batchId}/outputs/{format}/download",
        "summary": "Download batch.json, batch.csv or batch.zip.",
        "access": "Signed in",
        "story": "MVP2-E12-02"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E13",
    "title": "Saved payment methods",
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/v1/payment-methods/setup-intents",
        "summary": "Start saving a card (Stripe SetupIntent).",
        "access": "Signed in",
        "story": "MVP2-E13-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/payment-methods",
        "summary": "List my saved cards.",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "PATCH",
        "path": "/api/v1/payment-methods/{paymentMethodId}",
        "summary": "Make a card the default.",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/payment-methods/{paymentMethodId}",
        "summary": "Remove a saved card (needs recent re-authentication).",
        "access": "Signed in",
        "story": "MVP2-E13-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/payments",
        "summary": "Pay for a batch or document with a saved card.",
        "access": "Signed in",
        "story": "MVP2-E13-04"
      },
      {
        "method": "GET",
        "path": "/api/v1/payments",
        "summary": "Payment history, newest first.",
        "access": "Signed in",
        "story": "MVP2-E13-05"
      }
    ]
  },
  {
    "tag": "MVP2",
    "epic": "E14",
    "title": "Notifications",
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/v1/notification-preferences",
        "summary": "My notification settings per channel and event.",
        "access": "Signed in",
        "story": "MVP2-E14-01"
      },
      {
        "method": "PUT",
        "path": "/api/v1/notification-preferences",
        "summary": "Replace my notification settings.",
        "access": "Signed in",
        "story": "MVP2-E14-01"
      },
      {
        "method": "POST",
        "path": "/api/v1/me/phone",
        "summary": "Add a phone number; sends a 6-digit code.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/me/phone/verify",
        "summary": "Verify the phone number.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/me/phone",
        "summary": "Remove my phone number and turn SMS off.",
        "access": "Signed in",
        "story": "MVP2-E14-02"
      },
      {
        "method": "POST",
        "path": "/api/v1/webhooks/sms",
        "summary": "Inbound SMS webhook: handles STOP opt-outs.",
        "access": "Service",
        "story": "MVP2-E14-02"
      },
      {
        "method": "GET",
        "path": "/api/v1/push/public-key",
        "summary": "The VAPID public key for web push.",
        "access": "Public",
        "story": "MVP2-E14-03"
      },
      {
        "method": "POST",
        "path": "/api/v1/push-subscriptions",
        "summary": "Register this device for push notifications.",
        "access": "Signed in",
        "story": "MVP2-E14-03"
      },
      {
        "method": "DELETE",
        "path": "/api/v1/push-subscriptions/{subscriptionId}",
        "summary": "Remove a device.",
        "access": "Signed in",
        "story": "MVP2-E14-03"
      },
      {
        "method": "GET",
        "path": "/api/v1/notifications",
        "summary": "My notification log: each attempt per channel.",
        "access": "Signed in",
        "story": "MVP2-E14-04"
      }
    ]
  }
];
