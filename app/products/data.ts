// Generated from docs/epics/*.md. One entry per product module. Design only: nothing here is built yet.
export const products = [
  {
    "slug": "login-using-aws",
    "number": 1,
    "title": "Login using AWS",
    "group": "MVP1",
    "service": "Identity",
    "description": "Sign up, sign in and password reset with AWS Cognito, integrated through standard OIDC.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E1",
      "title": "Accounts with AWS Cognito",
      "goal": "users can create and manage an account securely, through OIDC so the provider can be swapped in MVP2."
    },
    "stories": [
      {
        "id": "MVP1-E1-01",
        "title": "Cognito user pool setup",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The user pool uses email as the username, requires a verified email and has a password policy of at least 12 characters with a mix of character types."
          },
          {
            "label": "AC2",
            "text": "Managed login is enabled and branded with the 01scale name, using an app client with the authorization code flow + PKCE and callback/logout URLs for production and localhost."
          },
          {
            "label": "AC3",
            "text": "The configuration is documented in `docs/infra/cognito.md`, with screenshots or CLI commands, so it can be rebuilt."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP1-E1-02",
        "title": "Sign up with email verification",
        "size": "M",
        "pending": "",
        "story": "As a new user, I want to sign up with my email and password so I can use DocFlow.",
        "acs": [
          {
            "label": "AC1",
            "text": "Given I'm signed out, when I choose \"Sign up\", then I'm taken to Cognito managed login's sign-up screen."
          },
          {
            "label": "AC2",
            "text": "Given I submit a valid email and password, when Cognito sends a verification code and I enter it, then I land on `/documents` signed in."
          },
          {
            "label": "AC3",
            "text": "Given I haven't verified my email, then I can't reach any protected page."
          },
          {
            "label": "AC4",
            "text": "On the first sign-in, a `users` row is created with `cognito_sub` and email, and `auth.signup` is audited."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP1-E1-03",
        "title": "Sign in and sign out",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Sign-in uses the OIDC authorization code flow with PKCE and `state`/`nonce` checks via `openid-client`; a mismatch is rejected."
          },
          {
            "label": "AC2",
            "text": "After sign-in, the app creates its own session cookie (HttpOnly, Secure, SameSite=Lax). Cognito tokens stay on the server and never reach browser JavaScript."
          },
          {
            "label": "AC3",
            "text": "Sign-out clears the app session and calls Cognito's logout endpoint, so the next sign-in shows the login form."
          },
          {
            "label": "AC4",
            "text": "`auth.signin` and `auth.signout` are audited."
          },
          {
            "label": "AC5",
            "text": "A registered service or app can sign in as itself with a client secret, and a service allowed to act for users can exchange its token for a 5-minute token for one user, carrying `act` (decision on #24, `docs/decisions/MVP1-E1.md`). Delegated tokens never carry Identity scopes."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP1-E1-04",
        "title": "Forgot and reset password",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Given I choose \"Forgot password\", when I enter my email, then Cognito sends a reset code. The page says the same thing whether or not the account exists."
          },
          {
            "label": "AC2",
            "text": "Given a valid code and a new password that meets the policy, then I can sign in with the new password, and my old app sessions are invalidated."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP1-E1-06",
        "title": "Route protection",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Middleware redirects signed-out users from `/documents`, `/review`, `/pay`, `/success` and `/account` to sign-in, and returns them to the page they asked for afterwards."
          },
          {
            "label": "AC2",
            "text": "The gateway returns 401 without a valid session or API key. Each service verifies the access token itself and returns 404 (not 403) for other users' resources, so IDs can't be probed."
          }
        ],
        "evals": "",
        "service": "Gateway and service template"
      },
      {
        "id": "MVP1-E1-07",
        "title": "Branded sign-in page and address",
        "size": "S",
        "pending": "Not needed for the first working login; build after `MVP1-E1-03`.",
        "story": "As a visitor, I want the sign-in page to look like 01scale and live on a 01scale address, so I trust it with my password.",
        "acs": [
          {
            "label": "AC1",
            "text": "The Cognito managed login pages show the 01scale name, logo and brand blue `#0b00bf`, in light and dark mode, on phone and desktop."
          },
          {
            "label": "AC2",
            "text": "The sign-in page is served from `https://auth.01scale.com` with a valid certificate (AWS Certificate Manager in `us-east-1`, plus the DNS records for 01scale.com). The `amazoncognito.com` address is no longer shown to users."
          },
          {
            "label": "AC3",
            "text": "Verification and password-reset emails come from a 01scale sender address through Amazon SES, with 01scale wording, and pass SPF and DKIM. The 50-emails-a-day limit of the default sender no longer applies."
          },
          {
            "label": "AC4",
            "text": "The change is configuration only: `COGNITO_DOMAIN` is updated and no Identity code or API contract changes. Sign-in, sign-out and password reset are re-tested end to end."
          },
          {
            "label": "AC5",
            "text": "`docs/infra/cognito.md` is updated with the steps so the setup can be rebuilt."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP1-E1-08",
        "title": "Sign in with Google",
        "size": "M",
        "pending": "Not in the first version of login; build after `MVP1-E1-03`.",
        "story": "As a user, I want to sign in with my Google account so I don't need another password.",
        "acs": [
          {
            "label": "AC1",
            "text": "The sign-in page shows \"Continue with Google\". Choosing it signs me in through Google and returns me to the page I asked for."
          },
          {
            "label": "AC2",
            "text": "Google is added as an identity provider on the Cognito user pool, using an OAuth client from a Google Cloud project with the scopes `openid`, `email` and `profile`. Google's client secret is stored only in AWS."
          },
          {
            "label": "AC3",
            "text": "One person is one user: when Google reports a verified email that matches an existing 01scale user, I am signed in to that same user and keep my documents. An unverified Google email is refused."
          },
          {
            "label": "AC4",
            "text": "A first-time Google user gets a new 01scale user without a separate email verification step, because Google has already verified the email."
          },
          {
            "label": "AC5",
            "text": "`auth.signup` and `auth.signin` audit events record `provider: google`."
          },
          {
            "label": "AC6",
            "text": "No other service or app changes: sessions, access tokens and `GET /session` are identical whichever way the user signed in."
          },
          {
            "label": "AC7",
            "text": "The Google Cloud and Cognito steps are added to `docs/infra/cognito.md`."
          }
        ],
        "evals": "",
        "service": "Identity"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/identity/v1/auth/login",
        "access": "Public",
        "summary": "Start sign-in or sign-up: redirects to the identity provider (OIDC + PKCE).",
        "detail": "Query `mode=signin|signup`, `return_to` (same-origin path only) → `302` to Cognito managed login. Stores `state`, `nonce` and the PKCE verifier in a short-lived HttpOnly cookie.",
        "story": "MVP1-E1-02"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/auth/callback",
        "access": "Public",
        "summary": "OIDC redirect target: exchanges the code and creates the session.",
        "detail": "Query `code`, `state` → `302` to `return_to` with the session cookie set. Errors: `400` on `state`/`nonce` mismatch or unverified email.",
        "story": "MVP1-E1-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/logout",
        "access": "Signed in",
        "summary": "End the current session and sign out of the identity provider.",
        "detail": "→ `200 {logout_url}` (the client follows it to clear the provider session).",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/session",
        "access": "Signed in",
        "summary": "Who am I: the current session and user, or 401.",
        "detail": "→ `200 {user: {id, email}, session: {expires_at}, auth: \"session\"|\"api_key\", scopes[]}`. Errors: `401`.",
        "story": "MVP1-E1-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/token",
        "access": "Service",
        "summary": "Exchange a session cookie or API key for a short-lived access token (called by the gateway).",
        "detail": "→ `200 {access_token, expires_in: 300}`. The token is a signed JWT with `sub`, `scopes`, `is_admin`, `aud` and `auth` (`session`, `api_key`, `service` or `delegated`). Also: `grant_type: client_credentials` (`client_id`, `client_secret`) → a service token with `app`; and `grant_type: urn:ietf:params:oauth:grant-type:token-exchange` with a service token and `on_behalf_of` → a delegated token with `act`. Errors: `401`, `403 delegation_not_allowed`, `404 user_not_found`.",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/jwks",
        "access": "Public",
        "summary": "The public keys services use to verify access tokens.",
        "detail": "→ `200` JWKS. Cacheable; keys rotate with overlap so old tokens stay valid until they expire.",
        "story": "MVP1-E1-03"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/auth/login",
        "access": "Public",
        "summary": "gains an optional query parameter `provider=google`, which sends the browser straight to Google instead of showing the sign-in page first.",
        "detail": "Any other value returns `422 invalid_provider`. Omitted means the sign-in page, as today.",
        "story": "MVP1-E1-08"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E1-01",
        "text": "No endpoints; infrastructure only."
      },
      {
        "story": "MVP1-E1-02",
        "text": "Sign-up shares the callback in E1-03."
      },
      {
        "story": "MVP1-E1-04",
        "text": "No endpoint of ours: Cognito managed login hosts the forgot-password screens. On the next `GET /api/identity/v1/auth/callback`, sessions created before the token's `auth_time` are revoked."
      },
      {
        "story": "MVP1-E1-06",
        "text": "No new endpoints. The gateway turns a session cookie or API key into an access token (`POST /api/identity/v1/token`) and forwards it. Every service verifies the token itself against `GET /api/identity/v1/jwks`, returns `401` without one and `404` for other users' resources."
      },
      {
        "story": "MVP1-E1-07",
        "text": "No new endpoints and no contract change. The `Location` returned by `GET /api/identity/v1/auth/login` and the `logout_url` from `POST /api/identity/v1/auth/logout` now point at `auth.01scale.com`."
      },
      {
        "story": "MVP1-E1-08",
        "text": "`GET /api/identity/v1/auth/callback` is unchanged for callers. Internally it now accepts ID tokens for federated users and applies the linking rule in AC3."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E1-01",
        "title": "Cognito user pool setup",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E1-02",
        "title": "Sign up with email verification",
        "text": "`identity.users` (id, cognito_sub unique, email unique (case-insensitive), email_verified_at, is_admin boolean default false, created_at)."
      },
      {
        "story": "MVP1-E1-03",
        "title": "Sign in and sign out",
        "text": "`identity.sessions` (id, user_id → users, token_hash unique, created_at, expires_at, revoked_at). `identity.signing_keys` (kid, public_jwk, private_key_encrypted, created_at, retired_at) for access tokens. The cookie holds a random token; only its SHA-256 hash is stored. Cognito tokens are not stored. `identity.service_clients` (id, secret_hash unique, scopes, act_scopes, created_at, rotated_at, revoked_at): registered services and apps, added only by migrations."
      },
      {
        "story": "MVP1-E1-04",
        "title": "Forgot and reset password",
        "text": "No schema change; sets `identity.sessions.revoked_at`."
      },
      {
        "story": "MVP1-E1-06",
        "title": "Route protection",
        "text": "No schema change. Every query on a user-owned table filters by `owner_id` in the data-access layer, not in the route."
      },
      {
        "story": "MVP1-E1-07",
        "title": "Branded sign-in page and address",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E1-08",
        "title": "Sign in with Google",
        "text": "`identity.user_logins` (id, user_id → users on delete cascade, provider `cognito|google`, subject, created_at; unique (`provider`, `subject`)). Cognito gives a federated user a different ID from the same person's password account, so one user can now have several logins. Sign-in looks up `user_logins` by provider and subject; if none matches, it links by verified email or creates a user. `identity.users.cognito_sub` is migrated into `user_logins` and dropped."
      }
    ]
  },
  {
    "slug": "account-management",
    "number": 2,
    "title": "Account management",
    "group": "MVP1",
    "service": "Identity",
    "description": "An account page to view and update your details, delete your account, and create API keys for AI agents.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E1",
      "title": "Accounts with AWS Cognito",
      "goal": "users can create and manage an account securely, through OIDC so the provider can be swapped in MVP2."
    },
    "stories": [
      {
        "id": "MVP1-E1-05",
        "title": "Account page",
        "size": "M",
        "pending": "",
        "story": "As a user, I want to see and manage my account.",
        "acs": [
          {
            "label": "AC1",
            "text": "`/account` shows my email, when I joined, how many documents I've processed and my orders."
          },
          {
            "label": "AC2",
            "text": "\"Change password\" goes through Cognito's flow, and I come back to `/account` with a success message."
          },
          {
            "label": "AC3",
            "text": "\"Delete account\" requires typing `DELETE`. It then deletes the Cognito user, my S3 objects and my database rows (orders are kept, anonymized, for records) and signs me out. `auth.account_deleted` is audited."
          }
        ],
        "evals": "",
        "service": "Identity; the account page is composed by the DocFlow app"
      },
      {
        "id": "MVP1-E0-06",
        "title": "Agent access: API keys and MCP",
        "size": "M",
        "pending": "",
        "story": "As an AI agent acting for a user, I want to authenticate without a browser and discover what I can do.",
        "acs": [
          {
            "label": "AC1",
            "text": "A signed-in user can create, list and revoke API keys on `/account/api-keys`. The secret (`sk_01s_…`) is shown once; only its hash is stored, in Identity."
          },
          {
            "label": "AC2",
            "text": "`Authorization: Bearer <key>` is accepted by the gateway wherever a session cookie is, limited to the key's scopes (`upload:read`, `upload:write`, `extraction:read`, …). Keys can never manage keys, change the password or delete the account."
          },
          {
            "label": "AC3",
            "text": "Every service has an MCP server at `POST /api/{service}/mcp` exposing its operations as tools with the same names, inputs and outputs as its OpenAPI document. A test fails if an operation tagged `agent` has no matching tool."
          },
          {
            "label": "AC4",
            "text": "Every API-key and MCP call is audited with `actor_type: api_key` and the key ID."
          },
          {
            "label": "AC5",
            "text": "Payment still needs a human: an agent receives a `checkout_url` for the user to open and cannot complete payment itself."
          }
        ],
        "evals": "",
        "service": "Identity, plus every service"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/identity/v1/me",
        "access": "Signed in",
        "summary": "My account: email and joined date.",
        "detail": "→ `200 {id, email, created_at}`.",
        "story": "MVP1-E1-05"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/password-change",
        "access": "Signed in",
        "summary": "Start a password change through the identity provider.",
        "detail": "→ `200 {redirect_url}`; the provider returns the user to `/account?password_changed=1`. Session only.",
        "story": "MVP1-E1-05"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/me",
        "access": "Signed in",
        "summary": "Delete my account.",
        "detail": "Every service then deletes that user's data. Body `{confirm: \"DELETE\"}` → `202`, session cleared. Emits `identity.user.deleted`; each service deletes or anonymizes its own rows. Session only. Errors: `422`.",
        "story": "MVP1-E1-05"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/stats",
        "access": "Signed in",
        "summary": "My DocFlow totals for the account page.",
        "detail": "→ `200 {documents_processed}`.",
        "story": "MVP1-E1-05"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/api-keys",
        "access": "Signed in",
        "summary": "List my API keys (name, prefix, scopes, last used).",
        "detail": "Never returns the secret. → `200 {data: [ApiKey]}`.",
        "story": "MVP1-E0-06"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/api-keys",
        "access": "Signed in",
        "summary": "Create an API key for an agent or script.",
        "detail": "The secret is shown once. Body `{name, scopes[], expires_at?}` → `201 {api_key, secret}`. Session only: a key cannot create keys. Errors: `422`.",
        "story": "MVP1-E0-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/api-keys/{keyId}",
        "access": "Signed in",
        "summary": "Revoke an API key immediately.",
        "detail": "→ `204`. Errors: `404`.",
        "story": "MVP1-E0-06"
      },
      {
        "method": "POST",
        "path": "/api/{service}/mcp",
        "access": "Signed in",
        "summary": "That service's MCP server: its operations exposed as tools for AI agents.",
        "detail": "Streamable HTTP. Tools map 1:1 to the service's OpenAPI `operationId`s and call the same service functions as the REST handlers.",
        "story": "MVP1-E0-06"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E1-05",
        "text": "The account page is composed by the app: it reads `GET /api/identity/v1/me`, `GET /api/docflow/v1/stats` and `GET /api/payment/v1/orders`."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E1-05",
        "title": "Account page",
        "text": "No new tables. Identity deletes the user's rows and emits `identity.user.deleted`; each service deletes its rows for that `owner_id`. Payment keeps orders with `owner_id` set to null."
      },
      {
        "story": "MVP1-E0-06",
        "title": "Agent access: API keys and MCP",
        "text": "`identity.api_keys` (id, user_id → users, name, prefix, key_hash unique, scopes text[], last_used_at, expires_at, revoked_at, created_at). Only the SHA-256 hash of the secret is stored; `prefix` (first 8 characters) is kept for display."
      }
    ]
  },
  {
    "slug": "document-upload",
    "number": 3,
    "title": "Document upload",
    "group": "MVP1",
    "service": "Upload",
    "description": "Upload a file from the browser straight to a private AWS S3 bucket.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E2",
      "title": "Document upload to S3",
      "goal": "files go from the browser straight to a private S3 bucket, safely."
    },
    "stories": [
      {
        "id": "MVP1-E2-01",
        "title": "S3 bucket and IAM",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The bucket has Block Public Access on, encryption on (SSE-S3), versioning off and a lifecycle rule that deletes objects after 30 days."
          },
          {
            "label": "AC2",
            "text": "CORS allows PUT and GET only from `https://01scale.com` and localhost."
          },
          {
            "label": "AC3",
            "text": "The app's IAM credentials allow only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` and `s3:HeadObject` on this bucket, documented in `docs/infra/s3.md`."
          }
        ],
        "evals": "",
        "service": "Upload"
      },
      {
        "id": "MVP1-E2-02",
        "title": "Presigned upload URL",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`POST /api/upload/v1/files` with `{file_name, mime, size}` returns a presigned PUT URL valid for 5 minutes, with key `users/{userId}/{fileId}/original.{ext}`."
          },
          {
            "label": "AC2",
            "text": "Requests for file types other than PDF/PNG/JPG, or over 10 MB, are rejected with a clear message before any URL is issued."
          },
          {
            "label": "AC3",
            "text": "A file record is created with status `pending_upload`."
          }
        ],
        "evals": "",
        "service": "Upload; composed by the DocFlow app"
      },
      {
        "id": "MVP1-E2-03",
        "title": "Upload confirmation and checks",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`POST /api/upload/v1/files/{fileId}/complete` confirms the object exists (HeadObject) and its size matches."
          },
          {
            "label": "AC2",
            "text": "The file's first bytes are checked to confirm the real type. A mismatch, or a PDF over 10 pages, marks the file `rejected` and deletes the object."
          },
          {
            "label": "AC3",
            "text": "If it passes, the file's status becomes `ready` and `file.uploaded` is audited. In DocFlow, the app then queues extraction (E3)."
          }
        ],
        "evals": "",
        "service": "Upload; composed by the DocFlow app"
      },
      {
        "id": "MVP1-E2-04",
        "title": "Upload page UI",
        "size": "M",
        "pending": "",
        "story": "As Priya, I want to drag and drop or pick a file on my phone and see progress.",
        "acs": [
          {
            "label": "AC1",
            "text": "Drag and drop on desktop and the file picker on mobile both work, including the camera option on phones."
          },
          {
            "label": "AC2",
            "text": "A progress bar shows upload percentage. On failure I see a retry button and a plain-language error."
          },
          {
            "label": "AC3",
            "text": "After upload, I'm taken to the document's extraction page automatically."
          }
        ],
        "evals": "",
        "service": "Upload (UI component), used by the DocFlow app"
      },
      {
        "id": "MVP1-E2-05",
        "title": "Documents list",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/documents` lists my documents with name, date, status chip (Uploaded / Extracting / Needs review / Ready to pay / Paid) and a link to the next action."
          },
          {
            "label": "AC2",
            "text": "Empty state: \"Upload your first invoice\", with a sample invoice a hiring manager can use."
          }
        ],
        "evals": "",
        "service": "DocFlow app, plus Upload"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/upload/v1/files",
        "access": "Signed in",
        "summary": "Create a file record and get a presigned upload URL.",
        "detail": "Body `{file_name, mime, size, accept?: {mimes[], max_bytes, max_pages}}` → `201 {file, upload: {url, method: \"PUT\", headers, expires_at}}`. Supports `Idempotency-Key`. Errors: `415` wrong type, `413` too large, `422`.",
        "story": "MVP1-E2-02"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files/{fileId}",
        "access": "Signed in",
        "summary": "Get one file's details and status.",
        "detail": "→ `200 {file: {id, file_name, mime, size_bytes, pages, status}}`. Errors: `404` (also for other users' files).",
        "story": "MVP1-E2-02"
      },
      {
        "method": "DELETE",
        "path": "/api/upload/v1/files/{fileId}",
        "access": "Signed in",
        "summary": "Delete a file and its stored object.",
        "detail": "→ `204`.",
        "story": "MVP1-E2-02"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents",
        "access": "Signed in",
        "summary": "Start the DocFlow process for one invoice: creates the document and its upload.",
        "detail": "Body `{file_name, mime, size}` → `201 {document, upload}`. Calls Upload `POST /files` with DocFlow's limits (PDF/PNG/JPG, 10 MB, 10 pages). Supports `Idempotency-Key`.",
        "story": "MVP1-E2-02"
      },
      {
        "method": "POST",
        "path": "/api/upload/v1/files/{fileId}/complete",
        "access": "Signed in",
        "summary": "Confirm the upload; the service verifies the stored file.",
        "detail": "→ `200 {file}` with status `ready` or `rejected` (+ `rejection_reason`). Idempotent. Errors: `404`, `409` if the object is missing or the size differs.",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files/{fileId}/download-url",
        "access": "Signed in",
        "summary": "A short-lived link to read the file.",
        "detail": "Query `filename?`, `disposition=inline|attachment` → `200 {url, expires_at}` (presigned GET, 5 minutes).",
        "story": "MVP1-E2-03"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/upload-complete",
        "access": "Signed in",
        "summary": "Confirm the upload and start extraction.",
        "detail": "→ `200 {document}`. Calls Upload `complete`, then Extraction `POST /jobs`. Idempotent. Errors: `409` if the file was rejected.",
        "story": "MVP1-E2-03"
      },
      {
        "method": "GET",
        "path": "/api/upload/v1/files",
        "access": "Signed in",
        "summary": "List my files.",
        "detail": "Query `status`, `cursor`, `limit` → `200 {data: [File], next_cursor}`.",
        "story": "MVP1-E2-05"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents",
        "access": "Signed in",
        "summary": "List my DocFlow documents with status and the next action.",
        "detail": "Query `status`, `cursor`, `limit` → `200 {data: [Document], next_cursor}`. `Document = {id, file_name, status, next_action: extract|review|results|pay|download, file_id, job_id?, review_task_id?, order_id?}`.",
        "story": "MVP1-E2-05"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}",
        "access": "Signed in",
        "summary": "Get one DocFlow document and the IDs of its parts in each service.",
        "detail": "→ `200 {document}`. Errors: `404`.",
        "story": "MVP1-E2-05"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E2-01",
        "text": "No endpoints; infrastructure only."
      },
      {
        "story": "MVP1-E2-04",
        "text": "No new endpoints. The Upload UI component calls `POST /files`, PUTs the file to S3 and calls `complete`. Inside DocFlow it is pointed at DocFlow's `POST /documents` and `upload-complete` instead."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E2-01",
        "title": "S3 bucket and IAM",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E2-02",
        "title": "Presigned upload URL",
        "text": "`upload.files` (id, owner_id, s3_key, file_name, mime, size_bytes, pages, accept jsonb, status `pending_upload|ready|rejected|deleted`, rejection_reason, created_at). DocFlow: inserts `docflow.documents` with `file_id`."
      },
      {
        "story": "MVP1-E2-03",
        "title": "Upload confirmation and checks",
        "text": "No new tables; sets `upload.files.status`, `pages`, `rejection_reason` and `docflow.documents.status`, `job_id`."
      },
      {
        "story": "MVP1-E2-04",
        "title": "Upload page UI",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E2-05",
        "title": "Documents list",
        "text": "No schema change; indexes `docflow.documents(owner_id, created_at desc)` and `upload.files(owner_id, created_at desc)` for cursor pagination."
      }
    ]
  },
  {
    "slug": "extraction-with-claude",
    "number": 4,
    "title": "Extraction with Claude",
    "group": "MVP1",
    "service": "LLM Extraction",
    "description": "Claude turns a document into structured data, with a confidence score and evidence for every field.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E3",
      "title": "Extraction with Claude",
      "goal": "accurate structured data, with confidence and evidence for every field."
    },
    "stories": [
      {
        "id": "MVP1-E3-01",
        "title": "Extraction job lifecycle",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "A job moves through `queued → processing → extracted | failed`. Each change is stored and visible through `GET /api/extraction/v1/jobs/{jobId}`."
          },
          {
            "label": "AC2",
            "text": "Temporary failures (rate limit, timeout, overload) retry up to 2 times with backoff; after that the job is `failed` with a user-friendly message and a \"Retry\" button."
          },
          {
            "label": "AC3",
            "text": "Jobs are idempotent: calling extract twice for the same document doesn't create two jobs or bill twice."
          }
        ],
        "evals": "",
        "service": "LLM Extraction; composed by the DocFlow app"
      },
      {
        "id": "MVP1-E3-02",
        "title": "Claude extraction call",
        "size": "L",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The document (PDF or image) is sent to Claude as a document or image input along with the versioned prompt `prompts/extract-invoice/v1.md`."
          },
          {
            "label": "AC2",
            "text": "The output is forced into the invoice v1 schema (PRD §9) with a tool/JSON schema. Every field includes `value`, `confidence`, `source_page` and `source_quote`."
          },
          {
            "label": "AC3",
            "text": "The model ID and prompt version are read from configuration and saved on the job."
          },
          {
            "label": "AC4",
            "text": "The response is validated with zod. A schema failure triggers one repair attempt and then fails the job; invalid JSON is never stored."
          }
        ],
        "evals": "EXT-1 schema validity, EXT-2 header field accuracy, EXT-3 line item F1, EXT-4 hallucination rate, EXT-7 latency, EXT-8 cost (see `EVALS.md`).",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP1-E3-03",
        "title": "Rule checks and final confidence",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The arithmetic, date, currency, required-field and source-quote checks (PRD §10) run on every extraction."
          },
          {
            "label": "AC2",
            "text": "Final confidence = the lower of model confidence and rule result (a failed check sets 0.3). Fields under the threshold (default 0.85) or failing a check are marked `flagged`."
          },
          {
            "label": "AC3",
            "text": "Each flagged field stores the reason (\"Total ≠ subtotal + tax\", \"Quote not found in document\")."
          },
          {
            "label": "AC4",
            "text": "Unit tests cover every rule check, including rounding and missing-tax cases."
          }
        ],
        "evals": "EXT-5 routing recall, EXT-6 flag rate.",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP1-E3-04",
        "title": "Extraction page",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "While processing, the page shows status steps and polls every 2 seconds, without a full-page reload."
          },
          {
            "label": "AC2",
            "text": "When done, the document preview (rendered PDF page or image, Upload's `FilePreview` component, decided on #36) is on the left and the fields on the right, with confidence badges (green ≥ 0.85, amber 0.6–0.85, red < 0.6) and flagged fields highlighted."
          },
          {
            "label": "AC3",
            "text": "Tapping a field shows its source quote and page. On desktop, the preview jumps to that page."
          },
          {
            "label": "AC4",
            "text": "A \"Review N flagged fields\" button goes to E4. If nothing is flagged, \"Continue to results\" goes to E5."
          }
        ],
        "evals": "",
        "service": "LLM Extraction (UI component), used by the DocFlow app"
      },
      {
        "id": "MVP1-E3-05",
        "title": "Cost and latency logging",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Each job stores tokens in and out, estimated cost in USD and duration."
          },
          {
            "label": "AC2",
            "text": "An admin-only page `/admin/jobs` shows the last 100 jobs with these numbers and the failure rate."
          }
        ],
        "evals": "",
        "service": "LLM Extraction"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/extraction/v1/jobs",
        "access": "Signed in",
        "summary": "Start an extraction job for a file.",
        "detail": "Safe to call twice. Body `{file_id, schema: \"invoice-v1\", reference?}` → `202 {job}`; returns the existing job if one is active for that file and schema. Emits `extraction.job.completed|failed`. Errors: `404` unknown file, `422` unknown schema.",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}",
        "access": "Signed in",
        "summary": "Extraction job status, for polling.",
        "detail": "→ `200 {job: {id, status: queued|processing|extracted|failed, steps[], error_message?, retryable}}`. Sends `Retry-After: 2` while running.",
        "story": "MVP1-E3-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/retry-extraction",
        "access": "Signed in",
        "summary": "Retry a failed extraction for a document.",
        "detail": "→ `202 {document}`. Errors: `409` unless the last job failed.",
        "story": "MVP1-E3-01"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}/fields",
        "access": "Signed in",
        "summary": "The extracted fields with value, confidence and evidence.",
        "detail": "Query `flagged=true` → `200 {data: [Field]}`; `Field = {id, name, line_index?, value, confidence, model_confidence, source_page, source_quote, flagged, flag_reasons[]}`.",
        "story": "MVP1-E3-02"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/validations",
        "access": "Signed in",
        "summary": "Run the rule checks for a schema on a set of values.",
        "detail": "Body `{schema, values, file_id?}` → `200 {passed, checks: [{name, passed, fields[], message}]}`. Used after extraction and again on corrected data.",
        "story": "MVP1-E3-03"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/admin/jobs",
        "access": "Admin",
        "summary": "Last 100 jobs with tokens, cost, duration and failure rate.",
        "detail": "→ `200 {data: [Job], summary: {failure_rate, avg_cost_usd, p95_duration_ms}}`. Errors: `404` for non-admins.",
        "story": "MVP1-E3-05"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E3-02",
        "text": "Extraction itself has no endpoint: it runs inside the job started in E3-01. The job reads the file through Upload `GET /files/{fileId}/download-url`, forwarding the user's access token."
      },
      {
        "story": "MVP1-E3-04",
        "text": "No new endpoints. The component polls `GET /jobs/{jobId}`, reads `GET /jobs/{jobId}/fields`, and shows the file through Upload `download-url`."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E3-01",
        "title": "Extraction job lifecycle",
        "text": "`extraction.jobs` (id, owner_id, file_id, schema, reference, status `queued|processing|extracted|failed`, attempt, error_code, error_message, started_at, finished_at, created_at). Partial unique index on `(file_id, schema)` where status in (`queued`, `processing`) makes a second active job impossible."
      },
      {
        "story": "MVP1-E3-02",
        "title": "Claude extraction call",
        "text": "`extraction.jobs` adds model, prompt_version. `extraction.fields` (id, job_id → jobs, name, line_index null, value jsonb, model_confidence numeric(3,2), source_page, source_quote, created_at); unique `(job_id, name, line_index)`. These rows are the model's output and are never edited; human changes live in Review."
      },
      {
        "story": "MVP1-E3-03",
        "title": "Rule checks and final confidence",
        "text": "`extraction.fields` adds confidence numeric(3,2), flagged boolean, flag_reasons text[]. Index `extraction.fields(job_id) where flagged`."
      },
      {
        "story": "MVP1-E3-04",
        "title": "Extraction page",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E3-05",
        "title": "Cost and latency logging",
        "text": "`extraction.jobs` adds tokens_in, tokens_out, cost_usd numeric(10,6), duration_ms."
      }
    ]
  },
  {
    "slug": "human-review",
    "number": 5,
    "title": "Human review",
    "group": "MVP1",
    "service": "Human Review",
    "description": "Review only the fields the system is unsure about, with the evidence beside each one.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E4",
      "title": "Human review of low-confidence fields",
      "goal": "a person checks only what the system is unsure about, quickly, with evidence beside each field."
    },
    "stories": [
      {
        "id": "MVP1-E4-01",
        "title": "Review queue",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/documents/{id}/review` lists flagged fields first, ordered by lowest confidence, each with its reason, current value and source quote."
          },
          {
            "label": "AC2",
            "text": "A counter shows \"N of M resolved\". Unflagged fields are available under \"Show all fields\"."
          }
        ],
        "evals": "",
        "service": "Human Review"
      },
      {
        "id": "MVP1-E4-02",
        "title": "Accept, edit or mark not present",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Per field, I can accept, edit (with input checks: dates, numbers, currency code) or mark \"Not on document\"."
          },
          {
            "label": "AC2",
            "text": "Every change stores the original value, the new value, who changed it and when, and audits `review.field_updated`."
          },
          {
            "label": "AC3",
            "text": "On desktop: Enter accepts, E edits, ↓ moves to the next field. On mobile: large tap targets."
          }
        ],
        "evals": "",
        "service": "Human Review"
      },
      {
        "id": "MVP1-E4-03",
        "title": "Complete review",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "\"Complete review\" stays disabled until every flagged field is resolved."
          },
          {
            "label": "AC2",
            "text": "On completion, the rule checks run again on the corrected data. If any still fail, I see which ones and can either fix them or confirm \"Values are correct as on the document\"."
          },
          {
            "label": "AC3",
            "text": "The document status becomes `reviewed`, and I'm taken to results (E5)."
          }
        ],
        "evals": "",
        "service": "Human Review; composed by the DocFlow app"
      },
      {
        "id": "MVP1-E4-04",
        "title": "Corrections feed the eval set",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Each human correction is saved as a candidate eval case (document reference, field, model value, human value) in `eval_candidates`."
          },
          {
            "label": "AC2",
            "text": "Approved corrections stay in Review's database; they are never exported to files or to the repository (Nikhil's decision on #41: the repository is public and one user's data must never be seen by another). Reports built from them show aggregates only, never values. Evals that test new prompts use only the synthetic and licensed datasets in `evals/`."
          }
        ],
        "evals": "",
        "service": "Human Review"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/review/v1/tasks",
        "access": "Signed in",
        "summary": "Create a review task from a set of fields.",
        "detail": "Body `{reference, fields: [{name, line_index?, value, confidence, source_page, source_quote, flagged, flag_reasons[]}]}` → `201 {task}`. Supports `Idempotency-Key`.",
        "story": "MVP1-E4-01"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/tasks/{taskId}",
        "access": "Signed in",
        "summary": "The review queue: flagged fields first, lowest confidence first.",
        "detail": "Query `all=true` → `200 {task: {id, status, resolved, total, can_complete}, fields: [Field]}`.",
        "story": "MVP1-E4-01"
      },
      {
        "method": "PATCH",
        "path": "/api/review/v1/tasks/{taskId}/fields/{fieldId}",
        "access": "Signed in",
        "summary": "Accept, edit or mark a field as not on the document.",
        "detail": "Body `{action: accept|edit|not_present, value?}` → `200 {field}`. Errors: `422` invalid date, number or currency; `409` if the task is locked.",
        "story": "MVP1-E4-02"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/complete",
        "access": "Signed in",
        "summary": "Complete the task once every flagged field is resolved.",
        "detail": "Body `{checks_overridden?: boolean}` → `200 {task, final_values}`. Emits `review.task.completed`. Errors: `409` with `unresolved_fields[]`.",
        "story": "MVP1-E4-03"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/complete-review",
        "access": "Signed in",
        "summary": "Finish review for a document: re-checks the corrected data and builds the outputs.",
        "detail": "Body `{confirm_failed_checks?: boolean}` → `200 {document}`. Calls Extraction `POST /validations`, then Review `complete`. Errors: `409` with `unresolved_fields[]` or `failed_checks[]`.",
        "story": "MVP1-E4-03"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/admin/eval-candidates",
        "access": "Admin",
        "summary": "Human corrections waiting for approval as eval cases.",
        "detail": "Query `status`, `cursor` → `200 {data: [EvalCandidate], next_cursor}`.",
        "story": "MVP1-E4-04"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/admin/eval-candidates/export",
        "access": "Admin",
        "summary": "Export approved corrections as ground-truth files.",
        "detail": "Body `{candidate_ids[]}` → `200 {files: [{name, url}]}`. Only candidates with status `approved` are exported.",
        "story": "MVP1-E4-04"
      }
    ],
    "apiNotes": [],
    "dbNotes": [
      {
        "story": "MVP1-E4-01",
        "title": "Review queue",
        "text": "`review.tasks` (id, owner_id, reference, status `open|completed`, checks_overridden boolean, completed_at, completed_by, created_at). `review.fields` (id, task_id → tasks, kind `extracted`, name, line_index null, original_value jsonb, value jsonb, confidence, source_page, source_quote, flagged, flag_reasons text[], status `pending|accepted|edited|not_present`, updated_by, updated_at). Review holds its own copy of the fields, so it never reads Extraction's tables."
      },
      {
        "story": "MVP1-E4-02",
        "title": "Accept, edit or mark not present",
        "text": "`review.field_changes` (id, field_id → fields, old_value jsonb, new_value jsonb, action, source `review|chat`, changed_by, created_at) keeps the full history so any change can be traced or undone."
      },
      {
        "story": "MVP1-E4-03",
        "title": "Complete review",
        "text": "Sets `review.tasks.status`, `completed_at`, `completed_by`, `checks_overridden` and `docflow.documents.status`."
      },
      {
        "story": "MVP1-E4-04",
        "title": "Corrections feed the eval set",
        "text": "`review.eval_candidates` (id, task_id, reference, field_name, model_value jsonb, human_value jsonb, status `candidate|approved|rejected|exported`, created_at)."
      }
    ]
  },
  {
    "slug": "json-and-csv-output",
    "number": 6,
    "title": "JSON and CSV output",
    "group": "MVP1",
    "service": "DocFlow app",
    "description": "Preview the final JSON, metadata and CSV before paying.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E5",
      "title": "JSON review, metadata and CSV",
      "goal": "clean, trustworthy outputs the user can preview before paying."
    },
    "stories": [
      {
        "id": "MVP1-E5-01",
        "title": "Final JSON with metadata",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The JSON has `data` (the invoice v1 schema with final values) and `metadata`: `document_id`, `file_name`, `pages`, `model`, `prompt_version`, `extracted_at`, `reviewed_at`, `reviewed_by`, `fields_flagged`, `fields_corrected`, and per-field `confidence` and `corrected` flags."
          },
          {
            "label": "AC2",
            "text": "The output is validated against a published JSON Schema in `schemas/invoice-v1.json`."
          },
          {
            "label": "AC3",
            "text": "The JSON preview has syntax highlighting and folding, and works on mobile."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      },
      {
        "id": "MVP1-E5-02",
        "title": "CSV export",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "One row per line item, with invoice-level columns repeated on each row; the header order is documented."
          },
          {
            "label": "AC2",
            "text": "Quoting follows RFC 4180, with UTF-8 encoding and a BOM so Excel opens it correctly."
          },
          {
            "label": "AC3",
            "text": "Cells starting with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` (CSV injection protection), with a unit test."
          },
          {
            "label": "AC4",
            "text": "An invoice with no line items gives one row with empty line columns."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      },
      {
        "id": "MVP1-E5-03",
        "title": "Locked preview",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Before payment, I can see a full preview of both outputs on screen, but download buttons show \"Pay to download\"."
          },
          {
            "label": "AC2",
            "text": "The download endpoints return 402 until the order is paid, enforced on the server."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      },
      {
        "id": "MVP1-E5-04",
        "title": "Store outputs",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "On review completion, `result.json` and `result.csv` are written to `users/{userId}/{docId}/outputs/`."
          },
          {
            "label": "AC2",
            "text": "If the user later edits fields, the outputs are regenerated and the version increments."
          }
        ],
        "evals": "",
        "service": "DocFlow app (files stored through Upload)"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs",
        "access": "Signed in",
        "summary": "The outputs available for a document, and whether download is unlocked.",
        "detail": "→ `200 {version, locked, formats: [\"json\", \"csv\"], generated_at}`.",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/preview",
        "access": "Signed in",
        "summary": "Preview the JSON or CSV on screen before paying.",
        "detail": "`format = json|csv` → `200` with `application/json` (`{data, metadata}`) or `text/csv`, sent `Content-Disposition: inline`.",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/download",
        "access": "Signed in",
        "summary": "Download an output.",
        "detail": "Locked until the order is paid. → `302` to an Upload `download-url` (5 minutes, correct filename). Errors: `402` until the Payment order is `paid`, `404`.",
        "story": "MVP1-E5-03"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E5-02",
        "text": "Served by `GET …/outputs/csv/preview` and `…/download` (E5-01, E5-03)."
      },
      {
        "story": "MVP1-E5-04",
        "text": "No new endpoints. DocFlow builds the files and stores them through Upload `POST /files` with a delegated token for the document's owner (decision on #24); `version` in `GET …/outputs` increments when they are regenerated."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E5-01",
        "title": "Final JSON with metadata",
        "text": "No new tables; the JSON is built from the review task's final values and the job's metadata, both read through their APIs."
      },
      {
        "story": "MVP1-E5-02",
        "title": "CSV export",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E5-03",
        "title": "Locked preview",
        "text": "No schema change; entitlement = the Payment order referenced by `docflow.documents.order_id` has status `paid`."
      },
      {
        "story": "MVP1-E5-04",
        "title": "Store outputs",
        "text": "`docflow.outputs` (id, document_id → documents, version, json_file_id, csv_file_id, created_at); unique `(document_id, version)`. The files themselves are `upload.files` rows owned by the user."
      }
    ]
  },
  {
    "slug": "payment",
    "number": 7,
    "title": "Payment",
    "group": "MVP1",
    "service": "Payment",
    "description": "A one-time payment with Stripe Checkout in test mode.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E6",
      "title": "Payment",
      "goal": "a reliable, secure one-time payment per document."
    },
    "stories": [
      {
        "id": "MVP1-E6-01",
        "title": "Checkout session",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "\"Pay $5.00\" creates a Stripe Checkout session in test mode with `metadata.order_id`, and success/cancel URLs back to the app."
          },
          {
            "label": "AC2",
            "text": "An `orders` row is created with status `pending`. Clicking twice reuses the open session instead of creating a duplicate order."
          },
          {
            "label": "AC3",
            "text": "A banner says \"Test mode — use card 4242 4242 4242 4242, any future date, any CVC\"."
          }
        ],
        "evals": "",
        "service": "Payment; composed by the DocFlow app"
      },
      {
        "id": "MVP1-E6-02",
        "title": "Webhook",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`POST /api/payment/v1/webhooks/stripe` verifies the Stripe signature and rejects invalid ones with 400."
          },
          {
            "label": "AC2",
            "text": "On `checkout.session.completed`, the order becomes `paid`, and `order.paid` is audited."
          },
          {
            "label": "AC3",
            "text": "The handler is idempotent: an event ID already processed returns 200 without changing anything again."
          },
          {
            "label": "AC4",
            "text": "Also handles `checkout.session.expired` (order becomes `expired`) and async payment failure (order becomes `failed`)."
          }
        ],
        "evals": "",
        "service": "Payment"
      },
      {
        "id": "MVP1-E6-03",
        "title": "Payment page and states",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/documents/{id}/pay` shows an order summary: document name, number of fields, price."
          },
          {
            "label": "AC2",
            "text": "Cancel returns here with \"Payment cancelled — you haven't been charged\" and a retry button."
          },
          {
            "label": "AC3",
            "text": "A document that's already paid skips straight to success (E7)."
          }
        ],
        "evals": "",
        "service": "Payment (UI component), used by the DocFlow app"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/payment/v1/orders",
        "access": "Service",
        "summary": "Create an order and a Stripe Checkout session.",
        "detail": "Called by an app's server with a delegated token for the user who pays, never by the browser (decision on #24). Body `{reference, description, amount, currency, success_url, cancel_url}` → `201 {order, checkout_url}`; `200` with the open order for the same `reference`. Emits `payment.order.paid|expired|failed`.",
        "story": "MVP1-E6-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/documents/{documentId}/checkout",
        "access": "Signed in",
        "summary": "Start payment for a document.",
        "detail": "→ `201 {order_id, checkout_url}`. DocFlow sets the price and calls Payment `POST /orders`. Errors: `409` if already paid or not reviewed.",
        "story": "MVP1-E6-01"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/webhooks/stripe",
        "access": "Service",
        "summary": "Stripe webhook: marks orders paid, expired or failed.",
        "detail": "Verifies `Stripe-Signature` → `200`. Already-processed event IDs return `200` with no change. Errors: `400 invalid_stripe_signature`.",
        "story": "MVP1-E6-02"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/orders",
        "access": "Signed in",
        "summary": "List my orders.",
        "detail": "Query `reference`, `status`, `cursor` → `200 {data: [Order], next_cursor}`.",
        "story": "MVP1-E6-03"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/orders/{orderId}",
        "access": "Signed in",
        "summary": "Get one order, for payment and success pages to poll.",
        "detail": "→ `200 {order: {id, reference, description, amount, currency, status: pending|paid|expired|failed}}`.",
        "story": "MVP1-E6-03"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E6-03",
        "text": "The page also calls DocFlow `POST …/checkout` (E6-01)."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E6-01",
        "title": "Checkout session",
        "text": "`payment.orders` (id, owner_id null, app, reference, description, stripe_session_id unique, amount, currency, status `pending|paid|expired|failed`, paid_at, created_at). Partial unique index on `(app, reference)` where status = `pending` prevents duplicate open orders. DocFlow stores the returned ID in `docflow.documents.order_id`."
      },
      {
        "story": "MVP1-E6-02",
        "title": "Webhook",
        "text": "`payment.stripe_events` (event_id primary key, type, processed_at) gives idempotency: insert first, skip if it already exists."
      },
      {
        "story": "MVP1-E6-03",
        "title": "Payment page and states",
        "text": "No schema change."
      }
    ]
  },
  {
    "slug": "download-and-email-delivery",
    "number": 8,
    "title": "Download and email delivery",
    "group": "MVP1",
    "service": "Delivery",
    "description": "Get the files immediately by secure download, with a copy by email.",
    "status": "Designed",
    "detailed": true,
    "epic": {
      "id": "E7",
      "title": "Success, download and email",
      "goal": "the user gets their files immediately and has a record by email."
    },
    "stories": [
      {
        "id": "MVP1-E7-01",
        "title": "Success page",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "On return from Stripe, the page polls the order status (up to 30 seconds) and shows \"Confirming payment…\" until the webhook marks it paid."
          },
          {
            "label": "AC2",
            "text": "Once paid, the \"Download JSON\" and \"Download CSV\" buttons work."
          },
          {
            "label": "AC3",
            "text": "If confirmation takes over 30 seconds, it says \"We'll email you when it's ready\", and the email still arrives."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      },
      {
        "id": "MVP1-E7-02",
        "title": "Secure downloads",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Each download checks on the server that the user owns the document and the order is paid, then redirects to a presigned GET URL valid for 5 minutes, with the right filename."
          },
          {
            "label": "AC2",
            "text": "`delivery.downloaded` is audited."
          }
        ],
        "evals": "",
        "service": "DocFlow app (links from Upload)"
      },
      {
        "id": "MVP1-E7-03",
        "title": "Email delivery",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "When the order is paid (triggered by the webhook, not the browser), an email is sent via Resend within 60 seconds. It contains the document name, amount paid and a link to `/documents/{id}/success`, not a raw S3 link."
          },
          {
            "label": "AC2",
            "text": "A send failure retries 3 times with backoff and records the message's status. A permanent failure shows \"Email couldn't be sent\" on the success page."
          },
          {
            "label": "AC3",
            "text": "The email passes SPF/DKIM for the sending domain (Resend domain verification for 01scale.com), with plain-text and HTML versions."
          }
        ],
        "evals": "",
        "service": "Delivery; triggered by the DocFlow app"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/delivery/v1/messages",
        "access": "Service",
        "summary": "Send a templated email to a user.",
        "detail": "Called by an app's server with a delegated token for the recipient (decision on #24). Body `{template, data, reference}` + `Idempotency-Key` → `202 {message}`. Retries 3 times with backoff. Emits `delivery.message.failed` on permanent failure.",
        "story": "MVP1-E7-03"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/messages",
        "access": "Signed in",
        "summary": "My messages and their delivery status.",
        "detail": "Query `reference`, `cursor` → `200 {data: [{id, channel, template, status: queued|sent|failed, attempts, sent_at}], next_cursor}`.",
        "story": "MVP1-E7-03"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E7-01",
        "text": "No new endpoints. The page polls `GET /api/payment/v1/orders/{orderId}` and then uses the DocFlow download endpoints."
      },
      {
        "story": "MVP1-E7-02",
        "text": "Uses DocFlow `GET …/outputs/{format}/download` (E5-03), which checks the Payment order and redirects to an Upload `download-url`."
      },
      {
        "story": "MVP1-E7-03",
        "text": "DocFlow calls `POST /messages` when it receives `payment.order.paid` on its webhook (E0-09), so the email is triggered by the server, not the browser."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP1-E7-01",
        "title": "Success page",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E7-02",
        "title": "Secure downloads",
        "text": "No schema change."
      },
      {
        "story": "MVP1-E7-03",
        "title": "Email delivery",
        "text": "`delivery.messages` (id, owner_id, app, reference, channel `email`, template, status `queued|sent|failed`, attempts, provider_message_id, last_error, sent_at, created_at). The recipient address is read from Identity at send time, not stored."
      }
    ]
  },
  {
    "slug": "passwordless-login",
    "number": 9,
    "title": "Passwordless login, built by hand",
    "group": "MVP2",
    "service": "Identity",
    "description": "Magic links, passkeys and sessions on our own identity provider, replacing AWS Cognito.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E8",
      "title": "Passwordless identity, built by hand",
      "goal": "replace Cognito with our own provider. Libraries allowed: `@node-rs/argon2`, `jose`, `@simplewebauthn/*`, Node `crypto`, Resend. No auth vendors or auth frameworks."
    },
    "stories": [
      {
        "id": "MVP2-E8-01",
        "title": "Identity schema and session service",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "New tables: `auth_identities` (user_id, type email|passkey, identifier), `sessions` (id, user_id, token_hash, created_at, last_seen_at, expires_at, absolute_expires_at, ip_hash, user_agent), `login_tokens` (id, email, token_hash, purpose, expires_at, used_at), `passkeys` (credential_id, user_id, public_key, counter, transports, name, created_at, last_used_at) and `recovery_codes` (user_id, code_hash, used_at)."
          },
          {
            "label": "AC2",
            "text": "Session tokens are 32 random bytes from `crypto.randomBytes`; only the SHA-256 hash is stored. The cookie is `__Host-session`, HttpOnly, Secure, SameSite=Lax."
          },
          {
            "label": "AC3",
            "text": "Sessions use a 7-day sliding expiry, capped at 30 days, and both are enforced on the server."
          },
          {
            "label": "AC4",
            "text": "The OIDC client from MVP1 is replaced behind the same `getCurrentUser()` interface, with no changes to page code."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-02",
        "title": "Magic link sign-in and sign-up",
        "size": "M",
        "pending": "",
        "story": "As Priya, I want to sign in by clicking a link in my email.",
        "acs": [
          {
            "label": "AC1",
            "text": "Given I enter an email, then the response is always \"Check your email\", whether or not an account exists, and takes about the same time either way."
          },
          {
            "label": "AC2",
            "text": "A token of 32 random bytes is created and only its hash stored, with a 15-minute expiry and single use. The link goes to `/auth/confirm?token=…`."
          },
          {
            "label": "AC3",
            "text": "The confirm page needs a deliberate \"Sign in\" click (POST), so email link scanners can't use the token. The token is checked (hash match, not expired, not used), marked used, and a session is created."
          },
          {
            "label": "AC4",
            "text": "An unknown email creates a new user on first confirmation (sign-up and sign-in are one flow)."
          },
          {
            "label": "AC5",
            "text": "Rate limits: 5 requests per email per hour and 20 per IP per hour, after which the user sees a generic message. `auth.magic_link_requested` and `auth.signin` are audited."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-03",
        "title": "Email one-time code fallback",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "The same email also has a 6-digit code, valid 10 minutes, stored as a hash."
          },
          {
            "label": "AC2",
            "text": "A code allows at most 5 tries, then it's invalidated. The comparison is constant-time."
          },
          {
            "label": "AC3",
            "text": "A code-entry form on the sign-in page supports paste and the phone's one-time-code autofill."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-04",
        "title": "Passkeys: register and sign in",
        "size": "L",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "After sign-in, I'm offered \"Add a passkey\". Registration uses `@simplewebauthn/server` with the relying party ID `01scale.com` and requires user verification."
          },
          {
            "label": "AC2",
            "text": "\"Sign in with passkey\" works without typing an email, using browser autofill where supported."
          },
          {
            "label": "AC3",
            "text": "The signature counter and backup flags are checked and stored. A replayed or invalid assertion is rejected and audited."
          },
          {
            "label": "AC4",
            "text": "I can name, list and remove passkeys on `/account/security`. Removing one requires re-authentication within the last 5 minutes."
          },
          {
            "label": "AC5",
            "text": "Tested on iOS Safari, Android Chrome and desktop Chrome, with results recorded in the PR."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-05",
        "title": "Recovery codes",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "When the first passkey is registered, 10 single-use recovery codes are shown once and stored hashed with argon2."
          },
          {
            "label": "AC2",
            "text": "A recovery code signs me in, is marked used, and prompts me to add a new passkey."
          },
          {
            "label": "AC3",
            "text": "I can regenerate codes, which invalidates the old set; this requires re-authentication."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-06",
        "title": "Session management page",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/account/security` lists active sessions with device, approximate location from IP if available, and last active time, with the current one marked."
          },
          {
            "label": "AC2",
            "text": "I can revoke any session or \"Sign out everywhere else\". A revoked session is rejected on its next request."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-07",
        "title": "Re-authentication for sensitive actions",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Changing email, removing a passkey or payment method, deleting the account and regenerating recovery codes all require proof (passkey or email code) within the last 5 minutes."
          },
          {
            "label": "AC2",
            "text": "Changing email sends confirmation to the new address and a notice to the old one."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-08",
        "title": "Cognito migration and shutdown",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Given an MVP1 user signs in with a magic link to their verified email, then they're matched to their existing `users` row by email and keep all their documents and orders."
          },
          {
            "label": "AC2",
            "text": "A migration report shows migrated vs not-yet-migrated users."
          },
          {
            "label": "AC3",
            "text": "After 30 days, Cognito sign-in is turned off, its environment variables are removed, and a decision record `docs/decisions/E8.md` explains the build-vs-buy and migration choices."
          }
        ],
        "evals": "",
        "service": "Identity"
      },
      {
        "id": "MVP2-E8-09",
        "title": "Auth security hardening",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "CSRF protection on all state-changing routes (SameSite plus an origin check)."
          },
          {
            "label": "AC2",
            "text": "Every auth event is audited: requested, succeeded, failed, locked, passkey added/removed, session revoked."
          },
          {
            "label": "AC3",
            "text": "An OWASP ASVS v4 chapter 2 and 3 checklist (authentication, sessions) is completed in `docs/security/asvs-auth.md`, with each item marked pass, fail or n/a."
          }
        ],
        "evals": "",
        "service": "Identity and service template"
      },
      {
        "id": "MVP2-E8-10",
        "title": "Account security on our own screens",
        "size": "S",
        "pending": "",
        "story": "Decided by Nikhil on 17 Nov 2026 (issue #26): in MVP1, \"Change password\" uses Cognito's hosted forgot-password page; our own screens come with hand-built identity. As a user, I want to manage how I sign in on 01scale's own account page, without being sent to another site.",
        "acs": [
          {
            "label": "AC1",
            "text": "`/account/security` replaces MVP1's \"Change password\" button. MVP2 sign-in is passwordless, so there is no password to change: the page lists my sign-in methods (my email for magic links and codes, and my passkeys), and I can add a passkey, remove one (with re-authentication, `MVP2-E8-07`) or change my email."
          },
          {
            "label": "AC2",
            "text": "No step sends me to an outside page. Every action is an Identity endpoint with its UI component in `packages/ui-identity`."
          },
          {
            "label": "AC3",
            "text": "An MVP1 user who signed in with a password and has not yet set up a passkey sees a prompt to add one."
          }
        ],
        "evals": "",
        "service": "Identity"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/magic-links",
        "access": "Public",
        "summary": "Request a sign-in email.",
        "detail": "Always answers the same way. Body `{email, return_to?}` → `202 {message: \"Check your email\"}` whether or not the account exists, in constant time. Errors: `429` (generic).",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/magic-links/confirm",
        "access": "Public",
        "summary": "Exchange a magic-link token for a session (deliberate POST).",
        "detail": "Body `{token}` → `200 {user, return_to}` with the session cookie set. Errors: `400` invalid, expired or used token (one message for all three).",
        "story": "MVP2-E8-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/email-codes/verify",
        "access": "Public",
        "summary": "Sign in with the 6-digit code from the same email.",
        "detail": "Body `{email, code}` → `200 {user}` with the session cookie set. Errors: `400` wrong or expired code, `429` after 5 tries.",
        "story": "MVP2-E8-03"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/passkeys/registration-options",
        "access": "Signed in",
        "summary": "WebAuthn options to register a new passkey.",
        "detail": "→ `200` PublicKeyCredentialCreationOptions; the challenge is stored server-side for 5 minutes.",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/passkeys",
        "access": "Signed in",
        "summary": "Verify the registration and save the passkey.",
        "detail": "Body `{name, response}` → `201 {passkey, recovery_codes?}` (codes only with the first passkey). Errors: `400` verification failed.",
        "story": "MVP2-E8-04"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/passkeys",
        "access": "Signed in",
        "summary": "List my passkeys.",
        "detail": "→ `200 {data: [{id, name, created_at, last_used_at, backed_up}]}`.",
        "story": "MVP2-E8-04"
      },
      {
        "method": "PATCH",
        "path": "/api/identity/v1/passkeys/{passkeyId}",
        "access": "Signed in",
        "summary": "Rename a passkey.",
        "detail": "Body `{name}` → `200 {passkey}`.",
        "story": "MVP2-E8-04"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/passkeys/{passkeyId}",
        "access": "Signed in",
        "summary": "Remove a passkey (needs recent re-authentication).",
        "detail": "→ `204`. Errors: `403` with `code: reauthentication_required`.",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/passkeys/authentication-options",
        "access": "Public",
        "summary": "WebAuthn options to sign in with a passkey (no email needed).",
        "detail": "→ `200` PublicKeyCredentialRequestOptions with an empty allow-list (discoverable credentials).",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/passkeys/verify",
        "access": "Public",
        "summary": "Verify a passkey assertion and create a session.",
        "detail": "Body `{response}` → `200 {user}` with the session cookie set. Errors: `400` invalid or replayed assertion (audited).",
        "story": "MVP2-E8-04"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/recovery-codes",
        "access": "Signed in",
        "summary": "Regenerate recovery codes; the old set stops working.",
        "detail": "→ `201 {codes[10]}`, shown once. Needs recent re-authentication.",
        "story": "MVP2-E8-05"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/recovery-codes/verify",
        "access": "Public",
        "summary": "Sign in with a single-use recovery code.",
        "detail": "Body `{email, code}` → `200 {user, prompt: \"add_passkey\"}`. Errors: `400`, `429`.",
        "story": "MVP2-E8-05"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/sessions",
        "access": "Signed in",
        "summary": "List my active sessions with device and last active time.",
        "detail": "→ `200 {data: [{id, device, approx_location?, last_seen_at, current}]}`.",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/sessions/{sessionId}",
        "access": "Signed in",
        "summary": "Revoke one session.",
        "detail": "→ `204`.",
        "story": "MVP2-E8-06"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/sessions",
        "access": "Signed in",
        "summary": "Sign out everywhere else.",
        "detail": "→ `200 {revoked}`; the current session is kept.",
        "story": "MVP2-E8-06"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/reauthentication",
        "access": "Signed in",
        "summary": "Start re-authentication for a sensitive action.",
        "detail": "Body `{method: passkey|email_code}` → `200` WebAuthn options, or `202` after sending a code.",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/auth/reauthentication/verify",
        "access": "Signed in",
        "summary": "Finish re-authentication; valid for 5 minutes.",
        "detail": "Body `{response}` or `{code}` → `200 {reauthenticated_until}`. The next access token carries `reauth_at`, which other services check.",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/email-change",
        "access": "Signed in",
        "summary": "Ask to change my email (confirmation goes to the new address).",
        "detail": "Body `{new_email}` → `202`. Needs recent re-authentication. A notice goes to the old address.",
        "story": "MVP2-E8-07"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/email-change/confirm",
        "access": "Signed in",
        "summary": "Confirm the new email address.",
        "detail": "Body `{token}` → `200 {user}`.",
        "story": "MVP2-E8-07"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/admin/migration-report",
        "access": "Admin",
        "summary": "Users migrated from Cognito vs not yet migrated.",
        "detail": "→ `200 {migrated, pending, cutoff_at}`.",
        "story": "MVP2-E8-08"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP2-E8-01",
        "text": "No new endpoints. `GET /session`, `POST /token` and `GET /jwks` keep their contract, so no other service or app changes. `GET /auth/login` and `/auth/callback` are removed in E8-08."
      },
      {
        "story": "MVP2-E8-09",
        "text": "No new endpoints. The gateway checks the `Origin` header on cookie-authenticated writes; API-key requests are exempt from CSRF checks because they carry no ambient credentials."
      },
      {
        "story": "MVP2-E8-10",
        "text": "No new endpoints: composes `GET /api/identity/v1/passkeys` and `DELETE …/passkeys/{passkeyId}` (`MVP2-E8-04`), `POST /api/identity/v1/me/email-change` (`MVP2-E8-07`) and `GET /api/identity/v1/sessions` (`MVP2-E8-06`). Removes `POST /api/identity/v1/me/password-change` (MVP1), with a deprecation note in the changelog."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP2-E8-01",
        "title": "Identity schema and session service",
        "text": "New in `identity`: `auth_identities`, `login_tokens`, `passkeys`, `recovery_codes` as listed in AC1. `identity.sessions` (from MVP1-E1-03) gains last_seen_at, absolute_expires_at, ip_hash, user_agent, reauthenticated_at. `identity.users.cognito_sub` becomes nullable."
      },
      {
        "story": "MVP2-E8-02",
        "title": "Magic link sign-in and sign-up",
        "text": "Uses `identity.login_tokens` (purpose `magic_link`). `identity.rate_limits` (key, window_start, count; primary key (key, window_start)) backs the per-email and per-IP limits."
      },
      {
        "story": "MVP2-E8-03",
        "title": "Email one-time code fallback",
        "text": "`identity.login_tokens` adds code_hash, attempts (purpose `email_code`)."
      },
      {
        "story": "MVP2-E8-04",
        "title": "Passkeys: register and sign in",
        "text": "Uses `identity.passkeys`; adds backed_up boolean, backup_eligible boolean. `identity.webauthn_challenges` (id, user_id null, challenge, purpose, expires_at)."
      },
      {
        "story": "MVP2-E8-05",
        "title": "Recovery codes",
        "text": "Uses `identity.recovery_codes`; a regenerate deletes the user's old rows in the same transaction."
      },
      {
        "story": "MVP2-E8-06",
        "title": "Session management page",
        "text": "No schema change; reads `identity.sessions`."
      },
      {
        "story": "MVP2-E8-07",
        "title": "Re-authentication for sensitive actions",
        "text": "`identity.sessions.reauthenticated_at`. `identity.email_changes` (id, user_id, new_email, token_hash, expires_at, confirmed_at)."
      },
      {
        "story": "MVP2-E8-08",
        "title": "Cognito migration and shutdown",
        "text": "`identity.users` adds migrated_at. After cutoff, a migration drops `cognito_sub`."
      },
      {
        "story": "MVP2-E8-09",
        "title": "Auth security hardening",
        "text": "No schema change."
      },
      {
        "story": "MVP2-E8-10",
        "title": "Account security on our own screens",
        "text": "No schema change."
      }
    ]
  },
  {
    "slug": "multi-document-pipeline",
    "number": 10,
    "title": "Multi-document pipeline",
    "group": "MVP2",
    "service": "LLM Extraction",
    "description": "Process a batch of documents in parallel with LangGraph on AWS Lambda.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E9",
      "title": "Multi-document support",
      "goal": "process batches in parallel with a visible, recoverable pipeline."
    },
    "stories": [
      {
        "id": "MVP2-E9-01",
        "title": "Batch upload",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "I can select or drop up to 10 files at once. Each is checked individually (type, size, pages), and rejected ones don't block the others."
          },
          {
            "label": "AC2",
            "text": "A `batches` row groups the documents, and each document has its own upload progress."
          }
        ],
        "evals": "",
        "service": "DocFlow app (files through Upload)"
      },
      {
        "id": "MVP2-E9-02",
        "title": "LangGraph orchestrator on Lambda",
        "size": "L",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "A Python LangGraph graph `batch_pipeline` (nodes: plan → extract (fan-out) → validate → judge (E10) → aggregate) is deployed on AWS Lambda as the Extraction service's worker and triggered by the service's API through a queue (SQS). The Extraction API contract does not change."
          },
          {
            "label": "AC2",
            "text": "At most 3 documents run at once. Each document's state is saved after each node, so a retry resumes rather than restarts."
          },
          {
            "label": "AC3",
            "text": "One document failing doesn't fail the batch: that document is marked `failed` with a retry action, and the rest continue."
          },
          {
            "label": "AC4",
            "text": "Progress is written to Extraction's own schema. The job-group status endpoint shows per-job step and status, and DocFlow's batch page reads it."
          },
          {
            "label": "AC5",
            "text": "The decision record explains why there's a separate Lambda service rather than an in-app job."
          }
        ],
        "evals": "",
        "service": "LLM Extraction (Python on AWS Lambda)"
      },
      {
        "id": "MVP2-E9-03",
        "title": "Batch status page",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/batches/{id}` shows each document as a card with its status and step, updating live via polling."
          },
          {
            "label": "AC2",
            "text": "A summary line reads \"8 extracted · 1 needs review · 1 failed\"."
          }
        ],
        "evals": "MD-1 batch completeness, MD-2 batch latency, MD-3 accuracy in batch vs alone.",
        "service": "DocFlow app"
      },
      {
        "id": "MVP2-E9-04",
        "title": "Keep original documents beyond 30 days",
        "size": "S",
        "pending": "",
        "story": "Decided by Nikhil on 17 Nov 2026 (ARCHITECTURE.md §12.8): in MVP1, originals are deleted after 30 days; keeping them longer is for MVP2. As a user, I want to see the original invoice beside its results months later, so I can check a value against the document.",
        "acs": [
          {
            "label": "AC1",
            "text": "An app can ask Upload to keep a file until the owner deletes it or their account (`retention: until_deleted`), instead of the default 30 days."
          },
          {
            "label": "AC2",
            "text": "DocFlow keeps the originals of documents whose review is complete; files never completed still expire after 30 days."
          },
          {
            "label": "AC3",
            "text": "The S3 lifecycle rule applies only to files tagged for expiry, so kept files are not removed. Storage cost per user is shown on the admin page."
          },
          {
            "label": "AC4",
            "text": "Deleting a document or the account deletes its original at once, as today."
          }
        ],
        "evals": "",
        "service": "Upload (provider), then DocFlow"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches",
        "access": "Signed in",
        "summary": "Create a batch of up to 10 documents; each file is checked on its own.",
        "detail": "Body `{files: [{file_name, mime, size}]}` → `201 {batch, documents: [{document, upload} | {file_name, rejected_reason}]}`. Supports `Idempotency-Key`.",
        "story": "MVP2-E9-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/process",
        "access": "Signed in",
        "summary": "Start extraction for the batch once the uploads are confirmed.",
        "detail": "→ `202 {batch}`. Calls Extraction `POST /job-groups`. Idempotent. Errors: `409` if no file is ready.",
        "story": "MVP2-E9-01"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/job-groups",
        "access": "Signed in",
        "summary": "Run several extraction jobs as one group with a concurrency limit.",
        "detail": "Body `{jobs: [{file_id, schema, reference?}], max_concurrency: 3}` → `202 {group, jobs[]}`. One job failing does not fail the group.",
        "story": "MVP2-E9-02"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/job-groups/{groupId}",
        "access": "Signed in",
        "summary": "Group status with each job's current step.",
        "detail": "→ `200 {group, jobs: [{id, file_id, node, status}], summary: {extracted, failed, running}}`.",
        "story": "MVP2-E9-02"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches",
        "access": "Signed in",
        "summary": "List my batches.",
        "detail": "Query `cursor`, `limit` → `200 {data: [Batch], next_cursor}`.",
        "story": "MVP2-E9-03"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}",
        "access": "Signed in",
        "summary": "Batch status with each document's step and status.",
        "detail": "→ `200 {batch, documents: [{id, file_name, step, status}], summary: {extracted, needs_review, failed}}`.",
        "story": "MVP2-E9-03"
      },
      {
        "method": "PATCH",
        "path": "/api/upload/v1/files/{fileId}",
        "access": "Signed in",
        "summary": "change a file's retention.",
        "detail": "Body `{retention: \"30_days\"|\"until_deleted\"}` → `200 {file}`.",
        "story": "MVP2-E9-04"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP2-E9-02",
        "text": "The Lambda pipeline is part of the Extraction service and writes to Extraction's own schema. DocFlow follows progress through `GET /job-groups/{groupId}` and the `extraction.job.*` events."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP2-E9-01",
        "title": "Batch upload",
        "text": "`docflow.batches` (id, owner_id, job_group_id, status `uploading|processing|needs_review|reviewed|paid|failed`, created_at). `docflow.documents` adds batch_id → batches null, excluded boolean default false."
      },
      {
        "story": "MVP2-E9-02",
        "title": "LangGraph orchestrator on Lambda",
        "text": "`extraction.job_groups` (id, owner_id, max_concurrency, status, created_at); `extraction.jobs` adds group_id. `extraction.pipeline_runs` (id, job_id, node, status, state jsonb, attempt, updated_at) stores per-node checkpoints so a retry resumes."
      },
      {
        "story": "MVP2-E9-03",
        "title": "Batch status page",
        "text": "No schema change."
      },
      {
        "story": "MVP2-E9-04",
        "title": "Keep original documents beyond 30 days",
        "text": "`upload.files.expires_at` becomes nullable: empty means kept until deleted."
      }
    ]
  },
  {
    "slug": "llm-as-judge",
    "number": 11,
    "title": "LLM as judge",
    "group": "MVP2",
    "service": "LLM Extraction",
    "description": "A second, independent model check that catches the extractor's mistakes.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E10",
      "title": "LLM as judge on extraction",
      "goal": "a second, independent check that catches the extractor's mistakes."
    },
    "stories": [
      {
        "id": "MVP2-E10-01",
        "title": "Judge node",
        "size": "L",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "For each extracted field, the judge gets the document, the field name and its value (not the extractor's reasoning) and returns `{verdict: correct|incorrect|unsure, reason, evidence_quote}`."
          },
          {
            "label": "AC2",
            "text": "It uses prompt `prompts/judge-field/v1.md` and a model set separately from the extractor's."
          },
          {
            "label": "AC3",
            "text": "Calls are batched (several fields per call, grouped by page) to keep the added time to 30% or less."
          }
        ],
        "evals": "",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP2-E10-02",
        "title": "Combined confidence and routing",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Final confidence = a documented formula of model confidence, rule checks and judge verdict (`incorrect` caps it at 0.2, `unsure` at 0.6). The formula is versioned."
          },
          {
            "label": "AC2",
            "text": "Review routing uses the combined score. The UI shows the judge's reason next to flagged fields."
          }
        ],
        "evals": "JDG-1 judge agreement, JDG-2 routing recall with judge, JDG-3 flag rate, JDG-4 bias checks, JDG-5 added latency.",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP2-E10-03",
        "title": "Judge vs human dashboard",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/admin/quality` shows, for the last 30 days: judge agreement with human decisions, the confusion matrix and the fields the judge most often gets wrong."
          },
          {
            "label": "AC2",
            "text": "Cases where the judge and the human disagree can be exported as eval candidates."
          }
        ],
        "evals": "",
        "service": "Human Review"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/review/v1/admin/quality",
        "access": "Admin",
        "summary": "Judge vs human: agreement, confusion matrix, weakest fields (30 days).",
        "detail": "Query `days` → `200 {agreement_rate, confusion_matrix, worst_fields[]}`.",
        "story": "MVP2-E10-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/admin/quality/export",
        "access": "Admin",
        "summary": "Export judge/human disagreements as eval candidates.",
        "detail": "→ `201 {created}` rows in `review.eval_candidates`.",
        "story": "MVP2-E10-03"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP2-E10-01",
        "text": "No new endpoints; the judge is a pipeline node inside Extraction."
      },
      {
        "story": "MVP2-E10-02",
        "text": "No new endpoints. `Field` gains `judge: {verdict, reason, evidence_quote}` and `confidence_version`; DocFlow passes them on when it creates the review task."
      },
      {
        "story": "MVP2-E10-03",
        "text": "Review can compare judge and human because each review field stores the judge verdict it was created with."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP2-E10-01",
        "title": "Judge node",
        "text": "`extraction.field_judgements` (id, field_id → fields, verdict `correct|incorrect|unsure`, reason, evidence_quote, model, prompt_version, created_at)."
      },
      {
        "story": "MVP2-E10-02",
        "title": "Combined confidence and routing",
        "text": "`extraction.fields` adds confidence_version; `confidence` now holds the combined score. `review.fields` adds judge_verdict, judge_reason (copied in when the task is created)."
      },
      {
        "story": "MVP2-E10-03",
        "title": "Judge vs human dashboard",
        "text": "No new tables; aggregates `review.fields.judge_verdict` against `review.field_changes`."
      }
    ]
  },
  {
    "slug": "web-enrichment-and-chat-correction",
    "number": 12,
    "title": "Web enrichment and chat correction",
    "group": "MVP2",
    "service": "LLM Extraction and Human Review",
    "description": "Add cited context from the web, and fix data by describing the change in plain language.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E11",
      "title": "Metadata enrichment and chat correction",
      "goal": "add useful, cited context from the web and let users fix data in plain language, safely."
    },
    "stories": [
      {
        "id": "MVP2-E11-01",
        "title": "Research agent",
        "size": "L",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "For each document, the agent searches the web (Claude web search tool) using only `vendor_name`, `vendor_address` and `vendor_tax_id` (an allow-list)."
          },
          {
            "label": "AC2",
            "text": "It returns `vendor_website`, `vendor_address_normalized`, `vendor_category` and `vendor_registered` (yes/no/unknown). Each has `source_urls[]` and `retrieved_at`, and a value without a source is dropped."
          },
          {
            "label": "AC3",
            "text": "Amounts, bill-to details and line items are never included in queries, enforced in code and covered by a unit test."
          }
        ],
        "evals": "ENR-1 citation coverage, ENR-2 accuracy, ENR-3 PII leakage, ENR-4 abstention.",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP2-E11-02",
        "title": "Enrichment review UI",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Enrichment appears in a separate \"Metadata\" panel with source links. Each value can be accepted or rejected."
          },
          {
            "label": "AC2",
            "text": "Only accepted values go into the output JSON `metadata.enrichment`."
          }
        ],
        "evals": "",
        "service": "Human Review"
      },
      {
        "id": "MVP2-E11-03",
        "title": "Chat correction agent",
        "size": "L",
        "pending": "",
        "story": "As Priya, I want to type \"line 3 quantity should be 12\" and have it fixed.",
        "acs": [
          {
            "label": "AC1",
            "text": "A chat panel on the review page sends messages to an agent whose only write tools are `propose_field_update(field, new_value, reason)` and `propose_line_item_update(index, field, new_value, reason)`."
          },
          {
            "label": "AC2",
            "text": "Proposed changes appear as a diff (old → new) with Apply and Reject buttons. Nothing changes without Apply."
          },
          {
            "label": "AC3",
            "text": "Applied changes are audited with `source: chat`, rule checks run again, and each can be undone."
          },
          {
            "label": "AC4",
            "text": "The agent refuses requests outside its scope (e.g. \"email this to my boss\") and says why."
          }
        ],
        "evals": "CHAT-1 correct application, CHAT-2 no unrequested changes, CHAT-3 scope refusal, CHAT-4 ambiguity handling.",
        "service": "Human Review"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}/enrichment",
        "access": "Signed in",
        "summary": "Web-sourced vendor metadata with citations for a job.",
        "detail": "→ `200 {data: [{name, value, source_urls[], retrieved_at}]}`.",
        "story": "MVP2-E11-01"
      },
      {
        "method": "GET",
        "path": "/api/review/v1/tasks/{taskId}/chat/messages",
        "access": "Signed in",
        "summary": "The correction chat history for a task.",
        "detail": "→ `200 {data: [Message]}`.",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/chat/messages",
        "access": "Signed in",
        "summary": "Ask the correction agent to fix data in plain language.",
        "detail": "Body `{text}` → `201 {message, proposals: [{id, field, old_value, new_value, reason}]}`. Nothing changes until a proposal is applied.",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/apply",
        "access": "Signed in",
        "summary": "Apply a proposed change.",
        "detail": "→ `200 {field}`; audited with `source: chat`. Errors: `409` if the field changed since the proposal.",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/reject",
        "access": "Signed in",
        "summary": "Reject a proposed change.",
        "detail": "→ `200 {proposal}`.",
        "story": "MVP2-E11-03"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/proposals/{proposalId}/undo",
        "access": "Signed in",
        "summary": "Undo an applied change.",
        "detail": "→ `200 {field}`. Errors: `409` if the field was edited again afterwards.",
        "story": "MVP2-E11-03"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP2-E11-02",
        "text": "No new endpoints. DocFlow adds enrichment values to the review task as fields of `kind: enrichment` (with `source_urls`); accept or reject uses `PATCH /api/review/v1/tasks/{taskId}/fields/{fieldId}` (MVP1-E4-02)."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP2-E11-01",
        "title": "Research agent",
        "text": "`extraction.enrichments` (id, job_id → jobs, name, value jsonb, source_urls text[] not empty, retrieved_at)."
      },
      {
        "story": "MVP2-E11-02",
        "title": "Enrichment review UI",
        "text": "`review.fields.kind` gains `enrichment`; adds source_urls text[]. An accepted enrichment has status `accepted`."
      },
      {
        "story": "MVP2-E11-03",
        "title": "Chat correction agent",
        "text": "`review.chat_messages` (id, task_id, owner_id, role `user|assistant`, text, created_at). `review.field_proposals` (id, task_id, message_id, field_id, old_value jsonb, new_value jsonb, reason, status `proposed|applied|rejected|undone`, applied_change_id → field_changes)."
      }
    ]
  },
  {
    "slug": "multi-document-review",
    "number": 13,
    "title": "Multi-document review and outputs",
    "group": "MVP2",
    "service": "DocFlow app",
    "description": "Review a whole batch in tabs and export combined outputs.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E12",
      "title": "Multi-document review and outputs",
      "goal": ""
    },
    "stories": [
      {
        "id": "MVP2-E12-01",
        "title": "Tabbed review",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "One tab per document, each with a badge showing flagged fields left. \"Next flagged\" jumps across tabs."
          },
          {
            "label": "AC2",
            "text": "\"Complete batch review\" stays disabled until all documents are resolved; a document can be left out of the batch if it's unwanted."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      },
      {
        "id": "MVP2-E12-02",
        "title": "Batch outputs",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Outputs are per-document JSON, `batch.json` (an array with a batch metadata block), `batch.csv` (with a `document_id` column) and `batch.zip` (one CSV per document plus the JSON files)."
          },
          {
            "label": "AC2",
            "text": "The JSON and CSV preview has a tab per document plus a \"Combined\" tab."
          },
          {
            "label": "AC3",
            "text": "CSV injection protection and the encoding rules from MVP1-E5-02 also apply here."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/review",
        "access": "Signed in",
        "summary": "Review state across a batch: flagged fields left per document.",
        "detail": "→ `200 {documents: [{id, file_name, review_task_id, flagged_remaining, excluded}], next_flagged: {document_id, field_id}?, can_complete}`.",
        "story": "MVP2-E12-01"
      },
      {
        "method": "PATCH",
        "path": "/api/docflow/v1/batches/{batchId}/documents/{documentId}",
        "access": "Signed in",
        "summary": "Leave a document out of the batch (or put it back).",
        "detail": "Body `{excluded: boolean}` → `200 {document}`.",
        "story": "MVP2-E12-01"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/complete-review",
        "access": "Signed in",
        "summary": "Complete the batch review and build the batch outputs.",
        "detail": "→ `200 {batch}`. Errors: `409` with `unresolved_documents[]`.",
        "story": "MVP2-E12-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs",
        "access": "Signed in",
        "summary": "The outputs available for a batch.",
        "detail": "→ `200 {version, locked, formats: [\"json\", \"csv\", \"zip\"]}`.",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs/{format}/preview",
        "access": "Signed in",
        "summary": "Preview the combined JSON or CSV.",
        "detail": "`format = json|csv` → `200` inline content.",
        "story": "MVP2-E12-02"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/batches/{batchId}/outputs/{format}/download",
        "access": "Signed in",
        "summary": "Download batch.json, batch.csv or batch.zip.",
        "detail": "→ `302` to an Upload `download-url`. Errors: `402` until paid.",
        "story": "MVP2-E12-02"
      }
    ],
    "apiNotes": [],
    "dbNotes": [
      {
        "story": "MVP2-E12-01",
        "title": "Tabbed review",
        "text": "No new tables; uses `docflow.documents.excluded` and `docflow.batches.status`."
      },
      {
        "story": "MVP2-E12-02",
        "title": "Batch outputs",
        "text": "`docflow.outputs` adds batch_id null, zip_file_id; a batch output row has `document_id` null."
      }
    ]
  },
  {
    "slug": "saved-payment-methods",
    "number": 14,
    "title": "Saved payment methods",
    "group": "MVP2",
    "service": "Payment",
    "description": "Saved cards, a default method and payment history.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E13",
      "title": "Payments v2",
      "goal": "saved cards, default method and history, without card data touching our servers."
    },
    "stories": [
      {
        "id": "MVP2-E13-01",
        "title": "Stripe Customer per user",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "A Stripe Customer is created the first time a user pays or adds a card, and its ID is stored in the Payment service against the user's ID."
          }
        ],
        "evals": "",
        "service": "Payment"
      },
      {
        "id": "MVP2-E13-02",
        "title": "Save a card",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "\"Add card\" on `/account/payment-methods` uses a SetupIntent with Stripe Elements. The card number never reaches our servers (PCI SAQ A scope)."
          },
          {
            "label": "AC2",
            "text": "At checkout, a \"Save this card\" checkbox is shown (`setup_future_usage`)."
          },
          {
            "label": "AC3",
            "text": "Webhooks `payment_method.attached` and `detached` keep the local list in sync."
          }
        ],
        "evals": "",
        "service": "Payment"
      },
      {
        "id": "MVP2-E13-03",
        "title": "Manage payment methods",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "I can list cards (brand, last 4, expiry), set the default and remove a card. Removal requires re-authentication (E8-07)."
          },
          {
            "label": "AC2",
            "text": "An expired card is shown as expired and can't be the default."
          }
        ],
        "evals": "",
        "service": "Payment"
      },
      {
        "id": "MVP2-E13-04",
        "title": "One-tap pay with default card",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "For a batch, \"Pay $X with Visa •• 4242\" creates a PaymentIntent with the default card."
          },
          {
            "label": "AC2",
            "text": "If 3-D Secure is required, the challenge appears in the page and payment completes afterwards (tested with Stripe's 3-D Secure test cards)."
          },
          {
            "label": "AC3",
            "text": "The amount is the number of documents × the unit price, calculated on the server, never taken from the browser."
          }
        ],
        "evals": "",
        "service": "Payment; composed by the DocFlow app"
      },
      {
        "id": "MVP2-E13-05",
        "title": "Payment history",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/account/payments` lists date, batch or document, amount, status and a Stripe receipt link, newest first, paginated."
          },
          {
            "label": "AC2",
            "text": "Refunded or failed payments show their status clearly."
          }
        ],
        "evals": "",
        "service": "Payment"
      },
      {
        "id": "MVP2-E13-06",
        "title": "Free plan and upgrade to paid",
        "size": "M",
        "pending": "",
        "story": "Decided by Nikhil on 17 Nov 2026 (PR #64): MVP1 gives every user 100 requests a minute across all endpoints; MVP2 adds a freemium model with paid upgrades. As a user who has outgrown the free plan, I want to upgrade to a paid plan so I get higher limits without a new account.",
        "acs": [
          {
            "label": "AC1",
            "text": "Every user starts on the Free plan, with the MVP1 limit of 100 requests a minute. The plans and their limits are configuration, not code."
          },
          {
            "label": "AC2",
            "text": "`/account/plan` shows my plan, my usage against its limits, and the paid plans with their prices. Upgrading goes through Stripe Checkout in subscription mode; downgrading or cancelling takes effect at the end of the paid period."
          },
          {
            "label": "AC3",
            "text": "When I reach a limit, the answer says which limit and offers the upgrade, instead of only `429`."
          },
          {
            "label": "AC4",
            "text": "The gateway applies the limits of my plan, read from my access token, so no service needs to know about plans."
          },
          {
            "label": "AC5",
            "text": "A failed renewal returns me to the Free plan after Stripe's retries, and I am emailed through Delivery."
          }
        ],
        "evals": "",
        "service": "Payment (subscriptions), Identity (plan in the token), Gateway (limits per plan)"
      }
    ],
    "endpoints": [
      {
        "method": "POST",
        "path": "/api/payment/v1/payment-methods/setup-intents",
        "access": "Signed in",
        "summary": "Start saving a card (Stripe SetupIntent).",
        "detail": "→ `201 {client_secret}` for Stripe Elements; the card number never reaches our servers.",
        "story": "MVP2-E13-02"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/payment-methods",
        "access": "Signed in",
        "summary": "List my saved cards.",
        "detail": "→ `200 {data: [{id, brand, last4, exp_month, exp_year, is_default, expired}]}`.",
        "story": "MVP2-E13-03"
      },
      {
        "method": "PATCH",
        "path": "/api/payment/v1/payment-methods/{paymentMethodId}",
        "access": "Signed in",
        "summary": "Make a card the default.",
        "detail": "Body `{is_default: true}` → `200 {payment_method}`. Errors: `409` if the card is expired.",
        "story": "MVP2-E13-03"
      },
      {
        "method": "DELETE",
        "path": "/api/payment/v1/payment-methods/{paymentMethodId}",
        "access": "Signed in",
        "summary": "Remove a saved card (needs recent re-authentication).",
        "detail": "→ `204`. Errors: `403` with `code: reauthentication_required` unless the token's `reauth_at` is within 5 minutes.",
        "story": "MVP2-E13-03"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/payments",
        "access": "Service",
        "summary": "Charge a saved card.",
        "detail": "Called by an app's server, which sets the amount. Body `{user_id, reference, description, amount, currency, payment_method_id?}` + `Idempotency-Key` → `201 {payment, requires_action, client_secret?}`. Emits `payment.payment.succeeded|failed`.",
        "story": "MVP2-E13-04"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/pay",
        "access": "Signed in",
        "summary": "Pay for a batch with my default card in one tap.",
        "detail": "→ `201 {payment_id, requires_action, client_secret?}`. DocFlow computes documents × unit price and calls Payment `POST /payments`.",
        "story": "MVP2-E13-04"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/payments",
        "access": "Signed in",
        "summary": "Payment history, newest first.",
        "detail": "Query `cursor`, `limit` → `200 {data: [{id, created_at, reference, description, amount, currency, status, receipt_url}], next_cursor}`.",
        "story": "MVP2-E13-05"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/plans",
        "access": "Public",
        "summary": "The plans with prices and limits.",
        "detail": "→ `200 {data: [Plan]}`.",
        "story": "MVP2-E13-06"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/subscription",
        "access": "Signed in",
        "summary": "My plan, status and period end.",
        "detail": "→ `200 {subscription}`.",
        "story": "MVP2-E13-06"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/subscription/checkout",
        "access": "Signed in, session only",
        "summary": "Start an upgrade.",
        "detail": "Body `{plan}` → `201 {checkout_url}`. A person always completes payment.",
        "story": "MVP2-E13-06"
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/subscription/cancel",
        "access": "Signed in, session only",
        "summary": "Cancel at the end of the period.",
        "detail": "→ `200 {subscription}`.",
        "story": "MVP2-E13-06"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP2-E13-01",
        "text": "No endpoints."
      },
      {
        "story": "MVP2-E13-02",
        "text": "`payment_method.attached` and `detached` arrive on `POST /api/payment/v1/webhooks/stripe` (MVP1-E6-02)."
      },
      {
        "story": "MVP2-E13-06",
        "text": "Payment announces `payment.subscription.changed`; Identity puts `plan` in the user's access tokens."
      }
    ],
    "dbNotes": [
      {
        "story": "MVP2-E13-01",
        "title": "Stripe Customer per user",
        "text": "`payment.customers` (owner_id primary key, stripe_customer_id unique, created_at). The Stripe customer lives in Payment's schema, not on Identity's user."
      },
      {
        "story": "MVP2-E13-02",
        "title": "Save a card",
        "text": "`payment.payment_methods` (id, owner_id, stripe_payment_method_id unique, brand, last4, exp_month, exp_year, is_default, created_at). No card number or CVC is ever stored."
      },
      {
        "story": "MVP2-E13-03",
        "title": "Manage payment methods",
        "text": "Partial unique index on `payment.payment_methods(owner_id)` where is_default allows one default per user."
      },
      {
        "story": "MVP2-E13-04",
        "title": "One-tap pay with default card",
        "text": "`payment.payments` (id, owner_id, app, reference, description, stripe_payment_intent_id unique, payment_method_id, amount, currency, status `requires_action|processing|succeeded|failed|refunded`, receipt_url, created_at). MVP1 `payment.orders` remain for Checkout. `docflow.batches` adds payment_id."
      },
      {
        "story": "MVP2-E13-05",
        "title": "Payment history",
        "text": "No schema change; index `payment.payments(owner_id, created_at desc)`."
      },
      {
        "story": "MVP2-E13-06",
        "title": "Free plan and upgrade to paid",
        "text": "`payment.subscriptions` (id, owner_id unique, plan, status `active|past_due|cancelled`, stripe_subscription_id unique, current_period_end, created_at). `identity.users` adds `plan`, kept in step from the event."
      }
    ]
  },
  {
    "slug": "notifications",
    "number": 15,
    "title": "Notifications",
    "group": "MVP2",
    "service": "Delivery",
    "description": "Email, SMS and push notifications, with preferences per channel and event.",
    "status": "Planned",
    "detailed": false,
    "epic": {
      "id": "E14",
      "title": "Notifications: email, SMS, push",
      "goal": ""
    },
    "stories": [
      {
        "id": "MVP2-E14-01",
        "title": "Notification preferences",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`/account/notifications` has toggles per channel (email on by default; SMS and push off) and per event (batch extracted, review needed, payment succeeded, files ready)."
          }
        ],
        "evals": "",
        "service": "Delivery"
      },
      {
        "id": "MVP2-E14-02",
        "title": "Phone verification and SMS",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "Adding a phone number sends a 6-digit code using the hand-built code service from E8-03. The number is saved only after verification, in E.164 format."
          },
          {
            "label": "AC2",
            "text": "SMS goes through Twilio (or AWS SNS, recorded in the decision log), with at most 10 messages per user per day."
          },
          {
            "label": "AC3",
            "text": "Replying STOP opts the user out and is reflected in their preferences. The SMS says \"Reply STOP to opt out\"."
          },
          {
            "label": "AC4",
            "text": "SMS never contains file contents or links that work without signing in."
          }
        ],
        "evals": "",
        "service": "Identity (phone) and Delivery (SMS)"
      },
      {
        "id": "MVP2-E14-03",
        "title": "Web push",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "A service worker and VAPID keys (`web-push` library) power an \"Enable notifications\" button that asks for browser permission only when I click it."
          },
          {
            "label": "AC2",
            "text": "Multiple devices per user are supported. Subscriptions that come back 404 or 410 are deleted automatically."
          },
          {
            "label": "AC3",
            "text": "Works on desktop Chrome and Android Chrome, and on iOS when 01scale.com is added to the home screen (documented with the steps)."
          }
        ],
        "evals": "",
        "service": "Delivery"
      },
      {
        "id": "MVP2-E14-04",
        "title": "Notification dispatcher and log",
        "size": "M",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "One `notify(userId, event, payload)` function sends to every enabled channel. Events are triggered by the server (webhooks or pipeline), never the browser."
          },
          {
            "label": "AC2",
            "text": "Each attempt is logged per channel (sent, failed, skipped because of preferences) and shown on `/account/notifications`."
          },
          {
            "label": "AC3",
            "text": "Failures retry up to 3 times. If one channel fails, the others still send."
          }
        ],
        "evals": "",
        "service": "Delivery"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/delivery/v1/notification-preferences",
        "access": "Signed in",
        "summary": "My notification settings per channel and event.",
        "detail": "→ `200 {channels: {email, sms, push}, events: {…}}`.",
        "story": "MVP2-E14-01"
      },
      {
        "method": "PUT",
        "path": "/api/delivery/v1/notification-preferences",
        "access": "Signed in",
        "summary": "Replace my notification settings.",
        "detail": "Body as above → `200`. Errors: `409` enabling SMS without a verified phone (read from the access token's `phone_verified` claim).",
        "story": "MVP2-E14-01"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/phone",
        "access": "Signed in",
        "summary": "Add a phone number; sends a 6-digit code.",
        "detail": "Body `{phone}` (E.164) → `202`. The code is sent through Delivery `POST /notifications`. Errors: `422`, `429`.",
        "story": "MVP2-E14-02"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/phone/verify",
        "access": "Signed in",
        "summary": "Verify the phone number.",
        "detail": "Body `{code}` → `200 {phone, verified_at}`. Errors: `400`, `429` after 5 tries.",
        "story": "MVP2-E14-02"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/me/phone",
        "access": "Signed in",
        "summary": "Remove my phone number.",
        "detail": "→ `204`. Emits `identity.user.phone_removed`; Delivery turns SMS off.",
        "story": "MVP2-E14-02"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/webhooks/sms",
        "access": "Service",
        "summary": "Inbound SMS webhook: handles STOP opt-outs.",
        "detail": "Verifies the provider signature → `200`.",
        "story": "MVP2-E14-02"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/push/public-key",
        "access": "Public",
        "summary": "The VAPID public key for web push.",
        "detail": "→ `200 {public_key}`.",
        "story": "MVP2-E14-03"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/push-subscriptions",
        "access": "Signed in",
        "summary": "Register this device for push notifications.",
        "detail": "Body `{endpoint, keys: {p256dh, auth}, device_name?}` → `201 {subscription}`. Idempotent on `endpoint`.",
        "story": "MVP2-E14-03"
      },
      {
        "method": "DELETE",
        "path": "/api/delivery/v1/push-subscriptions/{subscriptionId}",
        "access": "Signed in",
        "summary": "Remove a device.",
        "detail": "→ `204`.",
        "story": "MVP2-E14-03"
      },
      {
        "method": "POST",
        "path": "/api/delivery/v1/notifications",
        "access": "Service",
        "summary": "Notify a user about an event on every channel they have enabled.",
        "detail": "Called by an app's server. Body `{user_id, event, payload, reference}` + `Idempotency-Key` → `202 {notification}`. Replaces direct use of `POST /messages` by apps.",
        "story": "MVP2-E14-04"
      },
      {
        "method": "GET",
        "path": "/api/delivery/v1/notifications",
        "access": "Signed in",
        "summary": "My notification log: each attempt per channel.",
        "detail": "Query `cursor`, `limit` → `200 {data: [{event, channel, status: sent|failed|skipped, attempts, created_at}], next_cursor}`.",
        "story": "MVP2-E14-04"
      }
    ],
    "apiNotes": [],
    "dbNotes": [
      {
        "story": "MVP2-E14-01",
        "title": "Notification preferences",
        "text": "`delivery.notification_preferences` (owner_id primary key, email boolean default true, sms boolean default false, push boolean default false, events jsonb, updated_at)."
      },
      {
        "story": "MVP2-E14-02",
        "title": "Phone verification and SMS",
        "text": "`identity.users` adds phone_e164, phone_verified_at. Codes reuse `identity.login_tokens` (purpose `phone_verify`). `delivery.notification_preferences` adds sms_opted_out_at."
      },
      {
        "story": "MVP2-E14-03",
        "title": "Web push",
        "text": "`delivery.push_subscriptions` (id, owner_id, endpoint unique, p256dh, auth, device_name, created_at, last_success_at)."
      },
      {
        "story": "MVP2-E14-04",
        "title": "Notification dispatcher and log",
        "text": "`delivery.notifications` (id, owner_id, app, reference, event, channel `email|sms|push`, status `sent|failed|skipped`, attempts, last_error, created_at). MVP1 `delivery.messages` rows are migrated into it."
      }
    ]
  }
];

export type Product = (typeof products)[number];
