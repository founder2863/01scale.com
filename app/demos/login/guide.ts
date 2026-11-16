// Generated together with docs/services/identity/*.md from one source. Design only: not built yet.
export const guide = {
  "overview": {
    "name": "Identity",
    "version": "Version 1 · Login with AWS Cognito",
    "status": "Designed, not built",
    "base": "/api/identity/v1",
    "what": [
      "Identity is the platform service that answers one question for every other service and app: who is making this request?",
      "In version 1 it does not store passwords or show a login form itself. It sends the user to AWS Cognito's hosted sign-in page, and when Cognito sends them back it creates a 01scale user and a 01scale session.",
      "It then issues short-lived access tokens that every other service can verify on its own, so no other service ever handles a password, a cookie or a Cognito token."
    ],
    "why": [
      {
        "title": "One place for sign-in",
        "text": "Upload, Extraction, Review, Payment and Delivery must not each build login. They trust one token from Identity."
      },
      {
        "title": "Passwords are not our problem yet",
        "text": "Cognito handles sign-up, email verification, password rules and password reset. Version 1 consumes that instead of rebuilding it."
      },
      {
        "title": "The provider can be replaced",
        "text": "Cognito is used only through the open standard OIDC. Version 2 swaps in hand-built passwordless login behind the same endpoints, and no app or service changes."
      },
      {
        "title": "Apps stay simple",
        "text": "An app needs one link to sign a user in and one call to learn who they are."
      }
    ],
    "scope_in": [
      "Sign up with email and password, with the email verified by a code (on Cognito's page)",
      "Sign in and sign out",
      "Forgot and reset password (on Cognito's page)",
      "A 01scale session kept in a secure cookie",
      "Short-lived access tokens for the other services, and the public keys to verify them",
      "An audit record of every sign-up, sign-in, sign-out and failed sign-in"
    ],
    "scope_out": [
      "Account page, change password from the account page, delete account (the Account management module)",
      "API keys for AI agents (story MVP1-E0-06)",
      "A branded sign-in page at auth.01scale.com (pending story MVP1-E1-07)",
      "Sign in with Google (pending story MVP1-E1-08)",
      "Two-step verification",
      "Magic links, passkeys and anything else from version 2"
    ],
    "stories": [
      "MVP1-E1-01",
      "MVP1-E1-02",
      "MVP1-E1-03",
      "MVP1-E1-04",
      "MVP1-E1-06"
    ]
  },
  "flow": [
    {
      "who": "Browser",
      "what": "The user taps Sign in. The app sends them to `GET /auth/login`."
    },
    {
      "who": "Identity",
      "what": "Creates three one-time values (`state`, `nonce` and a PKCE code verifier), keeps them in a 10-minute encrypted cookie, and redirects the browser to Cognito."
    },
    {
      "who": "Cognito",
      "what": "Shows the hosted page. The user signs up (and verifies their email with a code) or signs in. Cognito redirects back with a one-time `code`."
    },
    {
      "who": "Identity",
      "what": "On `GET /auth/callback`: checks `state`, exchanges the `code` for Cognito tokens using the code verifier, checks the ID token (`nonce`, issuer, audience, expiry) and requires a verified email."
    },
    {
      "who": "Identity",
      "what": "Finds the user by Cognito's user ID or creates one, creates a session, sets the session cookie, writes an audit event and redirects to the page the user asked for."
    },
    {
      "who": "Gateway",
      "what": "On every later API request, exchanges the session cookie for a 5-minute access token (`POST /token`) and forwards the request with it."
    },
    {
      "who": "Any service",
      "what": "Verifies the access token's signature with Identity's public keys (`GET /jwks`) and reads the user ID from it. No call to Identity is needed."
    }
  ],
  "concepts": [
    {
      "term": "User",
      "meaning": "A person, identified inside 01scale by a `user.id`. Cognito's ID for the same person is stored as `cognito_sub`."
    },
    {
      "term": "Session",
      "meaning": "Proof that a browser signed in. The browser holds a random token in a cookie; Identity stores only a hash of it. Lasts 7 days."
    },
    {
      "term": "Access token",
      "meaning": "A signed pass valid for 5 minutes that says which user is calling. Services verify it themselves. Browsers never see it."
    },
    {
      "term": "Signing key",
      "meaning": "The private key Identity signs access tokens with. The matching public key is published so services can verify."
    },
    {
      "term": "OIDC",
      "meaning": "OpenID Connect: the open standard for 'sign in with a provider'. Identity uses its authorization code flow."
    },
    {
      "term": "PKCE",
      "meaning": "An extra one-time secret in that flow, so a stolen `code` cannot be exchanged by anyone else."
    },
    {
      "term": "state and nonce",
      "meaning": "Two one-time values that prove the response from Cognito belongs to the login this browser started."
    }
  ],
  "quickstart": [
    {
      "title": "Send the user to sign in",
      "text": "Use a plain link. Set `return_to` to the page they should land on.",
      "lang": "html",
      "code": "<a href=\"/api/identity/v1/auth/login?mode=signin&return_to=/documents\">Sign in</a>\n<a href=\"/api/identity/v1/auth/login?mode=signup&return_to=/documents\">Create account</a>"
    },
    {
      "title": "Find out who is signed in",
      "text": "From the browser, the cookie is sent automatically. A `401` means nobody is signed in.",
      "lang": "ts",
      "code": "const res = await fetch(\"/api/identity/v1/session\");\nif (res.status === 401) {\n  // show the Sign in link\n} else {\n  const { user } = await res.json();\n  console.log(user.email); // \"priya@example.com\"\n}"
    },
    {
      "title": "Trust the caller inside a service",
      "text": "The gateway has already attached an access token. Verify it with Identity's public keys; do not call Identity.",
      "lang": "ts",
      "code": "import { createRemoteJWKSet, jwtVerify } from \"jose\";\n\nconst keys = createRemoteJWKSet(\n  new URL(\"https://01scale.com/api/identity/v1/jwks\"),\n);\n\nexport async function requireUser(request: Request) {\n  const token = request.headers.get(\"authorization\")?.replace(\"Bearer \", \"\");\n  if (!token) throw new Response(null, { status: 401 });\n  const { payload } = await jwtVerify(token, keys, {\n    issuer: \"https://01scale.com/api/identity/v1\",\n    audience: \"01scale\",\n  });\n  return { userId: payload.sub as string, isAdmin: payload.is_admin === true };\n}"
    },
    {
      "title": "Sign out",
      "text": "End the 01scale session, then follow `logout_url` so Cognito's session ends too.",
      "lang": "ts",
      "code": "const res = await fetch(\"/api/identity/v1/auth/logout\", { method: \"POST\" });\nconst { logout_url } = await res.json();\nwindow.location.href = logout_url;"
    }
  ],
  "cookies": [
    {
      "name": "`__Host-01s_login`",
      "holds": "Holds `state`, `nonce`, the PKCE verifier, `mode` and `return_to` while the user is at Cognito",
      "lifetime": "10 minutes",
      "attributes": "Encrypted (JWE). HttpOnly, Secure, SameSite=Lax, Path=/. Deleted on callback."
    },
    {
      "name": "`__Host-01s_session`",
      "holds": "The session token",
      "lifetime": "7 days",
      "attributes": "32 random bytes, base64url (43 characters). HttpOnly, Secure, SameSite=Lax, Path=/. Only its SHA-256 hash is stored."
    }
  ],
  "claims": [
    {
      "claim": "`iss`",
      "example": "`https://01scale.com/api/identity/v1`",
      "meaning": "Who issued the token"
    },
    {
      "claim": "`sub`",
      "example": "`0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e`",
      "meaning": "The user's ID"
    },
    {
      "claim": "`aud`",
      "example": "`01scale`",
      "meaning": "Who the token is for; services reject any other value"
    },
    {
      "claim": "`iat`, `exp`",
      "example": "Unix seconds; `exp` = `iat` + 300",
      "meaning": "Issued at and expiry (5 minutes)"
    },
    {
      "claim": "`jti`",
      "example": "A UUID",
      "meaning": "Unique ID of this token, for logs"
    },
    {
      "claim": "`sid`",
      "example": "`0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f`",
      "meaning": "The session it came from"
    },
    {
      "claim": "`auth`",
      "example": "`session`",
      "meaning": "How the user authenticated (`api_key` arrives with story MVP1-E0-06)"
    },
    {
      "claim": "`scopes`",
      "example": "`[\"*\"]`",
      "meaning": "What the caller may do; a browser session has full access to the user's own data"
    },
    {
      "claim": "`is_admin`",
      "example": "`false`",
      "meaning": "Whether admin-only endpoints are allowed"
    }
  ],
  "errorSample": "{\n  \"type\": \"https://01scale.com/errors/not_authenticated\",\n  \"title\": \"Not signed in\",\n  \"status\": 401,\n  \"detail\": \"Sign in to continue.\",\n  \"code\": \"not_authenticated\",\n  \"request_id\": \"req_0193a61f9c2e\"\n}",
  "endpoints": [
    {
      "id": "auth-login",
      "method": "GET",
      "access": "Public",
      "story": "MVP1-E1-02",
      "title": "Start sign-in or sign-up",
      "summary": "Redirects the browser to Cognito's hosted page. This is a link the browser follows, not a call made from code.",
      "behaviour": [
        "Creates `state` (32 random bytes), `nonce` (32 random bytes) and a PKCE code verifier (43 to 128 characters) with its S256 challenge.",
        "Stores them with `mode` and `return_to` in the encrypted `__Host-01s_login` cookie for 10 minutes.",
        "Redirects to Cognito's authorize endpoint with `response_type=code`, `scope=openid email`, the client ID, the callback URL, `state`, `nonce` and the code challenge.",
        "If the browser already has a valid session, redirects straight to `return_to`."
      ],
      "request": "GET /api/identity/v1/auth/login?mode=signup&return_to=%2Fdocuments HTTP/1.1\nHost: 01scale.com",
      "response": "HTTP/1.1 302 Found\nLocation: https://01scale.auth.us-east-1.amazoncognito.com/oauth2/authorize?response_type=code&client_id=4h8example2k&redirect_uri=https%3A%2F%2F01scale.com%2Fapi%2Fidentity%2Fv1%2Fauth%2Fcallback&scope=openid+email&state=Zk3...&nonce=p9Q...&code_challenge=E9M...&code_challenge_method=S256\nSet-Cookie: __Host-01s_login=eyJhbGciOiJkaXIi...; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax",
      "path": "/api/identity/v1/auth/login",
      "params": [
        {
          "name": "mode",
          "in": "query",
          "type": "string",
          "required": "No",
          "constraints": "`signin` or `signup`. Default `signin`.",
          "meaning": "Which Cognito screen opens first."
        },
        {
          "name": "return_to",
          "in": "query",
          "type": "string",
          "required": "No",
          "constraints": "A path on 01scale.com: starts with one `/`, not `//`, no scheme or host, at most 512 characters. Default `/`.",
          "meaning": "Where to send the user after a successful sign-in."
        }
      ],
      "responses": [
        {
          "status": "302",
          "when": "Always on success",
          "body": "`Location`: the Cognito authorize URL (or `return_to` if already signed in). `Set-Cookie`: `__Host-01s_login`."
        }
      ],
      "errors": [
        {
          "status": "422",
          "code": "`invalid_mode`",
          "when": "`mode` is not `signin` or `signup`."
        },
        {
          "status": "422",
          "code": "`invalid_return_to`",
          "when": "`return_to` is not a same-site path. This blocks open redirects."
        },
        {
          "status": "429",
          "code": "`rate_limited`",
          "when": "More than 20 requests a minute from one IP address."
        }
      ]
    },
    {
      "id": "auth-callback",
      "method": "GET",
      "access": "Public",
      "story": "MVP1-E1-03",
      "title": "Finish sign-in",
      "summary": "Cognito sends the browser here after the user signs in. Identity checks the response, creates the user if new, and creates the session.",
      "behaviour": [
        "Checks `state`, then exchanges `code` with Cognito's token endpoint using the client secret and the PKCE code verifier.",
        "Validates the ID token: signature against Cognito's keys, issuer, audience (the client ID), expiry, and `nonce`.",
        "Requires `email_verified` to be true.",
        "Finds the user by `cognito_sub`. If none exists, creates one and records `auth.signup`.",
        "Revokes that user's sessions created before the token's `auth_time` when the password was just reset (story MVP1-E1-04).",
        "Creates a session, sets `__Host-01s_session`, deletes `__Host-01s_login`, records `auth.signin` and redirects to `return_to`.",
        "Cognito's tokens are used once here and then discarded. They are never stored or sent to the browser."
      ],
      "request": "GET /api/identity/v1/auth/callback?code=4f1c9a7e-example&state=Zk3... HTTP/1.1\nHost: 01scale.com\nCookie: __Host-01s_login=eyJhbGciOiJkaXIi...",
      "response": "HTTP/1.1 302 Found\nLocation: /documents\nSet-Cookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax\nSet-Cookie: __Host-01s_login=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax",
      "path": "/api/identity/v1/auth/callback",
      "params": [
        {
          "name": "code",
          "in": "query",
          "type": "string",
          "required": "Yes, unless `error` is present",
          "constraints": "At most 2,048 characters. Single use, valid a few minutes.",
          "meaning": "The one-time code from Cognito."
        },
        {
          "name": "state",
          "in": "query",
          "type": "string",
          "required": "Yes",
          "constraints": "Must equal the `state` in the `__Host-01s_login` cookie, compared in constant time.",
          "meaning": "Proves this response belongs to the login this browser started."
        },
        {
          "name": "error",
          "in": "query",
          "type": "string",
          "required": "No",
          "constraints": "Set by Cognito when the user cancels or sign-in fails.",
          "meaning": "The provider's error code."
        },
        {
          "name": "__Host-01s_login",
          "in": "cookie",
          "type": "string",
          "required": "Yes",
          "constraints": "Present, not expired, decrypts correctly.",
          "meaning": "The values saved when login started."
        }
      ],
      "responses": [
        {
          "status": "302",
          "when": "Sign-in succeeded",
          "body": "`Location`: `return_to`. `Set-Cookie`: `__Host-01s_session`, and `__Host-01s_login` cleared."
        }
      ],
      "errors": [
        {
          "status": "400",
          "code": "`login_expired`",
          "when": "The login cookie is missing or older than 10 minutes. The user starts again."
        },
        {
          "status": "400",
          "code": "`login_state_mismatch`",
          "when": "`state` does not match, or the ID token's `nonce` does not match. Recorded as `auth.signin_failed`."
        },
        {
          "status": "400",
          "code": "`email_not_verified`",
          "when": "Cognito reports the email as unverified."
        },
        {
          "status": "400",
          "code": "`provider_error`",
          "when": "Cognito returned `error` (for example the user cancelled), or rejected the code."
        },
        {
          "status": "502",
          "code": "`provider_unavailable`",
          "when": "Cognito could not be reached. Safe to start again."
        }
      ]
    },
    {
      "id": "session",
      "method": "GET",
      "access": "Signed in",
      "story": "MVP1-E1-03",
      "title": "Who am I",
      "summary": "Returns the signed-in user and when the session ends. Apps call this to decide whether to show Sign in or the user's email.",
      "behaviour": [
        "Read-only. Does not extend the session in version 1."
      ],
      "request": "GET /api/identity/v1/session HTTP/1.1\nHost: 01scale.com\nCookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM",
      "response": "{\n  \"user\": {\n    \"id\": \"0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e\",\n    \"email\": \"priya@example.com\"\n  },\n  \"session\": {\n    \"id\": \"0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f\",\n    \"expires_at\": \"2026-11-23T09:14:07Z\"\n  },\n  \"auth\": \"session\",\n  \"scopes\": [\n    \"*\"\n  ]\n}",
      "path": "/api/identity/v1/session",
      "params": [
        {
          "name": "__Host-01s_session",
          "in": "cookie",
          "type": "string",
          "required": "Yes",
          "constraints": "43 base64url characters; must match a session that is not revoked and not expired.",
          "meaning": "The session token. Sent by the browser automatically."
        }
      ],
      "responses": [
        {
          "status": "200",
          "when": "A valid session exists",
          "body": "The user, the session's expiry, how they authenticated and their scopes."
        }
      ],
      "errors": [
        {
          "status": "401",
          "code": "`not_authenticated`",
          "when": "No cookie, an unknown token, or a session that is expired or revoked. The same answer in every case."
        },
        {
          "status": "429",
          "code": "`rate_limited`",
          "when": "More than 120 requests a minute for one session."
        }
      ]
    },
    {
      "id": "auth-logout",
      "method": "POST",
      "access": "Signed in",
      "story": "MVP1-E1-03",
      "title": "Sign out",
      "summary": "Ends the current session and returns the address that also signs the user out of Cognito.",
      "behaviour": [
        "Sets `revoked_at` on the session, clears the cookie and records `auth.signout`.",
        "The client then sends the browser to `logout_url`, which clears Cognito's own session so the next sign-in shows the login form.",
        "No request body."
      ],
      "request": "POST /api/identity/v1/auth/logout HTTP/1.1\nHost: 01scale.com\nOrigin: https://01scale.com\nCookie: __Host-01s_session=q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM",
      "response": "{\n  \"logout_url\": \"https://01scale.auth.us-east-1.amazoncognito.com/logout?client_id=4h8example2k&logout_uri=https%3A%2F%2F01scale.com%2F\"\n}",
      "path": "/api/identity/v1/auth/logout",
      "params": [
        {
          "name": "__Host-01s_session",
          "in": "cookie",
          "type": "string",
          "required": "Yes",
          "constraints": "A valid session.",
          "meaning": "The session to end."
        },
        {
          "name": "Origin",
          "in": "header",
          "type": "string",
          "required": "Yes",
          "constraints": "Must be `https://01scale.com` (or localhost in development).",
          "meaning": "Blocks other sites from signing the user out."
        }
      ],
      "responses": [
        {
          "status": "200",
          "when": "The session was ended",
          "body": "`logout_url`: Cognito's logout address, which returns the user to the home page."
        }
      ],
      "errors": [
        {
          "status": "401",
          "code": "`not_authenticated`",
          "when": "There is no valid session to end."
        },
        {
          "status": "403",
          "code": "`origin_not_allowed`",
          "when": "The `Origin` header is missing or from another site."
        }
      ]
    },
    {
      "id": "token",
      "method": "POST",
      "access": "Service",
      "story": "MVP1-E1-03",
      "title": "Exchange a session for an access token",
      "summary": "Called only by the gateway. Turns the session token from the browser's cookie into a 5-minute access token that the other services accept.",
      "behaviour": [
        "Hashes the token, looks up the session and checks it is not revoked or expired.",
        "Signs a JWT with the active signing key (algorithm ES256) and the claims listed under Access token.",
        "The gateway may cache the access token until 30 seconds before it expires."
      ],
      "request": "POST /api/identity/v1/token HTTP/1.1\nAuthorization: Bearer <gateway service key>\nContent-Type: application/json\n\n{\n  \"session_token\": \"q3ZxT0m8Jd1sV5nH2bK7wY4cR9uE6aLpF0gI3oXtNzM\"\n}",
      "response": "{\n  \"access_token\": \"eyJhbGciOiJFUzI1NiIsImtpZCI6ImsyMDI2LTExIn0.eyJpc3MiOiJodHRwczovLzAxc2NhbGUuY29tL2FwaS9pZGVudGl0eS92MSIsInN1YiI6IjAxOTNhNWIyLi4uIn0.MEUCIQ...\",\n  \"token_type\": \"Bearer\",\n  \"expires_in\": 300\n}",
      "path": "/api/identity/v1/token",
      "params": [
        {
          "name": "Authorization",
          "in": "header",
          "type": "string",
          "required": "Yes",
          "constraints": "`Bearer <gateway service key>`. Compared in constant time.",
          "meaning": "Proves the caller is the gateway. Browsers cannot reach this endpoint."
        },
        {
          "name": "session_token",
          "in": "body",
          "type": "string",
          "required": "Yes",
          "constraints": "Exactly 43 base64url characters.",
          "meaning": "The value of the `__Host-01s_session` cookie."
        }
      ],
      "responses": [
        {
          "status": "200",
          "when": "The session is valid",
          "body": "`access_token`, `token_type` (always `Bearer`) and `expires_in` (always `300`)."
        }
      ],
      "errors": [
        {
          "status": "401",
          "code": "`invalid_service_credential`",
          "when": "The gateway key is missing or wrong."
        },
        {
          "status": "401",
          "code": "`invalid_credential`",
          "when": "The session token is unknown, expired or revoked."
        },
        {
          "status": "422",
          "code": "`validation_failed`",
          "when": "`session_token` is missing or malformed."
        }
      ]
    },
    {
      "id": "jwks",
      "method": "GET",
      "access": "Public",
      "story": "MVP1-E1-03",
      "title": "Public keys",
      "summary": "The public keys that verify access tokens. Every service fetches this once and caches it.",
      "behaviour": [
        "Returns the active key and any key retired less than 10 minutes ago, so tokens signed just before a rotation still verify.",
        "Sent with `Cache-Control: public, max-age=300`.",
        "Never contains private key material."
      ],
      "request": "GET /api/identity/v1/jwks HTTP/1.1\nHost: 01scale.com",
      "response": "{\n  \"keys\": [\n    {\n      \"kty\": \"EC\",\n      \"crv\": \"P-256\",\n      \"kid\": \"k2026-11\",\n      \"use\": \"sig\",\n      \"alg\": \"ES256\",\n      \"x\": \"f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU\",\n      \"y\": \"x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0\"\n    }\n  ]\n}",
      "path": "/api/identity/v1/jwks",
      "params": [],
      "responses": [
        {
          "status": "200",
          "when": "Always",
          "body": "A JSON Web Key Set: one entry per public key."
        }
      ],
      "errors": []
    }
  ],
  "noEndpoint": [
    {
      "topic": "Forgot and reset password (MVP1-E1-04)",
      "how": "Handled entirely on Cognito's hosted page, which answers the same way whether or not the account exists. On the next sign-in, Identity revokes that user's older sessions."
    },
    {
      "topic": "Route protection (MVP1-E1-06)",
      "how": "Not an Identity endpoint. The gateway redirects signed-out visitors to `/auth/login` with `return_to` set, returns `401` for API calls without a session, and each service returns `404` for another user's data."
    },
    {
      "topic": "Health and contract",
      "how": "Like every service, Identity also serves `GET /health` and `GET /openapi.json` from the service template (MVP1-E0-05)."
    }
  ],
  "tables": [
    {
      "name": "identity.users",
      "purpose": "One row per person. Created the first time someone completes sign-in with a verified email.",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": "No",
          "default": "generated (UUIDv7)",
          "constraints": "Primary key",
          "meaning": "The user's ID everywhere in 01scale. Other services store it as `owner_id`. Never changes."
        },
        {
          "name": "cognito_sub",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "Unique. 1 to 255 characters",
          "meaning": "Cognito's permanent ID for this person (the `sub` claim). Used to find the user at sign-in. Not the email, because an email can change."
        },
        {
          "name": "email",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "Unique ignoring case. Stored lower-cased. 3 to 320 characters and contains `@`",
          "meaning": "The verified email address from Cognito. Shown in the UI and used by Delivery to send email."
        },
        {
          "name": "email_verified_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "",
          "constraints": "",
          "meaning": "When Identity first saw this email as verified. Always set, because unverified emails are refused."
        },
        {
          "name": "is_admin",
          "type": "boolean",
          "nullable": "No",
          "default": "false",
          "constraints": "",
          "meaning": "Allows admin-only pages and endpoints. Set by hand in the database; there is no API to change it."
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "now()",
          "constraints": "",
          "meaning": "When the user first signed in. Shown as 'joined'."
        }
      ],
      "constraints": [
        "`users_pkey`: primary key (`id`)",
        "`users_cognito_sub_key`: unique (`cognito_sub`)",
        "`users_email_lower_key`: unique index on `lower(email)`",
        "`users_email_format_check`: `email = lower(email)` and `email like '%_@_%'` and `length(email) between 3 and 320`"
      ],
      "sampleCols": [
        "id",
        "cognito_sub",
        "email",
        "email_verified_at",
        "is_admin",
        "created_at"
      ],
      "sampleRows": [
        [
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "a1b2c3d4-5e6f-7081-92a3-b4c5d6e7f809",
          "priya@example.com",
          "2026-11-16 09:14:07+00",
          "false",
          "2026-11-16 09:14:07+00"
        ],
        [
          "0193a5c9-11aa-7d42-8f10-2b7c9d0e1f2a",
          "0f9e8d7c-6b5a-4938-2716-0a1b2c3d4e5f",
          "owner@example.com",
          "2026-11-16 10:02:41+00",
          "true",
          "2026-11-16 10:02:41+00"
        ]
      ]
    },
    {
      "name": "identity.sessions",
      "purpose": "One row per browser sign-in. A request is signed in if its cookie matches a row that is neither revoked nor expired.",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": "No",
          "default": "generated (UUIDv7)",
          "constraints": "Primary key",
          "meaning": "The session's ID. Appears in access tokens as `sid` and in audit events."
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": "No",
          "default": "",
          "constraints": "Foreign key to `identity.users(id)`, delete cascades",
          "meaning": "Whose session this is."
        },
        {
          "name": "token_hash",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "Unique. Exactly 64 lower-case hex characters",
          "meaning": "SHA-256 of the cookie's token. The token itself is never stored, so a database leak cannot be used to sign in."
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "now()",
          "constraints": "",
          "meaning": "When the user signed in."
        },
        {
          "name": "expires_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "",
          "constraints": "Later than `created_at`",
          "meaning": "When the session stops working: 7 days after `created_at`."
        },
        {
          "name": "revoked_at",
          "type": "timestamptz",
          "nullable": "Yes",
          "default": "",
          "constraints": "Not earlier than `created_at`",
          "meaning": "Set when the user signs out or their sessions are revoked after a password reset. Empty means still active."
        }
      ],
      "constraints": [
        "`sessions_pkey`: primary key (`id`)",
        "`sessions_user_id_fkey`: foreign key (`user_id`) references `identity.users(id)` on delete cascade",
        "`sessions_token_hash_key`: unique (`token_hash`)",
        "`sessions_token_hash_check`: `token_hash ~ '^[0-9a-f]{64}$'`",
        "`sessions_expiry_check`: `expires_at > created_at`",
        "`sessions_revoked_check`: `revoked_at is null or revoked_at >= created_at`",
        "`sessions_user_id_idx`: index on (`user_id`, `created_at` desc)"
      ],
      "sampleCols": [
        "id",
        "user_id",
        "token_hash",
        "created_at",
        "expires_at",
        "revoked_at"
      ],
      "sampleRows": [
        [
          "0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f",
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "9f2c1e7ab4d08c35e6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7",
          "2026-11-16 09:14:07+00",
          "2026-11-23 09:14:07+00",
          "(empty)"
        ],
        [
          "0193a61f-03b7-7e90-b1c4-6a7b8c9d0e1f",
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "1b7d4e90c2a5f8361d0e9c8b7a6f5e4d3c2b1a09f8e7d6c5b4a3928170615243",
          "2026-11-10 18:30:00+00",
          "2026-11-17 18:30:00+00",
          "2026-11-12 08:05:19+00"
        ]
      ]
    },
    {
      "name": "identity.signing_keys",
      "purpose": "The keys that sign access tokens. Usually one row; two for a few minutes during a rotation.",
      "columns": [
        {
          "name": "kid",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "Primary key. 1 to 64 characters",
          "meaning": "The key's name, for example `k2026-11`. Written into every token so a service knows which public key to use."
        },
        {
          "name": "public_jwk",
          "type": "jsonb",
          "nullable": "No",
          "default": "",
          "constraints": "Must contain `kty`, `crv`, `x`, `y` and must not contain `d`",
          "meaning": "The public half, in the format served by `GET /jwks`."
        },
        {
          "name": "private_key_encrypted",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "",
          "meaning": "The private half, encrypted with a key held only in the service's environment. Never leaves the service."
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "now()",
          "constraints": "",
          "meaning": "When the key was created."
        },
        {
          "name": "retired_at",
          "type": "timestamptz",
          "nullable": "Yes",
          "default": "",
          "constraints": "Not earlier than `created_at`",
          "meaning": "When the key stopped signing new tokens. Empty means it is the active key."
        }
      ],
      "constraints": [
        "`signing_keys_pkey`: primary key (`kid`)",
        "`signing_keys_public_only_check`: `public_jwk ?& array['kty','crv','x','y']` and not `public_jwk ? 'd'`",
        "`signing_keys_one_active_idx`: unique index on (`(true)`) where `retired_at is null`, so only one key can be active",
        "`signing_keys_retired_check`: `retired_at is null or retired_at >= created_at`"
      ],
      "sampleCols": [
        "kid",
        "public_jwk",
        "private_key_encrypted",
        "created_at",
        "retired_at"
      ],
      "sampleRows": [
        [
          "k2026-11",
          "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"f83OJ3D2…\",\"y\":\"x_FEzRu9…\"}",
          "v1:AES-GCM:9c1f…(encrypted)",
          "2026-11-01 00:00:00+00",
          "(empty)"
        ]
      ]
    },
    {
      "name": "identity.audit_events",
      "purpose": "An append-only record of what happened. Every service has this table from the service template; these are the events login writes.",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": "No",
          "default": "generated (UUIDv7)",
          "constraints": "Primary key",
          "meaning": "The event's ID."
        },
        {
          "name": "actor_id",
          "type": "uuid",
          "nullable": "Yes",
          "default": "",
          "constraints": "",
          "meaning": "The user who acted. Empty when sign-in failed before a user was known."
        },
        {
          "name": "actor_type",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "One of `user`, `api_key`, `service`, `system`",
          "meaning": "What kind of caller acted."
        },
        {
          "name": "action",
          "type": "text",
          "nullable": "No",
          "default": "",
          "constraints": "For login: `auth.signup`, `auth.signin`, `auth.signout`, `auth.signin_failed`, `auth.sessions_revoked`",
          "meaning": "What happened."
        },
        {
          "name": "target_type",
          "type": "text",
          "nullable": "Yes",
          "default": "",
          "constraints": "",
          "meaning": "The kind of thing acted on, for example `session`."
        },
        {
          "name": "target_id",
          "type": "uuid",
          "nullable": "Yes",
          "default": "",
          "constraints": "",
          "meaning": "Its ID."
        },
        {
          "name": "metadata",
          "type": "jsonb",
          "nullable": "No",
          "default": "'{}'",
          "constraints": "Allow-listed keys only: `reason`, `mode`, `count`. Never tokens, codes, passwords or email addresses",
          "meaning": "Small extra facts about the event."
        },
        {
          "name": "request_id",
          "type": "text",
          "nullable": "Yes",
          "default": "",
          "constraints": "",
          "meaning": "The request that caused it, to trace across services."
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": "No",
          "default": "now()",
          "constraints": "",
          "meaning": "When it happened."
        }
      ],
      "constraints": [
        "`audit_events_pkey`: primary key (`id`)",
        "`audit_events_actor_type_check`: `actor_type in ('user','api_key','service','system')`",
        "The service's database login has `INSERT` and `SELECT` only on this table: no `UPDATE`, no `DELETE`",
        "`audit_events_actor_idx`: index on (`actor_id`, `created_at` desc)"
      ],
      "sampleCols": [
        "id",
        "actor_id",
        "actor_type",
        "action",
        "target_type",
        "target_id",
        "metadata",
        "created_at"
      ],
      "sampleRows": [
        [
          "0193a5b2-9d41-7f02-8c55-0a1b2c3d4e5f",
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "user",
          "auth.signup",
          "user",
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "{}",
          "2026-11-16 09:14:07+00"
        ],
        [
          "0193a5b2-9d42-7a6b-9d77-1b2c3d4e5f6a",
          "0193a5b2-7c1e-7a3f-9b2d-4e6f8a1c2d3e",
          "user",
          "auth.signin",
          "session",
          "0193a5b2-9d40-7c11-a6e3-5f1b2c3d4e5f",
          "{\"mode\":\"signup\"}",
          "2026-11-16 09:14:07+00"
        ],
        [
          "0193a7d0-4410-7b3c-8e21-2c3d4e5f6a7b",
          "(empty)",
          "system",
          "auth.signin_failed",
          "(empty)",
          "(empty)",
          "{\"reason\":\"login_state_mismatch\"}",
          "2026-11-16 11:40:52+00"
        ]
      ]
    }
  ],
  "otherTables": "The service template also gives Identity `idempotency_keys` and `outbound_events`. Login does not use them: its endpoints are redirects and reads, and the only event Identity announces (`identity.user.deleted`) belongs to Account management.",
  "rules": [
    {
      "level": "API level: checked on every request before anything is stored",
      "items": [
        "`mode` must be `signin` or `signup`.",
        "`return_to` must be a path on 01scale.com (starts with one `/`, not `//`, at most 512 characters).",
        "`state` and `nonce` must match the values in the login cookie, compared in constant time.",
        "The login cookie must be present and less than 10 minutes old.",
        "`session_token` must be exactly 43 base64url characters.",
        "`POST /auth/logout` must carry an `Origin` header from 01scale.com.",
        "`POST /token` must carry the gateway's service key.",
        "Rate limits at the gateway: 20 a minute per IP on `/auth/login` and `/auth/callback`; 120 a minute per session on `/session`.",
        "Every error uses the same shape, `application/problem+json`, with a stable `code`."
      ]
    },
    {
      "level": "Schema level: enforced by the database, whatever the code does",
      "items": [
        "Primary keys on every table; `cognito_sub`, `lower(email)` and `token_hash` are unique.",
        "A session cannot exist without its user (foreign key), and is deleted with the user.",
        "`token_hash` must be 64 hex characters; `expires_at` must be after `created_at`.",
        "`email` must be lower-case, contain `@`, and be 3 to 320 characters.",
        "Only one signing key can be active; a stored public key can never contain private material.",
        "Audit events can be added and read but never changed or deleted.",
        "Identity's database login can reach only the `identity` schema. No other service can read these tables."
      ]
    },
    {
      "level": "Data model level: business rules the service guarantees",
      "items": [
        "A user exists only for a verified email. Unverified sign-ins create nothing.",
        "One person is one user: matched by Cognito's permanent ID, never by email alone.",
        "A session is valid only if it is not revoked and not past `expires_at`. Both are checked on every use.",
        "Session lifetime is 7 days and is not extended by use (sliding expiry arrives in version 2).",
        "Access tokens live 5 minutes and are never stored. Signing out stops new tokens at once; an already-issued token works for at most 5 more minutes.",
        "Only hashes of session tokens are stored. Cognito's tokens and the user's password are never stored at all.",
        "After a password reset, all of that user's older sessions are revoked at the next sign-in.",
        "Unknown, expired and revoked sessions all get the same `401`, so an attacker learns nothing.",
        "Every sign-up, sign-in, sign-out and failed sign-in writes an audit event in the same transaction as the change."
      ]
    }
  ],
  "env": [
    {
      "name": "COGNITO_ISSUER",
      "value": "`https://cognito-idp.us-east-1.amazonaws.com/<user pool ID>`",
      "secret": "No"
    },
    {
      "name": "COGNITO_DOMAIN",
      "value": "`https://<prefix>.auth.us-east-1.amazoncognito.com`",
      "secret": "No"
    },
    {
      "name": "COGNITO_CLIENT_ID",
      "value": "The app client's ID",
      "secret": "No"
    },
    {
      "name": "COGNITO_CLIENT_SECRET",
      "value": "The app client's secret",
      "secret": "Yes"
    },
    {
      "name": "APP_BASE_URL",
      "value": "`https://01scale.com`",
      "secret": "No"
    },
    {
      "name": "IDENTITY_DATABASE_URL",
      "value": "Neon connection string for the `identity` role",
      "secret": "Yes"
    },
    {
      "name": "LOGIN_COOKIE_KEY",
      "value": "32 random bytes, base64: encrypts the login cookie",
      "secret": "Yes"
    },
    {
      "name": "SIGNING_KEY_ENCRYPTION_KEY",
      "value": "32 random bytes, base64: encrypts stored private keys",
      "secret": "Yes"
    },
    {
      "name": "GATEWAY_SERVICE_KEY",
      "value": "32 random bytes, base64: shared with the gateway only",
      "secret": "Yes"
    }
  ],
  "openQuestions": [
    "When sign-in fails at the callback, a person in a browser sees a JSON error. I propose redirecting browsers to a friendly `/sign-in-error` page and keeping JSON for API clients.",
    "Session lifetime is fixed at 7 days. Shorter is safer; longer is more convenient.",
    "Rate limit numbers are starting values to be tuned once there is real traffic."
  ]
};
