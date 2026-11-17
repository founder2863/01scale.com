"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { builtTabs } from "./tabs";

// The header's "How It's Built" menu: Skills, Token Costs and Agents.
export default function HowItsBuiltMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="how-its-built-menu"
        onClick={() => setOpen(!open)}
      >
        How It&apos;s Built <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu-panel menu-panel-narrow" id="how-its-built-menu">
          <ul className="menu-items is-open">
            {builtTabs.map((tab) => (
              <li key={tab.slug}>
                <Link href={tab.href} onClick={() => setOpen(false)}>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
