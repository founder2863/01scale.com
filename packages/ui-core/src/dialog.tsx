"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal dialog built on the native <dialog> element, which traps focus, closes on Escape and
 * returns focus to the control that opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  /** Buttons at the bottom; the first is usually the main action. */
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ui-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself, outside the inner box) closes it.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="ui-dialog-inner">
        <div className="ui-dialog-header">
          <h2 id={titleId} className="ui-dialog-title">
            {title}
          </h2>
          <button type="button" className="ui-dialog-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        {children ? <div>{children}</div> : null}
        {actions ? <div className="ui-dialog-actions">{actions}</div> : null}
      </div>
    </dialog>
  );
}
