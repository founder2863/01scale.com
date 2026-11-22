"use client";

// @01scale/ui-identity: Identity's components (docs/services/identity/UI-COMPONENTS.md).
// Version 1 signs in on AWS Cognito's hosted page through OIDC; the sign-in page itself is
// Cognito's, not a component here.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Card, Checkbox, Dialog, Input, Select, Skeleton, Spinner, createClientContext, problemMessage } from "@01scale/ui-core";

export type User = { id: string; email: string };

/** GET /me */
export type Me = { id: string; email: string; created_at: string };

/** An API key, as GET /api-keys returns it. The secret is never part of it. */
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string;
  created_at: string;
};

export const ALL_SCOPES = [
  "upload:read",
  "upload:write",
  "extraction:read",
  "extraction:write",
  "review:read",
  "review:write",
  "payment:read",
  "delivery:read",
  "docflow:read",
  "docflow:write",
] as const;

/** What these components need from the Identity API (`/api/identity/v1`). */
export type IdentityClient = {
  /** GET /session: the signed-in user; rejects with 401 `not_authenticated` when signed out. */
  getSession: () => Promise<{ user: User }>;
  /** POST /auth/logout: ends the session and returns Cognito's logout address. */
  signOut: () => Promise<{ logout_url?: string } | unknown>;
  /** The address of GET /auth/login, which starts sign-in and comes back to `returnTo`. */
  loginUrl: (returnTo: string) => string;
  /** Sends the browser to an address. Default: a full page load. An app or a demo can replace it. */
  navigate?: (url: string) => void;
  // Account management (MVP1-E1-05, MVP1-E0-06); optional so a sign-in-only app need not supply them.
  /** GET /me */
  getMe?: () => Promise<Me>;
  /** POST /me/password-change: returns Cognito's address for changing the password. */
  startPasswordChange?: () => Promise<{ redirect_url: string }>;
  /** DELETE /me with `confirm: "DELETE"` */
  deleteAccount?: (confirm: string) => Promise<{ logout_url?: string }>;
  /** GET /api-keys */
  listApiKeys?: () => Promise<{ data: ApiKey[] }>;
  /** POST /api-keys: the secret comes back this once. */
  createApiKey?: (input: { name: string; scopes: string[]; expires_at?: string }) => Promise<{ api_key: ApiKey; secret: string }>;
  /** DELETE /api-keys/{keyId} */
  revokeApiKey?: (keyId: string) => Promise<unknown>;
};

function need<T>(fn: T | undefined, name: string): T {
  if (!fn) throw new Error(`The Identity client given to this component has no ${name}().`);
  return fn;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

const { Provider, useClient } = createClientContext<IdentityClient>("Identity");
export const IdentityClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useIdentityClient = useClient;

function go(client: IdentityClient, url: string) {
  if (client.navigate) client.navigate(url);
  else window.location.assign(url);
}

// ---- SessionProvider and useSession()

export type Session =
  | { status: "loading"; user: null }
  | { status: "signed_in"; user: User }
  | { status: "signed_out"; user: null };

const SessionContext = createContext<(Session & { refresh: () => void }) | null>(null);

/** SessionProvider: asks Identity once who is signed in and shares the answer with the page. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const identity = useClient();
  const [session, setSession] = useState<Session>({ status: "loading", user: null });
  const refresh = useCallback(() => {
    identity
      .getSession()
      .then(({ user }) => setSession({ status: "signed_in", user }))
      .catch(() => setSession({ status: "signed_out", user: null }));
  }, [identity]);
  useEffect(refresh, [refresh]);
  return <SessionContext.Provider value={{ ...session, refresh }}>{children}</SessionContext.Provider>;
}

/** useSession(): `loading`, `signed_in` with the user, or `signed_out`. Must be inside SessionProvider. */
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>.");
  return session;
}

// ---- Components

/** SignInButton: sends the person to the hosted sign-in page. */
export function SignInButton({ onStart }: { onStart: () => void }) {
  return <Button onClick={onStart}>Sign in</Button>;
}

/** CreateAccountButton: the same hosted page, on its sign-up tab. */
export function CreateAccountButton({ onStart }: { onStart: () => void }) {
  return (
    <Button variant="secondary" onClick={onStart}>
      Create account
    </Button>
  );
}

/** UserMenu: the signed-in person's email and Sign out. */
export function UserMenu({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const identity = useClient();
  const [working, setWorking] = useState(false);
  return (
    <div className="ui-identity-usermenu">
      <span className="ui-identity-usermenu-avatar" aria-hidden="true">
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span className="ui-identity-usermenu-email" title={email}>
        {email}
      </span>
      <Button
        size="sm"
        variant="ghost"
        loading={working}
        onClick={async () => {
          setWorking(true);
          try {
            await identity.signOut();
            onSignedOut();
          } finally {
            setWorking(false);
          }
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

/** SignOutButton: ends the session and follows the returned logout address. */
export function SignOutButton({ label = "Sign out", onSignedOut }: { label?: string; onSignedOut?: () => void }) {
  const identity = useClient();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    setWorking(true);
    setError(null);
    try {
      const result = (await identity.signOut()) as { logout_url?: string } | undefined;
      if (onSignedOut) onSignedOut();
      else if (result?.logout_url) go(identity, result.logout_url);
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="ui-inline">
      <Button variant="secondary" loading={working} onClick={signOut}>
        {error ? "Try again" : label}
      </Button>
      {error ? (
        <span className="ui-field-error" role="alert">
          You are still signed in. {error}
        </span>
      ) : null}
    </div>
  );
}

/** RequireSignIn: shows its children to a signed-in person; otherwise sends them to sign in, coming back here. */
export function RequireSignIn({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const identity = useClient();
  const session = useSession();
  useEffect(() => {
    if (session.status === "signed_out") go(identity, identity.loginUrl(window.location.pathname + window.location.search));
  }, [session.status, identity]);
  if (session.status === "signed_in") return <>{children}</>;
  if (session.status === "loading")
    return (
      <>
        {fallback ?? (
          <p className="ui-inline" aria-live="polite">
            <Spinner /> Checking who is signed in…
          </p>
        )}
      </>
    );
  return (
    <p className="ui-inline" aria-live="polite">
      <Spinner /> Taking you to sign in…
    </p>
  );
}

const SIGN_IN_ERRORS: Record<string, { title: string; text: string }> = {
  provider_error: { title: "Sign-in was cancelled", text: "You left the sign-in page before finishing. You are not signed in." },
  login_expired: { title: "Sign-in took too long", text: "For your security, sign-in has to finish within 10 minutes." },
  login_state_mismatch: { title: "Sign-in could not be completed", text: "This can happen when the sign-in link is opened in a different browser." },
  email_not_verified: { title: "Verify your email first", text: "Enter the code we sent to your email, then sign in." },
  provider_unavailable: { title: "Sign-in is temporarily unavailable", text: "Try again in a moment." },
  email_not_supported: { title: "This email address can't be used", text: "Use an email address of 254 characters or fewer." },
};

/** SignInError: the page a browser lands on when sign-in fails, with one button to start again. */
export function SignInError({ code, returnTo = "/" }: { code: string; returnTo?: string }) {
  const identity = useClient();
  const message = SIGN_IN_ERRORS[code] ?? { title: "Sign-in didn't work", text: "Something went wrong while signing you in." };
  return (
    <Card title={message.title} headingLevel={3}>
      <div className="ui-stack">
        <Alert tone="warning">{message.text}</Alert>
        <div>
          <Button onClick={() => go(identity, identity.loginUrl(returnTo))}>Sign in again</Button>
        </div>
      </div>
    </Card>
  );
}

// ---- Account management (MVP1-E1-09)

/** AccountDetails: the person's email and the date they joined. */
export function AccountDetails() {
  const identity = useClient();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setMe(await need(identity.getMe, "getMe")());
    } catch (e) {
      setError(problemMessage(e));
    }
  }, [identity]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error)
    return (
      <Alert tone="danger" title="Couldn't load your details." actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!me)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={20} width="60%" />
        <Skeleton height={16} width="40%" />
      </div>
    );
  return (
    <dl className="ui-identity-details">
      <div>
        <dt>Email</dt>
        <dd>{me.email}</dd>
      </div>
      <div>
        <dt>Joined</dt>
        <dd>{formatDate(me.created_at)}</dd>
      </div>
    </dl>
  );
}

/** PasswordChangeButton: sends the person to change their password, and says so when they come back. */
export function PasswordChangeButton({ changed = false }: { changed?: boolean }) {
  const identity = useClient();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="ui-stack">
      {changed ? <Alert tone="success">Your password was changed.</Alert> : null}
      <div className="ui-inline">
        <Button
          variant="secondary"
          loading={working}
          onClick={async () => {
            setWorking(true);
            setError(null);
            try {
              const { redirect_url } = await need(identity.startPasswordChange, "startPasswordChange")();
              go(identity, redirect_url);
            } catch (e) {
              setError(problemMessage(e));
            } finally {
              setWorking(false);
            }
          }}
        >
          {error ? "Try again" : "Change password"}
        </Button>
        {error ? (
          <span className="ui-field-error" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** DeleteAccountDialog: explains what is deleted and kept, and asks the person to type DELETE. */
export function DeleteAccountDialog({ onDeleted }: { onDeleted?: () => void }) {
  const identity = useClient();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed === "DELETE";

  async function remove() {
    setWorking(true);
    setError(null);
    try {
      const result = await need(identity.deleteAccount, "deleteAccount")(typed);
      setOpen(false);
      if (onDeleted) onDeleted();
      else go(identity, result.logout_url ?? "/?account_deleted=1");
    } catch (e) {
      setError(problemMessage(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
      <Dialog
        open={open}
        onClose={() => !working && setOpen(false)}
        title="Delete your account?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button variant="danger" disabled={!ready} loading={working} onClick={remove}>
              {error ? "Try again" : "Delete my account"}
            </Button>
          </>
        }
      >
        <div className="ui-stack">
          <p style={{ margin: 0 }}>
            <strong>Deleted:</strong> your documents, their results and your API keys.
            <br />
            <strong>Kept, without your name or email:</strong> your orders, for the accounts.
          </p>
          <p style={{ margin: 0 }}>This can&apos;t be undone.</p>
          <Input label="Type DELETE to confirm" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      </Dialog>
    </>
  );
}

const EXPIRY = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
];

/** ApiKeysManager: lists keys, creates and revokes them; shows a new secret once, with Copy. */
export function ApiKeysManager({ scopes = ALL_SCOPES, limit = 10 }: { scopes?: readonly string[]; limit?: number }) {
  const identity = useClient();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [days, setDays] = useState("90");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [secret, setSecret] = useState<{ name: string; value: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeWorking, setRevokeWorking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setKeys((await need(identity.listApiKeys, "listApiKeys")()).data);
    } catch (e) {
      setError(problemMessage(e));
    }
  }, [identity]);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setFormError("Give the key a name, for example Claude Desktop.");
    if (chosen.length === 0) return setFormError("Choose at least one thing the key may do.");
    setSaving(true);
    setFormError(null);
    try {
      const expires = new Date(Date.now() + Number(days) * 86_400_000).toISOString();
      const result = await need(identity.createApiKey, "createApiKey")({ name: name.trim(), scopes: chosen, expires_at: expires });
      setSecret({ name: result.api_key.name, value: result.secret });
      setCopied(false);
      setCreating(false);
      setName("");
      setChosen([]);
      await load();
    } catch (e) {
      setFormError(problemMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function revoke() {
    if (!revoking) return;
    setRevokeWorking(true);
    setRevokeError(null);
    try {
      await need(identity.revokeApiKey, "revokeApiKey")(revoking.id);
      setRevoking(null);
      await load();
    } catch (e) {
      setRevokeError(problemMessage(e));
    } finally {
      setRevokeWorking(false);
    }
  }

  if (error && !keys)
    return (
      <Alert tone="danger" title="Couldn't load your API keys." actions={<Button size="sm" variant="secondary" onClick={load}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!keys)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    );

  const full = keys.length >= limit;
  return (
    <div className="ui-stack">
      {secret ? (
        <Alert tone="warning" title={`Your new key "${secret.name}"`}>
          <p style={{ margin: "4px 0 8px" }}>Copy it now: it is shown this once and never again.</p>
          <div className="ui-identity-secret">
            <code>{secret.value}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret.value);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSecret(null)}>
              I&apos;ve saved it
            </Button>
          </div>
        </Alert>
      ) : null}

      {keys.length === 0 ? (
        <p style={{ margin: 0 }}>
          <strong>No keys yet.</strong> A key lets an AI agent, such as Claude Desktop, use 01scale for you, with only the permissions you choose.
        </p>
      ) : (
        <ul className="ui-identity-keys">
          {keys.map((key) => (
            <li key={key.id} className="ui-identity-key">
              <span className="ui-identity-key-name">
                {key.name}
                <span className="ui-hint">
                  <code>{key.prefix}…</code> · {key.last_used_at ? `last used ${formatDate(key.last_used_at)}` : "never used"} · expires {formatDate(key.expires_at)}
                </span>
                <span className="ui-inline">
                  {key.scopes.map((scope) => (
                    <Badge key={scope} tone="neutral">
                      {scope}
                    </Badge>
                  ))}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setRevoking(key)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      {full ? <Alert tone="info">You have {limit} keys, the most allowed. Revoke one to create another.</Alert> : null}

      {creating ? (
        <form className="ui-identity-keyform" onSubmit={create}>
          <Input label="Name" hint="What the key is for" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <fieldset className="ui-identity-scopes">
            <legend className="ui-label">What the key may do</legend>
            {scopes.map((scope) => (
              <Checkbox
                key={scope}
                label={scope}
                checked={chosen.includes(scope)}
                onChange={(e) => setChosen((all) => (e.target.checked ? [...all, scope] : all.filter((s) => s !== scope)))}
              />
            ))}
          </fieldset>
          <Select label="Expires after" value={days} onChange={(e) => setDays(e.target.value)} options={EXPIRY} />
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          <div className="ui-inline">
            <Button type="submit" loading={saving}>
              Create key
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button onClick={() => setCreating(true)} disabled={full}>
            Create an API key
          </Button>
        </div>
      )}

      <Dialog
        open={revoking !== null}
        onClose={() => !revokeWorking && setRevoking(null)}
        title={`Revoke "${revoking?.name ?? ""}"?`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)} disabled={revokeWorking}>
              Cancel
            </Button>
            <Button variant="danger" loading={revokeWorking} onClick={revoke}>
              {revokeError ? "Try again" : "Revoke key"}
            </Button>
          </>
        }
      >
        <div className="ui-stack">
          <p style={{ margin: 0 }}>It stops working at once. Anything using it will need a new key.</p>
          {revokeError ? <Alert tone="danger">{revokeError}</Alert> : null}
        </div>
      </Dialog>
    </div>
  );
}
