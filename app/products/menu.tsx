"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APP_ORDER, appHref, appLabel, SERVICES_NAME, servicesFor, VERSIONS, type Version } from "./apps";

// The header's Products menu (MVP1-E0-32): each app by version, then Services. Two columns, V1 and V2,
// on wide screens; one list on a phone. Services opens a submenu of the platform services and
// their modules (MVP1-E0-34), on click or tap.
export default function ProductsMenu() {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Version | null>(null);
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
        aria-controls="products-menu"
        onClick={() => setOpen(!open)}
      >
        Products <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="menu-panel" id="products-menu">
          <div className="menu-groups">
            {VERSIONS.map(({ version }) => {
              const isOpen = services === version;
              return (
                <div className="menu-group" key={version}>
                  <div className="menu-group-title">
                    <span className="menu-group-link">
                      <span className="group-tag">{version}</span>
                    </span>
                  </div>
                  <ul className="menu-items is-open">
                    {APP_ORDER.map((app) => (
                      <li key={app}>
                        <Link href={appHref(app, version)} onClick={close}>
                          <span>{appLabel(app, version)}</span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        className="menu-sub-toggle"
                        aria-expanded={isOpen}
                        aria-controls={`services-${version}`}
                        onClick={() => setServices(isOpen ? null : version)}
                      >
                        <span>
                          {SERVICES_NAME} {version}
                        </span>
                        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && (
                        <ul className="menu-sub" id={`services-${version}`}>
                          {servicesFor(version).map(({ service, modules }) => (
                            <li key={service}>
                              <span className="menu-sub-service">{service}</span>
                              <ul>
                                {modules.map((product) => (
                                  <li key={product.slug}>
                                    <Link href={`/products/${product.slug}`} onClick={close}>
                                      {product.title}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
          <Link className="menu-all" href="/products" onClick={close}>
            See all products →
          </Link>
        </div>
      )}
    </div>
  );
}
