"use client";

// @01scale/ui-identity: Identity's components (docs/services/identity/UI-COMPONENTS.md).
// Version 1 signs in on AWS Cognito's hosted page through OIDC; the sign-in page itself is
// Cognito's, not a component here.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Card, Spinner, createClientContext, problemMessage } from "@01scale/ui-core";

export type User = { id: string; email: string };

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
};

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
