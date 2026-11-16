"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { moduleGroups } from "./demos/modules";

const modules = moduleGroups.flatMap((group) => group.modules);

export default function DemosMenu() {
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
        aria-controls="demos-menu"
        onClick={() => setOpen(!open)}
      >
        <span className="nav-wide">Product demos</span>
        <span className="nav-narrow">Demos</span> <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ol className="menu-list" id="demos-menu">
          {modules.map((module) => (
            <li key={module.slug}>
              <Link href={`/demos#${module.slug}`} onClick={() => setOpen(false)}>
                {module.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
