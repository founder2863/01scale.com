"""Builds the site's product page data and the per-service design docs.

- runs scripts/site/identity_design.py (docs/services/identity/README, API-SPEC, DATA-MODEL)
- writes docs/services/identity/USER-JOURNEYS.md, UI-COMPONENTS.md, SCHEMA.md
- writes app/products/data.ts (every module, read from docs/epics/*.md)
- writes app/products/identity.ts (the detailed content for Login using AWS)

Run from the repo root:  npm run site:data
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "identity_design.py")).read()
G = {}
exec(src.split("# ------------------------------------------------------------------ markdown")[0], G)
exec(src, {"__name__": "identity_design"})  # writes README, API-SPEC and DATA-MODEL

HEAD = G["HEAD"] if "HEAD" in G else "> **Version 1 · Login with AWS Cognito.** Status: designed, not built.\n"


def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "\\|").replace("\n", " ") for c in r) + " |")
    return "\n".join(out)


# ------------------------------------------------------------------ Identity: journeys
JOURNEYS = [
    {
        "name": "Create an account", "who": "A new visitor", "trigger": "Taps Create account on any 01scale page.",
        "stories": ["MVP1-E1-02", "MVP1-E1-03"],
        "steps": [
            ("Taps Create account.", "Identity starts a login and sends the browser to the sign-up page hosted by AWS Cognito."),
            ("Enters an email and a password of 12 or more characters.", "Cognito checks the password rules and emails a 6-digit code."),
            ("Enters the code from the email.", "Cognito marks the email as verified and sends the browser back to 01scale."),
            ("Lands on the page they wanted, signed in, with their email shown in the header.", "Identity creates the user and a session, sets the session cookie, and records `auth.signup` and `auth.signin`."),
        ],
        "outcome": "A verified user exists and is signed in for 7 days on this browser.",
    },
    {
        "name": "Sign in", "who": "A returning user", "trigger": "Taps Sign in.",
        "stories": ["MVP1-E1-03"],
        "steps": [
            ("Taps Sign in.", "Identity sends the browser to Cognito's sign-in page."),
            ("Enters email and password.", "Cognito checks them and sends the browser back with a one-time code."),
            ("Lands on the page they wanted, signed in.", "Identity checks the response, finds the user, creates a session and records `auth.signin`."),
        ],
        "outcome": "A new session on this browser. Sessions on other devices are untouched.",
    },
    {
        "name": "Open a protected page while signed out", "who": "Anyone following a link", "trigger": "Opens a page such as `/documents` without being signed in.",
        "stories": ["MVP1-E1-06"],
        "steps": [
            ("Opens the link.", "The gateway sees there is no session and redirects to sign-in, remembering the page as `return_to`."),
            ("Signs in (or creates an account).", "As in the journeys above."),
            ("Arrives on the page they first asked for.", "Identity redirects to `return_to`, which may only be a page on 01scale.com."),
        ],
        "outcome": "The user never has to find their way back.",
    },
    {
        "name": "Forgot password", "who": "A user who cannot sign in", "trigger": "Taps Forgot your password? on the sign-in page.",
        "stories": ["MVP1-E1-04"],
        "steps": [
            ("Enters their email.", "Cognito answers the same way whether or not the account exists, and emails a reset code if it does."),
            ("Enters the code and a new password.", "Cognito changes the password."),
            ("Signs in with the new password.", "Identity creates a new session and revokes every older session for that user, recording `auth.sessions_revoked`."),
        ],
        "outcome": "Only the browser that just signed in stays signed in.",
    },
    {
        "name": "Sign out", "who": "A signed-in user", "trigger": "Opens the user menu and taps Sign out.",
        "stories": ["MVP1-E1-03"],
        "steps": [
            ("Taps Sign out.", "Identity revokes the session, clears the cookie and records `auth.signout`."),
            ("Is returned to the home page, signed out.", "The browser is sent through Cognito's logout address so Cognito's own session ends too."),
        ],
        "outcome": "The next sign-in shows the login form again. A token already issued to a service stops working within 5 minutes.",
    },
]

EDGE_CASES = [
    ("Cancels on the sign-in page", "Returns to 01scale signed out, with a short message.", "`provider_error`"),
    ("Takes longer than 10 minutes to sign in", "Sees 'Sign-in took too long' and a button to start again.", "`login_expired`"),
    ("Opens the sign-in link in a different browser", "Sees 'Sign-in could not be completed' and starts again.", "`login_state_mismatch`"),
    ("Has not verified their email", "Is asked to enter the code first; no 01scale user is created.", "`email_not_verified`"),
    ("Session reaches 7 days", "Is asked to sign in again and returns to the same page.", "`not_authenticated`"),
    ("AWS Cognito is unavailable", "Sees 'Sign-in is temporarily unavailable. Try again.'", "`provider_unavailable`"),
    ("Has an email longer than 254 characters", "Sees 'This email address can't be used with 01scale.' No user is created.", "`email_not_supported`"),
]

# ------------------------------------------------------------------ Identity: UI components
COMPONENTS = [
    {
        "name": "SignInButton", "kind": "Component", "purpose": "A link that starts sign-in.",
        "props": [("returnTo", "string, optional", "Page to land on afterwards. Defaults to the current page."), ("label", "string, optional", "Button text. Default 'Sign in'.")],
        "states": ["Default", "Focus (visible outline)"],
        "calls": ["`GET /auth/login?mode=signin`"],
    },
    {
        "name": "CreateAccountButton", "kind": "Component", "purpose": "A link that starts sign-up.",
        "props": [("returnTo", "string, optional", "Page to land on afterwards."), ("label", "string, optional", "Button text. Default 'Create account'.")],
        "states": ["Default", "Focus"],
        "calls": ["`GET /auth/login?mode=signup`"],
    },
    {
        "name": "SessionProvider and useSession()", "kind": "Provider and hook", "purpose": "Asks Identity once who is signed in and shares the answer with every component on the page.",
        "props": [("children", "nodes", "The part of the page that needs to know the user.")],
        "states": ["`loading`", "`signed_in` with `user.id` and `user.email`", "`signed_out`"],
        "calls": ["`GET /session`"],
    },
    {
        "name": "UserMenu", "kind": "Component", "purpose": "Shows the signed-in user's email with a Sign out action, or the Sign in button when signed out.",
        "props": [("returnTo", "string, optional", "Passed to the Sign in button.")],
        "states": ["Loading (placeholder of the same size, so the header does not jump)", "Signed out (shows SignInButton)", "Signed in, closed", "Signed in, open"],
        "calls": ["`GET /session` (through useSession)", "`POST /auth/logout`"],
    },
    {
        "name": "SignOutButton", "kind": "Component", "purpose": "Ends the session and follows the returned logout address.",
        "props": [("label", "string, optional", "Button text. Default 'Sign out'.")],
        "states": ["Default", "Working (disabled while the request runs)", "Failed (keeps the user signed in and shows a retry)"],
        "calls": ["`POST /auth/logout`"],
    },
    {
        "name": "RequireSignIn", "kind": "Wrapper", "purpose": "Wraps a page that needs a signed-in user. Backs up the gateway's redirect for pages rendered in the browser.",
        "props": [("children", "nodes", "The protected content."), ("fallback", "node, optional", "Shown while the session is loading.")],
        "states": ["Loading (shows fallback)", "Signed in (shows children)", "Signed out (redirects to sign-in with `return_to` set to the current page)"],
        "calls": ["`GET /session` (through useSession)", "`GET /auth/login`"],
    },
    {
        "name": "SignInError", "kind": "Page", "purpose": "The page at `/sign-in-error` that a browser lands on when sign-in fails: a plain-language message and one button to start again.",
        "props": [("code", "string", "The error code from the callback, mapped to a friendly message.")],
        "states": ["One message per error code", "Unknown code (generic message)"],
        "calls": ["`GET /auth/login`"],
    },
]

HOSTED_PAGES = [
    ("Sign in", "Email and password, with links to create an account and to reset the password."),
    ("Create account", "Email and password with the 12-character rule shown."),
    ("Verify email", "Enter the 6-digit code; resend the code."),
    ("Forgot password", "Enter email, then the code and a new password."),
]

UI_RULES = [
    "Components call only the Identity API. They never read cookies or tokens from JavaScript; the session cookie is HttpOnly.",
    "They ship as the package `packages/ui-identity` and are used by any app, not only DocFlow.",
    "Every state listed above is designed, including loading and failure.",
    "Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, and usable at 320 pixels wide in light and dark mode.",
    "In version 1 the forms that take a password are AWS Cognito's hosted pages. 01scale never renders a password field.",
]

# ------------------------------------------------------------------ Identity: data model and schema
ENTITIES = [
    ("User", "`identity.users`", "A person who has signed in at least once with a verified email.", "Has many sessions. Is referenced by every other service as `owner_id`, by value only."),
    ("Session", "`identity.sessions`", "One browser's proof of sign-in, valid for 7 days.", "Belongs to one user. Deleted with the user."),
    ("Signing key", "`identity.signing_keys`", "The key pair that signs access tokens.", "Stands alone. One is active at a time."),
    ("Audit event", "`identity.audit_events`", "A permanent record that something happened.", "Refers to a user and a target by ID, with no foreign key, so the record survives if the user is deleted."),
]

LIFECYCLES = [
    ("User", "Created at the first successful sign-in → lives until the account is deleted (Account management)."),
    ("Session", "Active from sign-in → ends when it is revoked (sign-out, password reset) or when 7 days pass, whichever is first. It is never reactivated."),
    ("Signing key", "Active from creation → retired when a new key replaces it → still published for 10 minutes so recent tokens verify → no longer published."),
    ("Access token", "Never stored. Created on request, valid for 5 minutes, checked by signature only."),
]

DDL = """-- Identity service, version 1 (login). Schema: identity.
-- IDs are UUIDv7 values generated by the service.

create schema if not exists identity;

create table identity.users (
  id                uuid        primary key,
  cognito_sub       text        not null,
  email             text        not null,
  email_verified_at timestamptz not null,
  is_admin          boolean     not null default false,
  created_at        timestamptz not null default now(),

  constraint users_cognito_sub_key unique (cognito_sub),
  constraint users_cognito_sub_check check (length(cognito_sub) between 1 and 255),
  constraint users_email_format_check check (
    email = lower(email)
    and email like '%_@_%'
    and length(email) between 3 and 254
  )
);

create unique index users_email_lower_key on identity.users (lower(email));

create table identity.sessions (
  id          uuid        primary key,
  user_id     uuid        not null,
  token_hash  text        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,

  constraint sessions_user_id_fkey foreign key (user_id)
    references identity.users (id) on delete cascade,
  constraint sessions_token_hash_key unique (token_hash),
  constraint sessions_token_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint sessions_expiry_check check (expires_at > created_at),
  constraint sessions_revoked_check check (revoked_at is null or revoked_at >= created_at)
);

create index sessions_user_id_idx on identity.sessions (user_id, created_at desc);

create table identity.signing_keys (
  kid                   text        primary key,
  public_jwk            jsonb       not null,
  private_key_encrypted text        not null,
  created_at            timestamptz not null default now(),
  retired_at            timestamptz,

  constraint signing_keys_kid_check check (length(kid) between 1 and 64),
  constraint signing_keys_public_only_check check (
    public_jwk ?& array['kty', 'crv', 'x', 'y'] and not public_jwk ? 'd'
  ),
  constraint signing_keys_retired_check check (retired_at is null or retired_at >= created_at)
);

-- Only one key can be active (not retired) at a time.
create unique index signing_keys_one_active_idx
  on identity.signing_keys ((true)) where retired_at is null;

create table identity.audit_events (
  id          uuid        primary key,
  actor_id    uuid,
  actor_type  text        not null,
  action      text        not null,
  target_type text,
  target_id   uuid,
  metadata    jsonb       not null default '{}',
  request_id  text,
  created_at  timestamptz not null default now(),

  constraint audit_events_actor_type_check
    check (actor_type in ('user', 'api_key', 'service', 'system'))
);

create index audit_events_actor_idx on identity.audit_events (actor_id, created_at desc);

-- The service's database login can reach only this schema,
-- and can add and read audit events but never change or delete them.
grant usage on schema identity to identity_service;
grant select, insert, update, delete
  on identity.users, identity.sessions, identity.signing_keys to identity_service;
grant select, insert on identity.audit_events to identity_service;
"""

SAMPLE_QUERIES = [
    ("Find the session for a cookie (every signed-in request)",
     "select s.id, s.user_id, s.expires_at\nfrom identity.sessions s\nwhere s.token_hash = $1\n  and s.revoked_at is null\n  and s.expires_at > now();"),
    ("Sign out",
     "update identity.sessions\nset revoked_at = now()\nwhere id = $1 and revoked_at is null;"),
    ("Revoke older sessions after a password reset",
     "update identity.sessions\nset revoked_at = now()\nwhere user_id = $1\n  and created_at < $2      -- the sign-in time reported by Cognito\n  and revoked_at is null;"),
]

os.makedirs("docs/services/identity", exist_ok=True)
jm = [f"# Identity service — user journeys\n\n{HEAD}\nWhat a person sees and what the system does, for login in version 1.\n"]
for j in JOURNEYS:
    jm.append(f"## {j['name']}\n\n**Who:** {j['who']} · **Starts when:** {j['trigger']} · **Stories:** " + ", ".join(f"`{s}`" for s in j["stories"]) + "\n\n" + table(["Step", "The person", "The system"], [(i + 1, a, b) for i, (a, b) in enumerate(j["steps"])]) + f"\n\n**Result:** {j['outcome']}\n")
jm.append("## When something goes wrong\n\n" + table(["Situation", "What the person sees", "Error code"], EDGE_CASES) + "\n")
open("docs/services/identity/USER-JOURNEYS.md", "w").write("\n".join(jm))

um = [f"# Identity service — UI components\n\n{HEAD}\nThe components the Identity service ships for apps to use, as the package `packages/ui-identity`. Designed, not built.\n", "## Rules\n\n" + "\n".join(f"- {r}" for r in UI_RULES) + "\n"]
for c in COMPONENTS:
    um.append(f"## {c['name']}\n\n*{c['kind']}.* {c['purpose']}\n\n" + table(["Input", "Type", "Meaning"], [(f"`{a}`", b, d) for a, b, d in c["props"]]) + "\n\n**States:** " + "; ".join(c["states"]) + ".\n\n**Calls:** " + ", ".join(c["calls"]) + ".\n")
um.append("## Pages provided by AWS Cognito in version 1\n\nThese are not 01scale components. They are replaced by 01scale's own pages in version 2.\n\n" + table(["Page", "What it does"], HOSTED_PAGES) + "\n")
open("docs/services/identity/UI-COMPONENTS.md", "w").write("\n".join(um))

sm = f"# Identity service — schema\n\n{HEAD}\nThe SQL for the tables login uses. What each field means is in [`DATA-MODEL.md`](DATA-MODEL.md). In the build this is produced by Drizzle migrations; the SQL below is the target.\n\n```sql\n{DDL}```\n\n## Common queries\n\n" + "\n".join(f"**{t}**\n\n```sql\n{q}\n```\n" for t, q in SAMPLE_QUERIES)
open("docs/services/identity/SCHEMA.md", "w").write(sm)

# ------------------------------------------------------------------ parse the epics
STORY_RE = re.compile(r"^### ((MVP\d)-E(\d+)-(\d+)) · (.+?) — ([SML])$")


def parse(path):
    stories, epics = {}, {}
    epic, cur, mode = None, None, None
    for line in open(path).read().split("\n"):
        if line.startswith("## E"):
            m = re.match(r"^## (E\d+) · (.+)$", line)
            epic = m.group(1)
            title = re.sub(r"\s*\(MVP\d \"[a-g]\"\)", "", m.group(2)).replace(" — `llm`", "")
            epics[epic] = {"id": epic, "title": title, "goal": ""}
            cur = None
            continue
        if line.startswith("**Goal:**") and epic and cur is None:
            epics[epic]["goal"] = line.replace("**Goal:**", "").strip()
            continue
        m = STORY_RE.match(line)
        if m:
            cur = {"id": m.group(1), "phase": m.group(2), "epic": "E" + m.group(3), "title": m.group(5), "size": m.group(6),
                   "pending": "", "story": "", "acs": [], "evals": "", "service": "", "api": [], "db": ""}
            stories[cur["id"]] = cur
            mode = None
            continue
        if line.startswith("## ") or line.strip() == "---":
            cur = None
            continue
        if cur is None or not line.strip():
            continue
        if line.startswith("**Status:"):
            cur["pending"] = re.sub(r"\*\*Status: pending\.\*\*\s*", "", line).strip() or "Pending"
        elif line.startswith("- **AC"):
            m2 = re.match(r"^- \*\*(AC\d+):\*\* (.*)$", line)
            cur["acs"].append({"label": m2.group(1), "text": m2.group(2)})
            mode = None
        elif line.startswith("- **Evals:**"):
            cur["evals"] = line.replace("- **Evals:**", "").strip()
        elif line.startswith("- **Service:**"):
            cur["service"] = line.replace("- **Service:**", "").strip()
        elif line.startswith("- **API design:**"):
            rest = line.replace("- **API design:**", "").strip()
            if rest:
                cur["api"].append(rest)
            mode = "api"
        elif line.startswith("- **Database design:**"):
            cur["db"] = line.replace("- **Database design:**", "").strip()
            mode = None
        elif line.startswith("  - ") and mode == "api":
            cur["api"].append(line[4:].strip())
        elif not line.startswith("-"):
            cur["story"] = (cur["story"] + " " + line.strip()).strip()
    return stories, epics


S1, E1 = parse("docs/epics/MVP1-EPICS.md")
S2, E2 = parse("docs/epics/MVP2-EPICS.md")
STORIES = {**S1, **S2}
EPICS = {**E1, **E2}

# slug, title, group, service, description, epic, story ids
MODULES = [
    ("login-using-aws", "Login using AWS", "MVP1", "Identity", "Sign up, sign in and password reset with AWS Cognito, integrated through standard OIDC.", "E1",
     ["MVP1-E1-01", "MVP1-E1-02", "MVP1-E1-03", "MVP1-E1-04", "MVP1-E1-06", "MVP1-E1-07", "MVP1-E1-08"]),
    ("account-management", "Account management", "MVP1", "Identity", "An account page to view and update your details, delete your account, and create API keys for AI agents.", "E1",
     ["MVP1-E1-05", "MVP1-E0-06"]),
    ("document-upload", "Document upload", "MVP1", "Upload", "Upload a file from the browser straight to a private AWS S3 bucket.", "E2", None),
    ("extraction-with-claude", "Extraction with Claude", "MVP1", "LLM Extraction", "Claude turns a document into structured data, with a confidence score and evidence for every field.", "E3", None),
    ("human-review", "Human review", "MVP1", "Human Review", "Review only the fields the system is unsure about, with the evidence beside each one.", "E4", None),
    ("json-and-csv-output", "JSON and CSV output", "MVP1", "DocFlow app", "Preview the final JSON, metadata and CSV before paying.", "E5", None),
    ("payment", "Payment", "MVP1", "Payment", "A one-time payment with Stripe Checkout in test mode.", "E6", None),
    ("download-and-email-delivery", "Email delivery", "MVP1", "Delivery", "Get the files immediately by secure download, with a copy by email.", "E7", None),
    ("passwordless-login", "Passwordless login, built by hand", "MVP2", "Identity", "Magic links, passkeys and sessions on our own identity provider, replacing AWS Cognito.", "E8", None),
    ("multi-document-pipeline", "Multi-document pipeline", "MVP2", "LLM Extraction", "Process a batch of documents in parallel with LangGraph on AWS Lambda.", "E9", None),
    ("llm-as-judge", "LLM as judge", "MVP2", "LLM Extraction", "A second, independent model check that catches the extractor's mistakes.", "E10", None),
    ("web-enrichment-and-chat-correction", "Web enrichment and chat correction", "MVP2", "LLM Extraction and Human Review", "Add cited context from the web, and fix data by describing the change in plain language.", "E11", None),
    ("multi-document-review", "Multi-document review and outputs", "MVP2", "DocFlow app", "Review a whole batch in tabs and export combined outputs.", "E12", None),
    ("saved-payment-methods", "Saved payment methods", "MVP2", "Payment", "Saved cards, a default method and payment history.", "E13", None),
    ("notifications", "Notifications", "MVP2", "Delivery", "Email, SMS and push notifications, with preferences per channel and event.", "E14", None),
]

# Module designs written with the shared renderer: scripts/site/<key>_design.py,
# each defining KEY, MODULE and COMPLETE. Identity's login design predates the
# renderer and is built above.
import glob
import importlib.util
import sys
sys.path.insert(0, HERE)
import render  # noqa: E402

RENDERED = {}
for path in sorted(glob.glob(os.path.join(HERE, "*_design.py"))):
    if path.endswith("identity_design.py"):
        continue
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    _, all_stages = render.staged(mod.MODULE, mod.KEY)
    RENDERED[mod.KEY] = (render.render(mod.MODULE, mod.KEY), getattr(mod, "COMPLETE", False) and all_stages)

# Status shown on the site: Designed when finished, In design while documents are
# still being added, Planned otherwise.
DESIGNED = {"login-using-aws"} | {m["slug"] for m, done in RENDERED.values() if done and m["slug"]}
IN_DESIGN = {m["slug"] for m, done in RENDERED.values() if not done and m["slug"]}

API_LINE = re.compile(r"^`(GET|POST|PUT|PATCH|DELETE) ([^`]+)` \(([^)]+)\) — (.*)$")
products = []
for n, (slug, title, group, service, desc, epic, ids) in enumerate(MODULES, start=1):
    if ids is None:
        ids = sorted((s for s in STORIES if s.startswith(group) and STORIES[s]["epic"] == epic), key=lambda s: int(s.rsplit("-", 1)[1]))
    assert ids and all(i in STORIES for i in ids), (slug, ids)
    stories = [STORIES[i] for i in ids]
    endpoints, notes = [], []
    for st in stories:
        for line in st["api"]:
            m = API_LINE.match(line)
            if m:
                summary, _, detail = m.group(4).partition(". ")
                endpoints.append({"method": m.group(1), "path": m.group(2), "access": m.group(3).capitalize(), "summary": summary.rstrip(".") + ".", "detail": detail, "story": st["id"]})
            else:
                notes.append({"story": st["id"], "text": line})
    products.append({
        "slug": slug, "number": n, "title": title, "group": group, "service": service, "description": desc,
        "status": "Designed" if slug in DESIGNED else "In design" if slug in IN_DESIGN else "Planned",
        "detailed": slug in DESIGNED or slug in IN_DESIGN,
        "epic": EPICS[epic],
        "stories": [{k: st[k] for k in ("id", "title", "size", "pending", "story", "acs", "evals", "service")} for st in stories],
        "endpoints": endpoints, "apiNotes": notes,
        "dbNotes": [{"story": st["id"], "title": st["title"], "text": st["db"]} for st in stories if st["db"]],
    })

os.makedirs("app/products", exist_ok=True)
open("app/products/data.ts", "w").write(
    "// Generated from docs/epics/*.md. One entry per product module. Design only: nothing here is built yet.\n"
    "export const products = " + json.dumps(products, indent=2, ensure_ascii=False) + ";\n\n"
    "export type Product = (typeof products)[number];\n")

guide = json.loads(json.dumps({
    # Which product page this content fills, and where its documents live.
    "slug": "login-using-aws",
    "docsPath": "docs/services/identity",
    "extraDocs": [{"path": "docs/infra/cognito.md", "label": "AWS Cognito setup steps"}],
    "labels": {
        "flow": "How login works",
        "hosted": "Pages provided by AWS Cognito in version 1",
    },
    "notes": {
        "journey": "What a person sees and what the system does, for login in version 1.",
        "ui": "What the Identity service ships for apps to use, as the package `packages/ui-identity`.",
        "hosted": "These are not 01scale components. 01scale's own pages replace them in version 2.",
        "token": "A signed token (JWT, ES256) that lives 5 minutes. Browsers never see it.",
        "schema": "The SQL for the tables login uses, in the `identity` schema. No other service can read them.",
    },
    "notStored": [
        "Passwords: they live only in AWS Cognito.",
        "Cognito's tokens: used once at the callback and discarded.",
        "The session token itself: only its hash.",
        "Access tokens: they are verified by signature, never looked up.",
    ],
    "overview": {**G["OVERVIEW"], "why": [{"title": a, "text": b} for a, b in G["OVERVIEW"]["why"]]},
    "flow": [{"who": a, "what": b} for a, b in G["FLOW"]],
    "concepts": [{"term": a, "meaning": b} for a, b in G["CONCEPTS"]],
    "quickstart": G["QUICKSTART"],
    "cookies": [{"name": a, "holds": b, "lifetime": c, "attributes": d} for a, b, c, d in G["COOKIES"]],
    "claims": [{"claim": a, "example": b, "meaning": c} for a, b, c in G["CLAIMS"]],
    "errorSample": G["ERROR_SAMPLE"],
    "endpoints": [{
        **{k: e[k] for k in ("id", "method", "access", "story", "title", "summary", "behaviour", "request", "response")},
        "path": e["path"],
        "params": [{"name": p[0], "in": p[1], "type": p[2], "required": p[3], "constraints": p[4], "meaning": p[5]} for p in e["params"]],
        "responses": [{"status": a, "when": b, "body": c} for a, b, c in e["responses"]],
        "errors": [{"status": a, "code": b, "when": c} for a, b, c in e["errors"]],
    } for e in G["ENDPOINTS"]],
    "noEndpoint": [{"topic": a, "how": b} for a, b in G["NO_ENDPOINT"]],
    "tables": [{
        "name": t["name"], "purpose": t["purpose"],
        "columns": [{"name": c[0], "type": c[1], "nullable": c[2], "default": c[3], "constraints": c[4], "meaning": c[5]} for c in t["columns"]],
        "constraints": t["constraints"], "sampleCols": t["sample_cols"], "sampleRows": t["sample_rows"],
    } for t in G["TABLES"]],
    "otherTables": G["OTHER_TABLES"],
    "rules": [{"level": k, "items": v} for k, v in G["RULES"].items()],
    "env": [{"name": a, "value": b, "secret": c} for a, b, c in G["ENV"]],
    "openQuestions": G["OPEN_QUESTIONS"],
    "decisions": [{"question": a, "decision": b} for a, b in G["DECISIONS"]],
    "journeys": [{**{k: j[k] for k in ("name", "who", "trigger", "stories", "outcome")}, "steps": [{"person": a, "system": b} for a, b in j["steps"]]} for j in JOURNEYS],
    "edgeCases": [{"situation": a, "sees": b, "code": c} for a, b, c in EDGE_CASES],
    "components": [{**{k: c[k] for k in ("name", "kind", "purpose", "states", "calls")}, "props": [{"name": a, "type": b, "meaning": d} for a, b, d in c["props"]]} for c in COMPONENTS],
    "hostedPages": [{"page": a, "what": b} for a, b in HOSTED_PAGES],
    "uiRules": UI_RULES,
    "entities": [{"name": a, "table": b, "what": c, "relations": d} for a, b, c, d in ENTITIES],
    "lifecycles": [{"name": a, "text": b} for a, b in LIFECYCLES],
    "ddl": DDL,
    "queries": [{"title": a, "sql": b} for a, b in SAMPLE_QUERIES],
}))
open("app/products/identity.ts", "w").write(
    "// Generated together with docs/services/identity/*.md from one source. Design only: not built yet.\n"
    "export const identity = " + json.dumps(guide, indent=2, ensure_ascii=False) + ";\n")
print("products", len(products), "stories", len(STORIES), [(p["slug"], len(p["stories"]), len(p["endpoints"])) for p in products])

# Registry of every module with detailed content, for the product page template.
keys = ["identity"] + [k for k, (m, _) in RENDERED.items() if m["slug"]]
with open("app/products/details.generated.ts", "w") as f:
    f.write("// Generated by scripts/site/build_products.py. Do not edit by hand.\n")
    for k in keys:
        f.write(f'import {{ {k} }} from "./{k}";\n')
    f.write("\nexport const generatedDetails = {\n")
    for k in keys:
        f.write(f"  [{k}.slug]: {k},\n")
    f.write("};\n")

# Identity's SQL, for `npm run schema:check` (the other modules' is written by render.py).
render.write_sql(guide)

# Platform Core pages (MVP1-E0-22).
exec(open(os.path.join(HERE, "platform_core.py")).read(), {"__name__": "platform_core"})
