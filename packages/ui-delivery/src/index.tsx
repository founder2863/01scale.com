"use client";

// @01scale/ui-delivery: Delivery's component (docs/services/delivery/UI-COMPONENTS.md).

import { useEffect, useState } from "react";
import { Badge, Spinner, createClientContext } from "@01scale/ui-core";

/** A message, as GET /api/delivery/v1/messages/{id} returns it. */
export type Message = { id: string; channel: "email"; to: string; template: string; status: "queued" | "sent" | "failed" };

export type DeliveryClient = {
  getMessage: (messageId: string) => Promise<{ message: Message }>;
};

const { Provider, useClient } = createClientContext<DeliveryClient>("Delivery");
export const DeliveryClientProvider = Provider;
/** The client, for an app that builds its own screen on this API. */
export const useDeliveryClient = useClient;

/** MessageStatus: whether a message is queued, sent or failed; polls while queued. */
export function MessageStatus({ messageId, note }: { messageId: string; note?: string }) {
  const delivery = useClient();
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    async function poll() {
      try {
        const { message } = await delivery.getMessage(messageId);
        if (!alive) return;
        setMessage(message);
        if (message.status !== "queued") return;
      } catch {
        // Keep the last state and try again.
      }
      timer = setTimeout(poll, 800);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [delivery, messageId]);

  if (!message || message.status === "queued")
    return (
      <p className="ui-inline" aria-live="polite">
        <Spinner /> Sending the email…
      </p>
    );
  return (
    <p className="ui-inline" aria-live="polite">
      {message.status === "sent" ? <Badge tone="success" icon="✉">Email sent</Badge> : <Badge tone="danger">Email failed</Badge>}
      <span className="ui-hint">
        to {message.to}
        {note ? ` · ${note}` : ""}
      </span>
    </p>
  );
}
