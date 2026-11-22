"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem = { id: string; label: ReactNode; content: ReactNode };

/**
 * Tabs following the WAI-ARIA pattern: one tab stop, arrow keys move between tabs, Home and End
 * jump to the ends. The list scrolls sideways on a narrow phone instead of wrapping.
 */
export function Tabs({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** What the tab list is about, for screen readers. */
  label: string;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, items.findIndex((item) => item.id === value));

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const last = items.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  const active = items[index];
  return (
    <div className="ui-tabs">
      <div className="ui-tablist" role="tablist" aria-label={label} onKeyDown={move}>
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={i === index}
            aria-controls={`${base}-panel-${item.id}`}
            tabIndex={i === index ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`${base}-panel-${active.id}`}
          aria-labelledby={`${base}-tab-${active.id}`}
          className="ui-tabpanel"
          tabIndex={0}
        >
          {active.content}
        </div>
      ) : null}
    </div>
  );
}
