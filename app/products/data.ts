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
      },
      {
        "id": "MVP1-E1-09",
        "title": "Account screens as UI components (`ui-identity`)",
        "size": "S",
        "pending": "**Status: built (#164), 23 Nov 2026,** in `ui-identity` 0.3.0, against a stand-in client until the service is built; every state is live on the module's UI Components section. Added 22 Nov 2026 (Nikhil), when MVP1-E0-19 AC5 marked these components \"Designed, not built yet\".",
        "story": "As the owner, I want the account page's screens built as Identity's UI components, so any app can offer account management without building it again.",
        "acs": [
          {
            "label": "AC1",
            "text": "`AccountDetails`, `PasswordChangeButton`, `DeleteAccountDialog` and `ApiKeysManager` are built as designed in `docs/services/identity/account/UI-COMPONENTS.md`. `ApiKeysManager` shows a new key's secret once, with Copy, and never again. `DeleteAccountDialog` asks the person to type DELETE."
          },
          {
            "label": "AC2",
            "text": "Each component is built in `packages/ui-identity` on `@01scale/ui-core`, calls only its own service's API through the package's client, and has every state its design lists (loading, empty, failed and each data state)."
          },
          {
            "label": "AC3",
            "text": "Each component is shown live, in each of its states, on its module's UI Components section, replacing \"Designed, not built yet\" (MVP1-E0-19 AC5)."
          },
          {
            "label": "AC4",
            "text": "Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode."
          }
        ],
        "evals": "",
        "service": "Identity (`packages/ui-identity`); parent stories `MVP1-E1-05` (account page) and `MVP1-E0-06` (API keys)"
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
        "path": "/api/identity/v1/users/{userId}",
        "access": "Service only, scope `identity:users.read`",
        "summary": "A user's verified email, for a service that writes to them (Delivery, `MVP1-E7-03`).",
        "detail": "→ `200 {id, email}`. Errors: `404 user_not_found`, including for a deleted user. Added on PR #70.",
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
      },
      {
        "story": "MVP1-E1-09",
        "text": "No new endpoints. Uses those of `MVP1-E1-05` and `MVP1-E0-06`."
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
      },
      {
        "story": "MVP1-E1-09",
        "title": "Account screens as UI components (`ui-identity`)",
        "text": "No tables."
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
            "text": "Once the file is uploaded and checked, the upload screen shows its preview (Upload's `FilePreview` component) while extraction starts in the background; \"Continue\" takes me to the document's extraction page, which shows the same preview beside the fields (Nikhil's decision on PR #65)."
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
          },
          {
            "label": "AC5",
            "text": "Scanned PDFs and photos are in scope. Before extraction, the job reads each page's text: the PDF's text layer, or OCR by Claude when there is none or the file is an image. If no text is found, the job fails with `no_text_found` and the person sees \"No text found\" (Nikhil's decision on #34)."
          },
          {
            "label": "AC6",
            "text": "The default model is `claude-opus-5-5` (Nikhil's decision on #34)."
          },
          {
            "label": "AC7",
            "text": "**Demo budget (Nikhil's decision on PR #87):** each calendar month (UTC), jobs use `claude-opus-5-5` until $5 of Opus cost is used, then `claude-haiku-5-5` until $5 of Haiku cost is used. When both are used, a new job is refused with `503 demo_budget_reached` and `Retry-After` set to the start of next month. Spend is the sum of `cost_usd` on the month's jobs, per model and **per app**, found from each job's `reference` prefix: every app has its own budget of this size (Nikhil's decision, 21 Nov 2026), and AutoRep counts its own (`AUTOREP-E6-02`). The hard backstop is outside the code: prepaid API credit with auto-reload off and a $20 monthly spend limit on the Anthropic workspace (DocFlow's $10 and AutoRep's $10), so the bill can never exceed $20. Moving the budget into one platform component is `MVP2-E15-02`."
          },
          {
            "label": "AC8",
            "text": "The eval report covers both models. If Haiku scores below a threshold, it still runs: confidence routing sends more fields to human review, and the Costs page says so."
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
          },
          {
            "label": "AC5",
            "text": "The source-quote check runs for scans and photos too, against the OCR text (decision on #35)."
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
          },
          {
            "label": "AC5",
            "text": "The page says which model read the document. When it was Claude Haiku 5.5, it shows: \"This month's demo budget for Claude Opus 5.5 is used, so this document was read by Claude Haiku 5.5, a faster, lower-cost model. More fields may be flagged for your review.\" When both budgets are used, the upload step shows: \"Demo capacity for this month is used up. Extraction is back on <date>.\" (Nikhil's decision on PR #87)."
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
          },
          {
            "label": "AC3",
            "text": "The admin page also shows this month's spend per model against its $5 budget (`MVP1-E3-02` AC7)."
          }
        ],
        "evals": "",
        "service": "LLM Extraction"
      },
      {
        "id": "MVP1-E3-06",
        "title": "Ask questions about my documents (RAG)",
        "size": "L",
        "pending": "",
        "story": "As a user, I want to ask a question in plain language across my processed invoices, such as \"How much did I pay Acme Supplies in October?\", and get an answer that shows the invoices it came from.",
        "acs": [
          {
            "label": "AC1",
            "text": "When an extraction finishes, the document's page text (`extraction.page_texts`) is split into passages, turned into embeddings and added to the owner's own index. Deleting a document or the account deletes its passages."
          },
          {
            "label": "AC2",
            "text": "A question retrieves the most relevant passages **only from the caller's own documents** (the owner filter is part of the search itself, never applied afterwards), and Claude answers using only those passages."
          },
          {
            "label": "AC3",
            "text": "Every statement in the answer cites its document, page and quote. Each quote is checked against the retrieved text, as the extraction quote check does; a statement whose quote is not found is removed. If nothing relevant is found, the answer says so instead of guessing."
          },
          {
            "label": "AC4",
            "text": "The question box can be limited to chosen documents. The answer shows its citations as links that open the document at the cited page, using Upload's `FilePreview`."
          },
          {
            "label": "AC5",
            "text": "Evals RAG-1 to RAG-4 (`docs/evals/EVALS.md`) meet their thresholds on the synthetic dataset before release. Model, prompt version, tokens, cost and time are recorded per question, like extraction jobs."
          },
          {
            "label": "AC6",
            "text": "Asking counts towards the limit of 10 requests a minute that change something; agents can ask through the MCP tool `extraction.askDocuments`, within the same limits."
          }
        ],
        "evals": "RAG-1 retrieval recall, RAG-2 faithfulness, RAG-3 refusal on unanswerable questions, RAG-4 latency and cost (see `EVALS.md`).",
        "service": "LLM Extraction (index and answers); DocFlow composes the \"Ask\" box on `/documents`"
      },
      {
        "id": "MVP1-E3-07",
        "title": "Jobs table for the admin as a UI component (`ui-extraction`)",
        "size": "S",
        "pending": "**Status: built (#165), 23 Nov 2026,** in `ui-extraction` 0.3.0, against a stand-in client until the service is built; every state is live on the module's UI Components section. Added 22 Nov 2026 (Nikhil), when MVP1-E0-19 AC5 marked this component \"Designed, not built yet\".",
        "story": "As the owner, I want the admin's jobs table built as Extraction's UI component, so I can watch cost, speed and failures in any app.",
        "acs": [
          {
            "label": "AC1",
            "text": "`JobsTable` is built as designed in `docs/services/extraction/UI-COMPONENTS.md`: the last jobs with model, prompt version, pages, tokens, cost, time and outcome, with the failure rate, average cost and slowest time on top. To anyone who is not an admin it shows \"Not found\", as the API answers."
          },
          {
            "label": "AC2",
            "text": "Each component is built in `packages/ui-extraction` on `@01scale/ui-core`, calls only its own service's API through the package's client, and has every state its design lists (loading, empty, failed and each data state)."
          },
          {
            "label": "AC3",
            "text": "Each component is shown live, in each of its states, on its module's UI Components section, replacing \"Designed, not built yet\" (MVP1-E0-19 AC5)."
          },
          {
            "label": "AC4",
            "text": "Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode."
          }
        ],
        "evals": "",
        "service": "LLM Extraction (`packages/ui-extraction`); parent story `MVP1-E3-05`"
      },
      {
        "id": "MVP1-E3-08",
        "title": "Hold a job's fields for the app that started it",
        "size": "S",
        "pending": "**Status: designed (#177), 23 Nov 2026 (Nikhil's decision; `docs/decisions/MVP1-E5.md`).**",
        "story": "As an app (DocFlow), I want to hold an extraction's results until my own condition is met, so a person cannot read them around my paywall, while Extraction stays app-agnostic.",
        "acs": [
          {
            "label": "AC1",
            "text": "`POST /api/extraction/v1/jobs` accepts `hold: true` only with a delegated token; the acting app in its `act` claim becomes the job's `held_by`. With a person's own token or an API key it answers `422 hold_requires_app`."
          },
          {
            "label": "AC2",
            "text": "While a job is held, `GET /jobs/{jobId}/fields` with the owner's own token or API key returns only the flagged fields, whatever `flagged` says, with `held: true` and `fields_hidden`; the holding app, with a delegated token naming it in `act`, gets every field. `GET /jobs/{jobId}` shows `held_by` and `released_at`."
          },
          {
            "label": "AC3",
            "text": "`POST /jobs/{jobId}/release` lets only the holder release the job (`403 not_holder` for anyone else, `409 not_held` for a job never held); it is safe to repeat, and records `job.released` in the audit log. After release, the owner reads every field."
          },
          {
            "label": "AC4",
            "text": "Extraction never learns why a job is held. Tests cover owner, holder, other app and released reads."
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
        "detail": "Body `{schema, values, job_id?}` → `200 {passed, checks: [{name, passed, fields[], message}]}`. Used after extraction and again on corrected data.",
        "story": "MVP1-E3-03"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/admin/jobs",
        "access": "Admin",
        "summary": "Last 100 jobs with tokens, cost, duration and failure rate.",
        "detail": "→ `200 {data: [Job], summary: {failure_rate, avg_cost_usd, p95_duration_ms}}`. Errors: `404` for non-admins.",
        "story": "MVP1-E3-05"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/questions",
        "access": "Signed in",
        "summary": "Answer a question from my documents, with citations.",
        "detail": "Body `{question, file_ids?}` → `200 {answer, citations: [{file_id, page, quote}], found: boolean, model, prompt_version}`. Errors: `422 validation_failed`, `429 rate_limited`.",
        "story": "MVP1-E3-06"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/jobs",
        "access": "Signed in",
        "summary": "adds body `hold?: boolean` (delegated token only).",
        "detail": "Errors add `422 hold_requires_app`.",
        "story": "MVP1-E3-08"
      },
      {
        "method": "GET",
        "path": "/api/extraction/v1/jobs/{jobId}/fields",
        "access": "Signed in",
        "summary": "while held, flagged fields only for the owner, with `held`, `fields_hidden`.",
        "detail": "",
        "story": "MVP1-E3-08"
      },
      {
        "method": "POST",
        "path": "/api/extraction/v1/jobs/{jobId}/release",
        "access": "Service: delegated token of the holder",
        "summary": "Release held results.",
        "detail": "→ `200 {job}`. Errors: `403 not_holder`, `404 job_not_found`, `409 not_held`. No MCP tool: no agent releases for a person.",
        "story": "MVP1-E3-08"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E3-02",
        "text": "Extraction itself has no endpoint: it runs inside the job started in E3-01. The job reads the file through Upload `GET /files/{fileId}/download-url` with a delegated token for the owner (decision on #24)."
      },
      {
        "story": "MVP1-E3-04",
        "text": "No new endpoints. The component polls `GET /jobs/{jobId}`, reads `GET /jobs/{jobId}/fields`, and shows the file through Upload `download-url`."
      },
      {
        "story": "MVP1-E3-07",
        "text": "No new endpoints. Uses `GET /api/extraction/v1/admin/jobs` (`MVP1-E3-05`)."
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
        "text": "`extraction.fields` adds confidence numeric(3,2), flagged boolean, flag_reasons text[]. Index `extraction.fields(job_id) where flagged`. `extraction.page_texts` (job_id → jobs, page, source `text_layer|ocr`, text, created_at): each page's text, for the quote check; deleted with the job."
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
      },
      {
        "story": "MVP1-E3-06",
        "title": "Ask questions about my documents (RAG)",
        "text": "`extraction.passages` (id, job_id → jobs on delete cascade, owner_id, page, text, embedding `vector`, created_at); an approximate-nearest-neighbour index on `embedding` (pgvector, HNSW) and an index on `owner_id`. `extraction.questions` (id, owner_id, model, prompt_version, tokens_in, tokens_out, cost_usd, duration_ms, found, created_at): no question or answer text is stored."
      },
      {
        "story": "MVP1-E3-07",
        "title": "Jobs table for the admin as a UI component (`ui-extraction`)",
        "text": "No tables."
      },
      {
        "story": "MVP1-E3-08",
        "title": "Hold a job's fields for the app that started it",
        "text": "`extraction.jobs` adds `held_by` text null (like `service:docflow`, set only at creation) and `released_at` timestamptz null (only when `held_by` is set)."
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
          },
          {
            "label": "AC4",
            "text": "Fields can still be corrected after the review is completed, including after payment; each change is recorded the same way, and the latest values are the final document (Nikhil's decision on #45)."
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
      },
      {
        "id": "MVP1-E4-05",
        "title": "Eval candidates and accuracy for the admin as UI components (`ui-review`)",
        "size": "S",
        "pending": "**Status: built (#166), 23 Nov 2026,** in `ui-review` 0.2.0, against a stand-in client until the service is built; every state is live on the module's UI Components section. Added 22 Nov 2026 (Nikhil), when MVP1-E0-19 AC5 marked these components \"Designed, not built yet\".",
        "story": "As the owner, I want the admin's eval-candidate and accuracy screens built as Review's UI components, so I can approve real model mistakes as eval cases and see how accurate the fields are, inside the app.",
        "acs": [
          {
            "label": "AC1",
            "text": "`EvalCandidatesTable` (corrections with both values, Approve and Reject) and `AccuracyReport` (per field, how often people corrected it and how well flagging caught it, as numbers only) are built as designed in `docs/services/review/UI-COMPONENTS.md`. Neither exports or copies user data (Nikhil's privacy rule; decision on #41)."
          },
          {
            "label": "AC2",
            "text": "Each component is built in `packages/ui-review` on `@01scale/ui-core`, calls only its own service's API through the package's client, and has every state its design lists (loading, empty, failed and each data state)."
          },
          {
            "label": "AC3",
            "text": "Each component is shown live, in each of its states, on its module's UI Components section, replacing \"Designed, not built yet\" (MVP1-E0-19 AC5)."
          },
          {
            "label": "AC4",
            "text": "Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode."
          }
        ],
        "evals": "",
        "service": "Human Review (`packages/ui-review`); parent story `MVP1-E4-04`"
      },
      {
        "id": "MVP1-E4-06",
        "title": "Hold a review task's fields for the app that started it",
        "size": "S",
        "pending": "**Status: designed (#178), 23 Nov 2026 (Nikhil's decision; `docs/decisions/MVP1-E5.md`).**",
        "story": "As an app (DocFlow), I want the person to review only the flagged fields until my own condition is met, so the values read with high confidence cannot be read around my paywall.",
        "acs": [
          {
            "label": "AC1",
            "text": "`POST /api/review/v1/tasks` accepts `hold: true` only with a delegated token; the acting app in `act` becomes `held_by`. Otherwise `422 hold_requires_app`."
          },
          {
            "label": "AC2",
            "text": "While a task is held, `GET /tasks/{taskId}` with the owner's own token or API key returns only the flagged fields, even with `all=true`, with `held: true` and `fields_hidden`; the holder gets every field. The owner may decide only flagged fields: an unflagged one answers `404 field_not_found`."
          },
          {
            "label": "AC3",
            "text": "`POST /tasks/{taskId}/release` lets only the holder release the task (`403 not_holder`, `409 not_held`); safe to repeat; records `review.task_released`. After release, the owner sees and corrects every field (Nikhil's decision on #45 still holds)."
          },
          {
            "label": "AC4",
            "text": "Review never learns why a task is held. Review's UI components work unchanged: `ReviewQueue` shows what the API returns, and an app may also hide its \"Show all fields\" toggle with `allowShowAll`."
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
        "detail": "Body `{action: accept|edit|not_present, value?}` → `200 {field}`. Errors: `422` invalid date, number or currency. Allowed after completion (decision on #45).",
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
        "summary": "Finish review for a document: re-checks the corrected data and completes the Review task; results are built on demand afterwards (ARCHITECTURE.md §12.8).",
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
        "method": "GET",
        "path": "/api/review/v1/admin/accuracy",
        "access": "Admin",
        "summary": "How often people correct each field, as counts and rates only, seen by the admin alone (every count shown as it is, decided on #81).",
        "detail": "Query `since`, `source` → `200 {since, totals, fields[]}`. Replaces the export of corrections (decision on #41).",
        "story": "MVP1-E4-04"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks",
        "access": "Signed in",
        "summary": "adds body `hold?: boolean` (delegated token only).",
        "detail": "Errors add `422 hold_requires_app`.",
        "story": "MVP1-E4-06"
      },
      {
        "method": "POST",
        "path": "/api/review/v1/tasks/{taskId}/release",
        "access": "Service: delegated token of the holder",
        "summary": "Release held fields.",
        "detail": "→ `200 {task}`. Errors: `403 not_holder`, `404 task_not_found`, `409 not_held`. No MCP tool.",
        "story": "MVP1-E4-06"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E4-05",
        "text": "No new endpoints. Uses `GET` and `PATCH /api/review/v1/admin/eval-candidates` and `GET /api/review/v1/admin/accuracy` (`MVP1-E4-04`)."
      },
      {
        "story": "MVP1-E4-06",
        "text": "`GET /api/review/v1/tasks/{taskId}` and `PATCH …/fields/{fieldId}` (signed in) — while held, flagged fields only for the owner."
      }
    ],
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
        "text": "`review.eval_candidates` (id, task_id, reference, field_name, model_value jsonb, human_value jsonb, status `candidate|approved|rejected`, created_at). `task_id` references `review.tasks` with delete cascade, so candidates are deleted with the task and the account (decision on #41)."
      },
      {
        "story": "MVP1-E4-05",
        "title": "Eval candidates and accuracy for the admin as UI components (`ui-review`)",
        "text": "No tables."
      },
      {
        "story": "MVP1-E4-06",
        "title": "Hold a review task's fields for the app that started it",
        "text": "`review.tasks` adds `held_by` text null and `released_at` timestamptz null (only when `held_by` is set)."
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
            "text": "Before payment, I can see a short preview of both outputs on screen: four fields (vendor, invoice number, date and total) and how many more fields and line items unlock after payment. Download buttons show \"Pay to download\". After payment I see everything. (Changed 22 Nov 2026, Nikhil: a full preview gave the results away before payment.)"
          },
          {
            "label": "AC3",
            "text": "The preview limit is enforced on the server, like the download lock, so the full results cannot be read through the API before payment."
          },
          {
            "label": "AC4",
            "text": "Before payment, DocFlow's screens list only the flagged fields: after extraction, in the review and in the results page's Edit values. The fields read with high confidence stay hidden, with a line saying how many unlock after payment (Nikhil, 22 Nov 2026). The services enforce it too, through the hold in `MVP1-E5-05`."
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
        "title": "Build outputs on demand",
        "size": "S",
        "pending": "",
        "story": "",
        "acs": [
          {
            "label": "AC1",
            "text": "`result.json` and `result.csv` are never stored. Every preview and download builds them from Review's latest values and Extraction's metadata, so they always reflect the final document (Nikhil's decision on #45, ARCHITECTURE.md §12.8)."
          },
          {
            "label": "AC2",
            "text": "The person can correct values on the results page, before or after paying. Corrections are saved in Review with their history, the checks re-run, and the next preview or download shows them. No new payment is asked for."
          }
        ],
        "evals": "",
        "service": "DocFlow app (values from Human Review, metadata from LLM Extraction)"
      },
      {
        "id": "MVP1-E5-05",
        "title": "DocFlow holds results until payment",
        "size": "S",
        "pending": "**Status: designed (#179), 23 Nov 2026 (Nikhil's decision; `docs/decisions/MVP1-E5.md`).**",
        "story": "As the owner, I want the full results unreadable through any API until the person has paid, so the preview is the only thing given away (API first: preview, then payment, then full data).",
        "acs": [
          {
            "label": "AC1",
            "text": "DocFlow starts every extraction job and review task with `hold: true` and a delegated token for the owner (`act: service:docflow`), so DocFlow is the holder (`MVP1-E3-08`, `MVP1-E4-06`)."
          },
          {
            "label": "AC2",
            "text": "DocFlow reads results as the holder, with a delegated token, for the preview, the checks and the downloads; before payment its own API still returns only the four-field preview (`MVP1-E5-03` AC3)."
          },
          {
            "label": "AC3",
            "text": "On `payment.order.paid`, DocFlow releases the job and the task (each safe to repeat), then sets the document `paid` and asks Delivery for the email. If a release fails, the event is retried; the person is not blocked, because downloads are built by DocFlow as the holder."
          },
          {
            "label": "AC4",
            "text": "A test shows that, before payment, the owner's own token gets only the flagged fields from Extraction and Review, and four fields from DocFlow; after payment, every field everywhere."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
      }
    ],
    "endpoints": [
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs",
        "access": "Signed in",
        "summary": "Results status: whether download is unlocked and whether the current values pass every check.",
        "detail": "→ `200 {locked, formats: [\"json\", \"csv\"], checks: {passed, failed[]}, last_changed_at}`.",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/preview",
        "access": "Signed in",
        "summary": "Preview the JSON or CSV on screen.",
        "detail": "`format = json|csv` → `200` with `application/json` (`{data, metadata}`) or `text/csv`, sent `Content-Disposition: inline`. Before payment, four fields only, with `preview: {limited, fields_hidden, line_items_hidden}` (`MVP1-E5-03`).",
        "story": "MVP1-E5-01"
      },
      {
        "method": "GET",
        "path": "/api/docflow/v1/documents/{documentId}/outputs/{format}/download",
        "access": "Signed in",
        "summary": "Download an output, built from Review's latest values.",
        "detail": "Locked until the order is paid. → `200` with the file as an attachment (`{document}-result.{format}`, `Cache-Control: no-store`). Errors: `402 payment_required`, `409 outputs_not_ready`.",
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
        "text": "No new endpoints. Uses `GET …/outputs`, `…/preview` and `…/download` (E5-01, E5-03), which read Review `GET /tasks/{taskId}?all=true` and Extraction `GET /jobs/{jobId}`; corrections use Review `PATCH /tasks/{taskId}/fields/{fieldId}` through Review's component."
      },
      {
        "story": "MVP1-E5-05",
        "text": "No new endpoints. Uses Extraction `POST /jobs` with `hold`, `POST /jobs/{jobId}/release`, Review `POST /tasks` with `hold` and `POST /tasks/{taskId}/release`. Changes which token each step uses (see `docs/services/docflow/README.md`)."
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
        "title": "Build outputs on demand",
        "text": "No tables: nothing is stored. The final values stay in `review.fields`, kept until the user deletes their account."
      },
      {
        "story": "MVP1-E5-05",
        "title": "DocFlow holds results until payment",
        "text": "No tables. The hold lives in Extraction and Review."
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
      },
      {
        "id": "MVP1-E6-04",
        "title": "Refunds",
        "size": "S",
        "pending": "Decided on PR #67: refunds are not in the first version of Payment; this story adds them.",
        "story": "As the owner, I want to refund a paid order in full, so a demo user who was charged by mistake (in test mode) can be put right, and the platform shows how a refund flows through every service.",
        "acs": [
          {
            "label": "AC1",
            "text": "An admin can refund a paid order in full from the admin page, with a reason. A person always does this: it is session only and never available to API keys or agents."
          },
          {
            "label": "AC2",
            "text": "Payment creates the refund in Stripe with the order's ID as the idempotency key, so a repeated request never refunds twice. The order becomes `refunded` when Stripe's webhook confirms it (`charge.refunded`), not when the request is sent."
          },
          {
            "label": "AC3",
            "text": "Payment announces `payment.order.refunded` to the app that created the order (routed by reference, decision on #13). In DocFlow, the document's downloads lock again and its status shows \"Refunded\"; the reviewed data stays."
          },
          {
            "label": "AC4",
            "text": "The person who paid is emailed through Delivery that the refund was made, with the amount; Stripe's own refund receipt still applies."
          },
          {
            "label": "AC5",
            "text": "A refund is audited (`order.refunded`) with the admin, the reason and the amount. Partial refunds are not in this version."
          },
          {
            "label": "AC6",
            "text": "Refunding an order that is not paid answers `409 not_paid`; refunding it again answers `409 already_refunded`."
          }
        ],
        "evals": "",
        "service": "Payment; DocFlow reacts to the event; Delivery sends the email"
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
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/orders/{orderId}/refund",
        "access": "Admin, session only",
        "summary": "Refund a paid order in full.",
        "detail": "Body `{reason}` + `Idempotency-Key` → `202 {order}` with status `refund_pending`. Errors: `409 not_paid`, `409 already_refunded`, `503 stripe_unavailable`.",
        "story": "MVP1-E6-04"
      }
    ],
    "apiNotes": [
      {
        "story": "MVP1-E6-03",
        "text": "The page also calls DocFlow `POST …/checkout` (E6-01)."
      },
      {
        "story": "MVP1-E6-04",
        "text": "The Stripe webhook (`MVP1-E6-02`) also handles `charge.refunded`."
      },
      {
        "story": "MVP1-E6-04",
        "text": "DocFlow's webhook handles `payment.order.refunded`."
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
      },
      {
        "story": "MVP1-E6-04",
        "title": "Refunds",
        "text": "`payment.orders.status` adds `refund_pending` and `refunded`; the order adds `refund_reason`, `stripe_refund_id` (unique) and `refunded_at`. `docflow.documents.status` adds `refunded`."
      }
    ]
  },
  {
    "slug": "download-and-email-delivery",
    "number": 8,
    "title": "Email delivery",
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
            "text": "Each download checks on the server that the user owns the document and the order is paid, then returns the file built from Review's latest values, with the right filename and `Cache-Control: no-store`. A generated result is a few kilobytes and never stored, so it is returned directly; stored files such as uploads still move only by short-lived presigned links."
          },
          {
            "label": "AC2",
            "text": "`delivery.downloaded` is audited."
          }
        ],
        "evals": "",
        "service": "DocFlow app"
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
        "text": "Uses DocFlow `GET …/outputs/{format}/download` (E5-03), which checks the Payment order and returns the file."
      },
      {
        "story": "MVP1-E7-03",
        "text": "DocFlow calls `POST /messages` when it receives `payment.order.paid` on its webhook (E0-09), so the email is triggered by the server, not the browser."
      },
      {
        "story": "MVP1-E7-03",
        "text": "Delivery reads the recipient's verified address at send time with Identity `GET /api/identity/v1/users/{userId}` (service only, scope `identity:users.read`; designed with `MVP1-E1-05`). Decided by Nikhil on PR #68; the address is never passed in a request or an event."
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
      },
      {
        "id": "MVP2-E8-11",
        "title": "Deactivate first, delete after 30 days",
        "size": "S",
        "pending": "",
        "story": "Decided by Nikhil on 20 Nov 2026 (PR #70): MVP1 deletes an account at once; MVP2 adds a 30-day window to undo a deletion. As a user, I want a deleted account to stay recoverable for 30 days, so a mistake or a change of mind does not lose my work, while my data is still erased for good afterwards.",
        "acs": [
          {
            "label": "AC1",
            "text": "\"Delete account\" deactivates the account at once: I am signed out everywhere, my sessions, API keys and agents stop working, and no one can reach my data. I see the date it will be deleted for good."
          },
          {
            "label": "AC2",
            "text": "Signing in within 30 days offers **Restore account**, which brings everything back as it was. After restoring, nothing has been deleted."
          },
          {
            "label": "AC3",
            "text": "After 30 days, a daily job deletes the account for good through the existing `identity.user.deleted` event, so every service deletes or anonymizes its own data exactly as in MVP1. \"Delete now\" skips the wait for anyone who asks."
          },
          {
            "label": "AC4",
            "text": "While deactivated, the account receives no emails, and `GET /api/identity/v1/users/{userId}` answers `404`, so no service writes to it."
          },
          {
            "label": "AC5",
            "text": "Deactivation, restore and the final deletion are each audited. The consent line and the account page say that deletion completes 30 days after the request."
          }
        ],
        "evals": "",
        "service": "Identity only: other services need no change, because a deactivated user cannot sign in and their data is reachable only by them."
      },
      {
        "id": "MVP2-E8-12",
        "title": "Rotate service client secrets without downtime",
        "size": "S",
        "pending": "",
        "story": "Decided by Nikhil on 20 Nov 2026 (PR #73): parked for MVP2. In MVP1 a client secret changes only with a database migration and a deployment. As the owner, I want to change a service's or app's client secret without any moment where its calls fail, so a leaked or old secret can be replaced at once and routinely.",
        "acs": [
          {
            "label": "AC1",
            "text": "Each client can hold two active secrets at the same time. Identity accepts either while both are active."
          },
          {
            "label": "AC2",
            "text": "Rotating is three steps with no downtime: add a new secret; set it in the client's environment and redeploy; retire the old secret. Retiring it takes effect on the next sign-in; tokens already issued last at most 5 minutes."
          },
          {
            "label": "AC3",
            "text": "A secret can also be retired at once in an emergency, for example after a leak, even if the client then fails until it has the new one."
          },
          {
            "label": "AC4",
            "text": "The admin page shows, per client, when each secret was created and last used, so an unused old secret is easy to spot. Each secret is shown once at creation and stored only as a hash."
          },
          {
            "label": "AC5",
            "text": "Adding and retiring secrets are admin and session-only actions, never available to API keys or agents, and are audited."
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
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/me/restore",
        "access": "Signed in during the 30 days",
        "summary": "Restore my account.",
        "detail": "→ `200 {user}`. Errors: `409 not_deactivated`.",
        "story": "MVP2-E8-11"
      },
      {
        "method": "POST",
        "path": "/api/identity/v1/admin/service-clients/{clientId}/secrets",
        "access": "Admin, session only",
        "summary": "Add a secret.",
        "detail": "→ `201 {secret_id, secret}`, the secret shown once. Errors: `409 too_many_secrets` when two are already active.",
        "story": "MVP2-E8-12"
      },
      {
        "method": "DELETE",
        "path": "/api/identity/v1/admin/service-clients/{clientId}/secrets/{secretId}",
        "access": "Admin, session only",
        "summary": "Retire a secret.",
        "detail": "→ `204`. Errors: `409 last_secret` unless `?emergency=true`.",
        "story": "MVP2-E8-12"
      },
      {
        "method": "GET",
        "path": "/api/identity/v1/admin/service-clients",
        "access": "Admin",
        "summary": "Clients with their secrets' created and last-used dates.",
        "detail": "Never returns a secret.",
        "story": "MVP2-E8-12"
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
      },
      {
        "story": "MVP2-E8-11",
        "text": "`DELETE /api/identity/v1/me` (signed in, session only) now deactivates. Body `{confirm: \"DELETE\"}` → `202 {deletes_at}`. With `{confirm: \"DELETE\", now: true}` it deletes at once, as in MVP1."
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
      },
      {
        "story": "MVP2-E8-11",
        "title": "Deactivate first, delete after 30 days",
        "text": "`identity.users` adds `deactivated_at` and `deletes_at` (both empty unless deactivated). A partial index on `deletes_at` serves the daily job."
      },
      {
        "story": "MVP2-E8-12",
        "title": "Rotate service client secrets without downtime",
        "text": "`identity.service_client_secrets` (id, client_id → service_clients, secret_hash unique, created_at, last_used_at, retired_at), replacing `service_clients.secret_hash`. A partial unique rule allows at most two active secrets per client."
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
            "text": "`/admin/quality` shows, for the last 30 days, **numbers only**: judge agreement with human decisions, the confusion matrix and the fields the judge most often gets wrong. No field value, document or user appears (Nikhil's rule on #41; small-group rules in `MVP2-E10-04`)."
          },
          {
            "label": "AC2",
            "text": "The admin can add the cases where the judge and the human disagree to Review's eval candidates, **inside Review's database**, for the admin to approve as in `MVP1-E4-04`. Nothing is exported to files or to the repository, and the candidates are deleted with their owner's account (decisions on #41)."
          }
        ],
        "evals": "",
        "service": "Human Review"
      },
      {
        "id": "MVP2-E10-04",
        "title": "Privacy rules for small groups in reports",
        "size": "S",
        "pending": "",
        "story": "Decided by Nikhil on 20 Nov 2026 (PR #81): MVP1's accuracy report shows every count as it is, so it can be tested with few users; MVP2 adds rules so a small count can never point to one person. As the owner, I want reports built from real users' work to stay anonymous as the number of testers grows, so a number can never reveal something about one person's document.",
        "acs": [
          {
            "label": "AC1",
            "text": "In every admin report built from users' data (the accuracy report of `MVP1-E4-04` and the judge vs human dashboard of `MVP2-E10-03`), a row whose numbers come from **fewer than 2 different people** is hidden or merged into \"Other\". The threshold is configuration."
          },
          {
            "label": "AC2",
            "text": "A count from enough people is shown as it is, however small, so the report stays useful with few testers."
          },
          {
            "label": "AC3",
            "text": "Hidden rows are still counted in the totals, and the report says how many rows were hidden and why."
          },
          {
            "label": "AC4",
            "text": "Unit tests cover the edge cases: one person with many corrections, many people with one each, and a total that would let a hidden row be worked out by subtraction."
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
        "path": "/api/review/v1/admin/quality/candidates",
        "access": "Admin, session only",
        "summary": "Add judge/human disagreements to `review.eval_candidates`, inside Review's database.",
        "detail": "→ `201 {created}`: a count only, no values. Nothing leaves the service.",
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
      },
      {
        "story": "MVP2-E10-04",
        "text": "No new endpoints. `GET /api/review/v1/admin/accuracy` and the judge vs human report add `hidden_rows` and apply the rule."
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
      },
      {
        "story": "MVP2-E10-04",
        "title": "Privacy rules for small groups in reports",
        "text": "No schema change; the rule counts distinct `review.tasks.owner_id` per row."
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
        "text": "No tables: like single documents, batch results (JSON, CSV and the zip) are built on demand from each document's Review values and never stored (ARCHITECTURE.md §12.8)."
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
        "story": "Decided by Nikhil on 17 Nov 2026 (PR #64): MVP1 limits every user to 10 requests a minute that change something and 60 reads a minute (10 a minute in total with an API key), so the demo cannot be used in batch; MVP2 adds a freemium model with paid upgrades. As a user who has outgrown the free plan, I want to upgrade to a paid plan so I get higher limits without a new account.",
        "acs": [
          {
            "label": "AC1",
            "text": "Every user starts on the Free plan, with the MVP1 limits (10 changes and 60 reads a minute; 10 a minute with an API key). Paid plans raise them and allow batch use. The plans and their limits are configuration, not code."
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
      },
      {
        "id": "MVP2-E13-07",
        "title": "Scheduled payments",
        "size": "M",
        "pending": "",
        "story": "As a user, I want to choose the date a payment is taken, for example at the end of the month for all the invoices I processed, so I don't have to pay at the moment I finish.",
        "acs": [
          {
            "label": "AC1",
            "text": "Instead of paying now, I can choose a date up to 90 days ahead, in my own time zone, and which saved card to use (my default card unless I pick another, `MVP2-E13-03`). I see the amount, the date and the card before I confirm."
          },
          {
            "label": "AC2",
            "text": "The day before, I am reminded by my notification settings (`MVP2-E14`), with a link to change the date, the card, or cancel."
          },
          {
            "label": "AC3",
            "text": "On the date, Payment charges the saved card without me present (an off-session Stripe PaymentIntent). The charge happens once, whatever repeats: the schedule's ID is Stripe's idempotency key."
          },
          {
            "label": "AC4",
            "text": "If the bank asks for authentication (3-D Secure) or the card is declined, the payment waits as `requires_action` or `failed`, I am notified with a link to complete it or choose another card, and Payment retries a declined card once the next day. Nothing is charged twice."
          },
          {
            "label": "AC5",
            "text": "I can change the date or card, or cancel, until the charge starts. Downloads unlock only when the scheduled payment succeeds, as for any payment."
          },
          {
            "label": "AC6",
            "text": "The amount is set by the app's server when the schedule is created and cannot change afterwards; a different amount needs a new schedule. A person always sets up, changes and confirms a schedule: an agent can only propose one, through an approval (`MVP2-E16-05`)."
          },
          {
            "label": "AC7",
            "text": "Every schedule, change, cancellation, charge and failure is audited."
          }
        ],
        "evals": "",
        "service": "Payment (schedules and the daily run); DocFlow offers \"Pay on a date\"; Delivery sends the reminder and failure notices"
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
      },
      {
        "method": "POST",
        "path": "/api/payment/v1/schedules",
        "access": "Service, delegated token",
        "summary": "Schedule a charge for a user.",
        "detail": "The app's server sets the amount. Body `{reference, description, amount, currency, charge_on, time_zone, payment_method_id?}` + `Idempotency-Key` → `201 {schedule}`. Errors: `422 charge_date_out_of_range` (past, or more than 90 days ahead), `409 already_paid`, `422 no_saved_card`.",
        "story": "MVP2-E13-07"
      },
      {
        "method": "GET",
        "path": "/api/payment/v1/schedules",
        "access": "Signed in",
        "summary": "My scheduled payments, soonest first.",
        "detail": "Query `status`, `cursor`, `limit` → `200 {data: [Schedule], next_cursor}`.",
        "story": "MVP2-E13-07"
      },
      {
        "method": "PATCH",
        "path": "/api/payment/v1/schedules/{scheduleId}",
        "access": "Signed in, session only",
        "summary": "Change the date or card.",
        "detail": "Body `{charge_on?, payment_method_id?}` → `200 {schedule}`. Errors: `409 schedule_started`.",
        "story": "MVP2-E13-07"
      },
      {
        "method": "DELETE",
        "path": "/api/payment/v1/schedules/{scheduleId}",
        "access": "Signed in, session only",
        "summary": "Cancel.",
        "detail": "→ `200 {schedule}` with status `cancelled`. Errors: `409 schedule_started`.",
        "story": "MVP2-E13-07"
      },
      {
        "method": "POST",
        "path": "/api/docflow/v1/batches/{batchId}/schedule-payment",
        "access": "Signed in",
        "summary": "Pay for a batch on a date.",
        "detail": "Body `{charge_on, payment_method_id?}` → `201 {schedule}`. DocFlow computes the amount and calls Payment.",
        "story": "MVP2-E13-07"
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
      },
      {
        "story": "MVP2-E13-07",
        "text": "Payment announces `payment.schedule.charged`, `.failed` and `.requires_action` to the app that created the schedule (routed by reference, decision on #13)."
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
      },
      {
        "story": "MVP2-E13-07",
        "title": "Scheduled payments",
        "text": "`payment.schedules` (id, owner_id, app, reference, description, amount, currency, payment_method_id, charge_on date, time_zone, status `scheduled|processing|charged|requires_action|failed|cancelled`, payment_id → payments, attempts, reminded_at, created_at, cancelled_at). A partial unique index allows one open schedule per app and reference. A daily job picks schedules due today (in their time zone) with `for update skip locked`, so two runs never charge the same schedule."
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
