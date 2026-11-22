import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

/* ------------------------------------------------------------------ Spinner */

/** A small spinning ring. Decorative: the control that shows it carries the label. */
export function Spinner({ className }: { className?: string }) {
  return <span className={cx("ui-spinner", className)} aria-hidden="true" />;
}

/* -------------------------------------------------------------------- Card */

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Buttons or badges shown at the right of the title. */
  actions?: ReactNode;
  /** Heading level of the title, so the page's outline stays correct. Default 2. */
  headingLevel?: 2 | 3 | 4;
};

/** A raised box that groups related content, with an optional title row. */
export function Card({ title, subtitle, actions, headingLevel = 2, className, children, ...rest }: CardProps) {
  const Heading = `h${headingLevel}` as "h2";
  return (
    <section className={cx("ui-card", className)} {...rest}>
      {title || actions ? (
        <div className="ui-card-header">
          <div>
            {title ? <Heading className="ui-card-title">{title}</Heading> : null}
            {subtitle ? <p className="ui-card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------- Badge */

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";

/**
 * A short status label. Meaning never rests on colour alone: the text says it, and an optional
 * icon repeats it.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: ReactNode }) {
  return (
    <span className={cx("ui-badge", `ui-badge-${tone}`, className)} {...rest}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- Alert */

const ALERT_ICON: Record<"info" | "success" | "warning" | "danger", string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

/**
 * An inline message about the page or a step: info, success, warning or danger. Danger and
 * warning are announced at once (role="alert"); the others politely (role="status").
 */
export function Alert({
  tone = "info",
  title,
  children,
  actions,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-alert", `ui-alert-${tone}`, className)} role={tone === "danger" || tone === "warning" ? "alert" : "status"}>
      <span aria-hidden="true">{ALERT_ICON[tone]}</span>
      <div className="ui-alert-body">
        {title ? <strong className="ui-alert-title">{title}</strong> : null}
        {children}
        {actions ? <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>{actions}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- ProgressBar */

/** A labelled progress bar (role="progressbar"), for "2 of 3 resolved" and similar. */
export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  valueText,
}: {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
  /** What a screen reader says, for example "2 of 3 resolved". */
  valueText?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cx("ui-progress", percent >= 100 && "ui-progress-done")}>
      {showValue ? (
        <div className="ui-hint" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>{label}</span>
          <span>{valueText ?? `${Math.round(percent)}%`}</span>
        </div>
      ) : null}
      <div
        className="ui-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
      >
        <div className="ui-progress-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Skeleton */

/** A grey placeholder the size of the content to come, so the page does not jump when it loads. */
export function Skeleton({ width = "100%", height = 16, className }: { width?: number | string; height?: number | string; className?: string }) {
  return <span className={cx("ui-skeleton", className)} style={{ width, height }} aria-hidden="true" />;
}
