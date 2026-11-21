"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APP_ORDER, APPS, appHref, appStatus, SERVICE_ORDER, SERVICES, serviceHref } from "./apps";

// The header's Products menu (MVP1-E0-32): Apps and Services by name, two columns on wide screens
// and one list on a phone. No versions here: each app's and service's versions are on its page.
export default function ProductsMenu() {
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
        <div className="menu-panel menu-panel-products" id="products-menu">
          <div className="menu-groups">
            <div className="menu-group">
              <div className="menu-group-title">
                <span className="menu-group-link">Apps</span>
                <span className="menu-group-heading">Assembled from the services</span>
              </div>
              <ul className="menu-items is-open">
                {APP_ORDER.map((app) => (
                  <li key={app}>
                    <Link href={appHref(app)} onClick={close}>
                      <span>{APPS[app].name}</span>
                      {appStatus(app) === "Coming soon" && <span className="status">Coming soon</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="menu-group">
              <div className="menu-group-title">
                <span className="menu-group-link">Services</span>
                <span className="menu-group-heading">Platform services, each a product</span>
              </div>
              <ul className="menu-items is-open">
                {SERVICE_ORDER.map((service) => (
                  <li key={service}>
                    <Link href={serviceHref(service)} onClick={close}>
                      <span>{SERVICES[service].name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link className="menu-all" href="/products" onClick={close}>
            See all products →
          </Link>
        </div>
      )}
    </div>
  );
}
