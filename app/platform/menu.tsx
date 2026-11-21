"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { coreComponents } from "./core";

// The header's "Platform" menu (MVP1-E0-22): Platform Core with its components,
// then Platform Architecture and Apps Architecture.
export default function PlatformMenu() {
  const [open, setOpen] = useState(false);
  // On phones one group is expanded at a time; on wide screens both are shown.
  const [expanded, setExpanded] = useState("core");
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

  const close = () => setOpen(false);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="platform-menu"
        onClick={() => setOpen(!open)}
      >
        Platform <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu-panel" id="platform-menu">
          <div className="menu-groups">
            <div className="menu-group">
              <div className="menu-group-title">
                <Link className="menu-group-link" href="/platform/core" onClick={close}>
                  <span>Platform Core</span>
                </Link>
                <button
                  type="button"
                  className="menu-chevron"
                  aria-expanded={expanded === "core"}
                  aria-label={`${expanded === "core" ? "Hide" : "Show"} Platform Core components`}
                  onClick={() => setExpanded(expanded === "core" ? "" : "core")}
                >
                  {expanded === "core" ? "−" : "+"}
                </button>
                <span className="menu-group-heading">Shared by every service</span>
              </div>
              <ul className={expanded === "core" ? "menu-items is-open" : "menu-items"}>
                {coreComponents.map((component) => (
                  <li key={component.slug}>
                    <Link href={`/platform/core/${component.slug}`} onClick={close}>
                      <span>{component.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="menu-group">
              <div className="menu-group-title">
                <span className="menu-group-link">
                  <span>Architecture</span>
                </span>
                <button
                  type="button"
                  className="menu-chevron"
                  aria-expanded={expanded === "architecture"}
                  aria-label={`${expanded === "architecture" ? "Hide" : "Show"} architecture pages`}
                  onClick={() => setExpanded(expanded === "architecture" ? "" : "architecture")}
                >
                  {expanded === "architecture" ? "−" : "+"}
                </button>
                <span className="menu-group-heading">The platform, then the apps</span>
              </div>
              <ul className={expanded === "architecture" ? "menu-items is-open" : "menu-items"}>
                <li>
                  <Link href="/platform/architecture" onClick={close}>
                    <span>Platform Architecture</span>
                  </Link>
                </li>
                <li>
                  <Link href="/platform/apps" onClick={close}>
                    <span>Apps Architecture</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
