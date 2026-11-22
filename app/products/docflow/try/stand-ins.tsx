"use client";

// Stand-ins for the outside pages DocFlow V1 sends people to: AWS Cognito's hosted sign-in and
// Stripe Checkout. They are not ours and not part of any service package; each is clearly
// labelled as a stand-in (MVP1-E0-18 AC5).

import { useState } from "react";
import { Alert, Button, Input, problemMessage } from "@01scale/ui-core";
import { formatAmount, TestModeBanner, type Order } from "@01scale/ui-payment";
import { usePlatform } from "./clients";

export function CognitoStandIn({ onSignedIn, onCancel }: { onSignedIn: (email: string) => void; onCancel: () => void }) {
  const { identity } = usePlatform();
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
        <h2 className="df-outside-title" tabIndex={-1}>
          Sign in to 01scale
        </h2>
        <Input label="Email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <Input label="Password" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Alert tone="info">Prototype: use any email; an example.com address is filled in for you.</Alert>
        <div className="ui-inline">
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

export function StripeCheckoutStandIn({ order, onPaid, onCancel }: { order: Order; onPaid: () => void; onCancel: () => void }) {
  const { payment } = usePlatform();
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  return (
    <div className="df-outside">
      <p className="df-outside-label">
        <span aria-hidden="true">↗</span> Stand-in for <strong>Stripe Checkout</strong> (test mode). In the real app this page is Stripe&apos;s, and
        01scale never sees card numbers.
      </p>
      <form
        className="df-outside-box"
        onSubmit={async (e) => {
          e.preventDefault();
          setWorking(true);
          setError(null);
          try {
            await payment.stripePay(order.id, card);
            await payment.markPaid(order.id);
            onPaid();
          } catch (err) {
            setError(problemMessage(err));
            setWorking(false);
          }
        }}
      >
        <h2 className="df-outside-title" tabIndex={-1}>
          Pay 01scale
        </h2>
        <div className="df-summary">
          <span>{order.description}</span>
          <strong>{formatAmount(order.amount, order.currency)}</strong>
        </div>
        <TestModeBanner />
        <Input label="Card number" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(e.target.value)} error={error} />
        <div className="ui-inline">
          <Button size="sm" variant="ghost" onClick={() => setCard("4242 4242 4242 4242")}>
            Use a card that pays
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCard("4000 0000 0000 0002")}>
            Use a card that is declined
          </Button>
        </div>
        <div className="ui-inline">
          <Button type="submit" loading={working}>
            Pay {formatAmount(order.amount, order.currency)}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={working}>
            Back to DocFlow
          </Button>
        </div>
      </form>
    </div>
  );
}
