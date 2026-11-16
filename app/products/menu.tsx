"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { products } from "./data";
import { groups } from "./tabs";

export default function ProductsMenu() {
  const [open, setOpen] = useState(false);
  // On phones one group is expanded at a time; on wide screens both are shown.
  const [expanded, setExpanded] = useState<string>(groups[0].tag);
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
        aria-controls="products-menu"
        onClick={() => setOpen(!open)}
      >
        Products <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu-panel" id="products-menu">
          <div className="menu-groups">
            {groups.map((group) => {
              const isExpanded = expanded === group.tag;
              return (
                <div className="menu-group" key={group.tag}>
                  <button
                    type="button"
                    className="menu-group-title"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? "" : group.tag)}
                  >
                    <span className="group-tag">{group.tag}</span>
                    <span className="menu-group-heading">{group.heading}</span>
                    <span className="menu-chevron" aria-hidden="true">
                      {isExpanded ? "−" : "+"}
                    </span>
                  </button>
                  <ul className={isExpanded ? "menu-items is-open" : "menu-items"}>
                    {products
                      .filter((product) => product.group === group.tag)
                      .map((product) => (
                        <li key={product.slug}>
                          <Link href={`/products/${product.slug}`} onClick={() => setOpen(false)}>
                            <span className="menu-number">{product.number}</span>
                            <span>{product.title}</span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <Link className="menu-all" href="/products" onClick={() => setOpen(false)}>
            See all products →
          </Link>
        </div>
      )}
    </div>
  );
}
