"use client";

// Payment's components (docs/services/payment/UI-COMPONENTS.md). Version 1 takes payment on
// Stripe Checkout in test mode; here that page is a clearly labelled stand-in (E0-18 AC5).

import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Card, Input, Spinner } from "@01scale/ui-core";
import type { Order } from "../mock-platform";
import { messageFor, useService } from "./platform-context";

export const formatAmount = (cents: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

/** TestModeBanner: says plainly that no real money moves. */
export function TestModeBanner() {
  return (
    <Alert tone="warning" title="Test mode">
      No real payment is taken. Use the test card 4242 4242 4242 4242, any future date and any CVC.
    </Alert>
  );
}

/** PaymentSummary: what is being bought, the price and the Pay button. The price comes from the app's server. */
export function PaymentSummary({ description, amount, onPay, disabled }: { description: string; amount: number; onPay: () => Promise<void>; disabled?: boolean }) {
  const [working, setWorking] = useState(false);
  return (
    <Card title="Unlock your downloads" headingLevel={3}>
      <div className="df-stack">
        <div className="df-summary">
          <span>{description}</span>
          <strong>{formatAmount(amount)}</strong>
        </div>
        <TestModeBanner />
        <Button
          block
          loading={working}
          disabled={disabled}
          onClick={async () => {
            setWorking(true);
            try {
              await onPay();
            } finally {
              setWorking(false);
            }
          }}
        >
          Pay {formatAmount(amount)}
        </Button>
      </div>
    </Card>
  );
}

/** OrderStatus: on the return page, polls the order until it is paid, failed or expired. */
export function OrderStatus({ orderId, onPaid }: { orderId: string; onPaid: (order: Order) => void }) {
  const payment = useService("payment");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    async function poll() {
      try {
        const { order } = await payment.getOrder(orderId);
        if (!alive) return;
        setOrder(order);
        if (order.status === "paid") {
          if (!done.current) {
            done.current = true;
            onPaid(order);
          }
          return;
        }
        if (order.status !== "pending") return;
      } catch (e) {
        setError(messageFor(e));
      }
      timer = setTimeout(poll, 700);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!order || order.status === "pending")
    return (
      <p className="df-row" aria-live="polite">
        <Spinner /> Confirming payment…
      </p>
    );
  return (
    <p className="df-row" aria-live="polite">
      {order.status === "paid" ? <Badge tone="success" icon="✓">Paid {formatAmount(order.amount, order.currency)}</Badge> : <Badge tone="danger">Payment {order.status}</Badge>}
    </p>
  );
}

/** Stand-in for Stripe's hosted Checkout page (not ours in version 1). */
export function StripeCheckoutStandIn({
  order,
  onPaid,
  onCancel,
}: {
  order: Order;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const payment = useService("payment");
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
            setError(messageFor(err));
            setWorking(false);
          }
        }}
      >
        <div className="df-summary">
          <span>{order.description}</span>
          <strong>{formatAmount(order.amount, order.currency)}</strong>
        </div>
        <TestModeBanner />
        <Input label="Card number" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(e.target.value)} error={error} />
        <div className="df-row">
          <Button size="sm" variant="ghost" onClick={() => setCard("4242 4242 4242 4242")}>
            Use a card that pays
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCard("4000 0000 0000 0002")}>
            Use a card that is declined
          </Button>
        </div>
        <div className="df-row">
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
