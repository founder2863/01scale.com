"use client";

// Delivery's component (docs/services/delivery/UI-COMPONENTS.md). Version 1 sends email through
// Resend; the prototype sends nothing.

import { useEffect, useState } from "react";
import { Badge, Spinner } from "@01scale/ui-core";
import type { Message } from "../mock-platform";
import { useService } from "./platform-context";

/** MessageStatus: whether the results email is queued, sent or failed. */
export function MessageStatus({ messageId }: { messageId: string }) {
  const delivery = useService("delivery");
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    async function poll() {
      const { message } = await delivery.getMessage(messageId);
      if (!alive) return;
      setMessage(message);
      if (message.status === "queued") timer = setTimeout(poll, 800);
    }
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [delivery, messageId]);

  if (!message || message.status === "queued")
    return (
      <p className="df-row" aria-live="polite">
        <Spinner /> Sending the email with your link…
      </p>
    );
  return (
    <p className="df-row" aria-live="polite">
      {message.status === "sent" ? <Badge tone="success" icon="✉">Email sent</Badge> : <Badge tone="danger">Email failed</Badge>}
      <span className="ui-hint">
        to {message.to} · simulated: the prototype sends no email
      </span>
    </p>
  );
}
