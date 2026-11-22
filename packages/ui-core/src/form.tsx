"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cx } from "./cx";

/* ------------------------------------------------------------- FieldError */

/** The message under a field that failed a check. Linked to the field by aria-describedby. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="ui-field-error" style={{ margin: 0 }}>
      <span aria-hidden="true">✕</span>
      <span>{children}</span>
    </p>
  );
}

type FieldChrome = {
  /** The visible label. Every control has one (AC2). */
  label: ReactNode;
  /** A short format hint under the label, for example "YYYY-MM-DD". */
  hint?: ReactNode;
  /** The error message; when set, the control is marked invalid. */
  error?: ReactNode;
  /** Hides the label visually but keeps it for screen readers. */
  hideLabel?: boolean;
};

function useFieldIds(id?: string) {
  const auto = useId();
  const base = id ?? auto;
  return { id: base, hint: `${base}-hint`, error: `${base}-error` };
}

function describedBy(ids: ReturnType<typeof useFieldIds>, hint?: ReactNode, error?: ReactNode) {
  return [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") || undefined;
}

/* ------------------------------------------------------------------- Input */

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & FieldChrome;

/** A labelled text box with an optional hint and error. */
export function Input({ label, hint, error, hideLabel, id, className, ...rest }: InputProps) {
  const ids = useFieldIds(id);
  return (
    <div className={cx("ui-field", className)}>
      <label htmlFor={ids.id} className={cx("ui-label", hideLabel && "ui-visually-hidden")}>
        {label}
      </label>
      {hint ? (
        <span id={ids.hint} className="ui-hint">
          {hint}
        </span>
      ) : null}
      <input
        id={ids.id}
        className="ui-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        {...rest}
      />
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Select */

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> &
  FieldChrome & { options: readonly { value: string; label: string }[] };

/** A labelled native select: the most accessible choice on every phone. */
export function Select({ label, hint, error, hideLabel, id, options, className, ...rest }: SelectProps) {
  const ids = useFieldIds(id);
  return (
    <div className={cx("ui-field", className)}>
      <label htmlFor={ids.id} className={cx("ui-label", hideLabel && "ui-visually-hidden")}>
        {label}
      </label>
      {hint ? (
        <span id={ids.hint} className="ui-hint">
          {hint}
        </span>
      ) : null}
      <select
        id={ids.id}
        className="ui-select"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, hint, error)}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- Checkbox */

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: ReactNode;
};

/** A checkbox whose whole label is the tap target. */
export function Checkbox({ label, error, id, className, ...rest }: CheckboxProps) {
  const ids = useFieldIds(id);
  return (
    <div className={cx("ui-field", className)}>
      <label className="ui-checkbox" htmlFor={ids.id}>
        <input
          id={ids.id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids.error : undefined}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error ? <FieldError id={ids.error}>{error}</FieldError> : null}
    </div>
  );
}
