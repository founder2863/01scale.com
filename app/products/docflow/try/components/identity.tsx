"use client";

// Identity's components (docs/services/identity/UI-COMPONENTS.md). Version 1 signs in on AWS
// Cognito's hosted page through OIDC; here that page is a clearly labelled stand-in (E0-18 AC5).

import { useState } from "react";
import { Alert, Button, Input } from "@01scale/ui-core";
import { useService } from "./platform-context";

/** SignInButton and CreateAccountButton: both send the person to the hosted sign-in page. */
export function SignInButton({ onStart }: { onStart: () => void }) {
  return <Button onClick={onStart}>Sign in</Button>;
}

export function CreateAccountButton({ onStart }: { onStart: () => void }) {
  return (
    <Button variant="secondary" onClick={onStart}>
      Create account
    </Button>
  );
}

/** UserMenu: the signed-in person's email and Sign out. */
export function UserMenu({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const identity = useService("identity");
  const [working, setWorking] = useState(false);
  return (
    <div className="df-usermenu">
      <span className="df-avatar" aria-hidden="true">
        {email.slice(0, 1).toUpperCase()}
      </span>
      <span className="df-usermenu-email" title={email}>
        {email}
      </span>
      <Button
        size="sm"
        variant="ghost"
        loading={working}
        onClick={async () => {
          setWorking(true);
          await identity.signOut();
          onSignedOut();
        }}
      >
        Sign out
      </Button>
    </div>
  );
}

/** Stand-in for the Cognito hosted sign-in page (not ours in version 1). */
export function CognitoStandIn({ onSignedIn, onCancel }: { onSignedIn: (email: string) => void; onCancel: () => void }) {
  const identity = useService("identity");
  const [email, setEmail] = useState("you@example.com");
  const [password, setPassword] = useState("prototype-only");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  return (
    <div className="df-outside">
      <p className="df-outside-label">
        <span aria-hidden="true">↗</span> Stand-in for the <strong>AWS Cognito hosted sign-in page</strong>. In the real app this page is Cognito&apos;s,
        reached by OIDC with PKCE. Nothing you type here is stored or sent.
      </p>
      <form
        className="df-outside-box"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError("Enter an email address, like you@example.com.");
            return;
          }
          setError(null);
          setWorking(true);
          await identity.signIn(email.trim());
          onSignedIn(email.trim());
        }}
      >
        <h2 className="df-outside-title">Sign in to 01scale</h2>
        <Input label="Email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Input label="Password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Alert tone="info">Prototype: use any email; an example.com address is filled in for you.</Alert>
        <div className="df-row">
          <Button type="submit" loading={working}>
            Sign in
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
