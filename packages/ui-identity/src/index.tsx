"use client";

// @01scale/ui-identity: Identity's components (docs/services/identity/UI-COMPONENTS.md).
// Version 1 signs in on AWS Cognito's hosted page through OIDC; the sign-in page itself is
// Cognito's, not a component here.

import { useState } from "react";
import { Button, createClientContext } from "@01scale/ui-core";

/** What these components need from the Identity API (`/api/identity/v1`). */
export type IdentityClient = {
  /** POST /auth/logout: ends the session. */
  signOut: () => Promise<unknown>;
};

const { Provider, useClient } = createClientContext<IdentityClient>("Identity");
export const IdentityClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useIdentityClient = useClient;

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
