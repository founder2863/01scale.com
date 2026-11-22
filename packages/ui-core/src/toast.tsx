"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cx } from "./cx";

export type ToastTone = "info" | "success" | "warning" | "danger";
type ToastItem = { id: number; tone: ToastTone; message: ReactNode };
type ToastApi = { show: (message: ReactNode, tone?: ToastTone) => void };

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Provides short, self-dismissing notices ("Saved", "Payment confirmed"). The region is a polite
 * live region, so screen readers announce each notice without moving focus.
 */
export function ToastProvider({ children, duration = 5000 }: { children: ReactNode; duration?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message: ReactNode, tone: ToastTone = "info") => {
      const id = next.current++;
      setToasts((all) => [...all.slice(-2), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss, duration],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ui-toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cx("ui-toast", `ui-toast-${toast.tone}`)}>
            <div className="ui-toast-body">{toast.message}</div>
            <button type="button" className="ui-toast-close" aria-label="Dismiss" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Shows a toast. Must be used inside a ToastProvider. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}
