"use client";

// @01scale/ui-payment: Payment's components (docs/services/payment/UI-COMPONENTS.md). Version 1 takes
// payment on Stripe Checkout in test mode; that page is Stripe's, not a component here.

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Card, Skeleton, Spinner, createClientContext, problemMessage } from "@01scale/ui-core";

/** An order, as GET /api/payment/v1/orders/{id} returns it. */
export type Order = {
  id: string;
  app: string;
  reference: string;
  description: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "expired" | "failed";
  checkout_url: string;
  paid_at: string | null;
};

export type PaymentClient = {
  getOrder: (orderId: string) => Promise<{ order: Order }>;
  /** GET /orders */
  listOrders?: (opts: { cursor?: string | null; limit: number }) => Promise<{ data: Order[]; next_cursor: string | null }>;
};

const { Provider, useClient } = createClientContext<PaymentClient>("Payment");
export const PaymentClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const usePaymentClient = useClient;

export const formatAmount = (minorUnits: number, currency = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(minorUnits / 100);

/** TestModeBanner: says plainly that no real money moves. */
export function TestModeBanner() {
  return (
    <Alert tone="warning" title="Test mode">
      No real payment is taken. Use the test card 4242 4242 4242 4242, any future date and any CVC.
    </Alert>
  );
}

/** PaymentSummary: what is being bought, the price and the Pay button. The price comes from the app's server. */
export function PaymentSummary({
  title = "Unlock your downloads",
  description,
  amount,
  currency = "usd",
  onPay,
  disabled,
}: {
  title?: string;
  description: string;
  amount: number;
  currency?: string;
  onPay: () => Promise<void>;
  disabled?: boolean;
}) {
  const [working, setWorking] = useState(false);
  return (
    <Card title={title} headingLevel={3}>
      <div className="ui-stack">
        <div className="ui-payment-summary">
          <span>{description}</span>
          <strong>{formatAmount(amount, currency)}</strong>
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
          Pay {formatAmount(amount, currency)}
        </Button>
      </div>
    </Card>
  );
}

/** OrderStatus: on the return page, polls the order until it is paid, failed or expired. */
export function OrderStatus({ orderId, onPaid, pollMs = 1000 }: { orderId: string; onPaid: (order: Order) => void; pollMs?: number }) {
  const payment = useClient();
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
        setError(problemMessage(e));
      }
      timer = setTimeout(poll, pollMs);
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
      <p className="ui-inline" aria-live="polite">
        <Spinner /> Confirming payment…
      </p>
    );
  return (
    <p className="ui-inline" aria-live="polite">
      {order.status === "paid" ? (
        <Badge tone="success" icon="✓">
          Paid {formatAmount(order.amount, order.currency)}
        </Badge>
      ) : (
        <Badge tone="danger">Payment {order.status}</Badge>
      )}
    </p>
  );
}

const ORDER_STATUS: Record<Order["status"], { tone: "success" | "info" | "danger" | "neutral"; text: string }> = {
  paid: { tone: "success", text: "Paid" },
  pending: { tone: "info", text: "Waiting for payment" },
  failed: { tone: "danger", text: "Failed" },
  expired: { tone: "neutral", text: "Expired" },
};

/** OrderList: the person's orders with date, description, amount and status, for an account page. */
export function OrderList({ pageSize = 20 }: { pageSize?: number }) {
  const payment = useClient();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(
    async (from: string | null) => {
      if (!payment.listOrders) throw new Error("The Payment client given to OrderList has no listOrders().");
      setError(null);
      if (from) setMore(true);
      try {
        const page = await payment.listOrders({ cursor: from, limit: pageSize });
        setOrders((all) => (from && all ? [...all, ...page.data] : page.data));
        setCursor(page.next_cursor);
      } catch (e) {
        setError(problemMessage(e));
      } finally {
        setMore(false);
      }
    },
    [payment, pageSize],
  );
  useEffect(() => {
    void load(null);
  }, [load]);

  if (error && !orders)
    return (
      <Alert tone="danger" title="Couldn't load your payments." actions={<Button size="sm" variant="secondary" onClick={() => load(null)}>Retry</Button>}>
        {error}
      </Alert>
    );
  if (!orders)
    return (
      <div className="ui-stack" aria-busy="true">
        <Skeleton height={48} />
        <Skeleton height={48} />
      </div>
    );
  if (orders.length === 0) return <p style={{ margin: 0 }}>No payments yet.</p>;
  return (
    <div className="ui-stack">
      <ul className="ui-payment-orders">
        {orders.map((order) => (
          <li key={order.id} className="ui-payment-order">
            <span className="ui-payment-order-what">
              {order.description}
              <span className="ui-hint">{new Date(order.paid_at ?? Date.now()).toLocaleDateString()}</span>
            </span>
            <strong>{formatAmount(order.amount, order.currency)}</strong>
            <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].text}</Badge>
          </li>
        ))}
      </ul>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {cursor ? (
        <div>
          <Button size="sm" variant="secondary" loading={more} onClick={() => load(cursor)}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
