"use client";

import Link from "next/link";
import { useState } from "react";
import { responsibilities } from "./profile";

// What Nikhil owned (MVP1-E0-39): the products and the platform under them, from his functional
// responsibilities chart. Tap a part to see what he did there; parts 01scale rebuilds link to it.
export function Responsibilities() {
  const all = responsibilities.layers.flatMap((layer) => layer.nodes);
  const [open, setOpen] = useState<string>(all[0].key);
  const node = all.find((item) => item.key === open);
  return (
    <section className="home-section" aria-labelledby="responsibilities-title">
      <div className="container">
        <h2 className="home-title" id="responsibilities-title">{responsibilities.title}</h2>
        <p className="note">{responsibilities.intro}</p>

        <div className="resp-map">
          {responsibilities.layers.map((layer) => (
            <div className={`resp-layer resp-layer-${layer.name.toLowerCase()}`} key={layer.name}>
              <p className="resp-layer-name">{layer.name}</p>
              <ul>
                {layer.nodes.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      aria-pressed={item.key === open}
                      aria-controls="resp-panel"
                      onClick={() => setOpen(item.key)}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {node && (
          <div className="card resp-panel" id="resp-panel" aria-live="polite">
            <p className="card-title">{node.name}</p>
            {node.groups.map((group) => (
              <div key={group.title}>
                <p className="resp-group">{group.title}</p>
                <ul className="link-list">
                  {group.items.map((item) => (
                    <li key={item}>
                      <span className="status">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {node.rebuild && (
              <p className="doc-link">
                <Link href={node.rebuild.href}>Rebuilding it here: {node.rebuild.label} →</Link>
              </p>
            )}
          </div>
        )}

        <p className="resp-group">Domain knowledge</p>
        <ul className="link-list">
          {responsibilities.domains.map((domain) => (
            <li key={domain}>
              <span className="status">{domain}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
