import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";
import { Spinner } from "./display";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  /** Shows a spinner, keeps the width and blocks clicks while work is in progress. */
  loading?: boolean;
  /** Fills the width of its container (used on phones). */
  block?: boolean;
  children: ReactNode;
};

/**
 * A button. Always at least 44 pixels tall (sm: 36) so it is easy to tap; "loading" announces
 * itself to screen readers through aria-busy.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  disabled,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "ui-button",
        `ui-button-${variant}`,
        size === "sm" && "ui-button-sm",
        block && "ui-button-block",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
