"use client";

import Link from "next/link";
import { useState } from "react";
import { ownership, type OwnershipGroup } from "./profile";

function Chips({ items }: { items: NonNullable<OwnershipGroup["items"]> }) {
  return (
    <ul className="link-list">
      {items.map((item) =>
        typeof item === "string" ? (
          <li key={item}>
            <span className="status">{item}</span>
          </li>
        ) : (
          // A part 01scale rebuilds links to it.
          <li key={item.label}>
            <Link className="status owned-link" href={item.href} title="Rebuilt on 01scale">
              {item.label} ↗
            </Link>
          </li>
        ),
      )}
    </ul>
  );
}

// What Nikhil owned (MVP1-E0-39): one tab per company, then his categories as cards.
export function Responsibilities() {
  const [open, setOpen] = useState<string>(ownership[0].key);
  const company = ownership.find((item) => item.key === open)!;
  const rebuilds = company.groups.some((group) =>
    [...(group.items ?? []), ...(group.parts ?? []).flatMap((part) => part.items)].some((item) => typeof item !== "string"),
  );
  return (
    <section className="home-section" aria-labelledby="owned-title">
      <div className="container">
        <h2 className="home-title" id="owned-title">What I owned</h2>
        <div className="owned-tabs" role="tablist" aria-label="Companies">
          {ownership.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`owned-tab-${item.key}`}
              aria-selected={item.key === open}
              aria-controls="owned-panel"
              onClick={() => setOpen(item.key)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.logo} alt="" width={28} height={28} />
              {item.name}
            </button>
          ))}
        </div>

        <div className="owned-grid" id="owned-panel" role="tabpanel" aria-labelledby={`owned-tab-${company.key}`}>
          {company.groups.map((group) => (
            <div className={group.parts ? "owned-card owned-card-wide" : "owned-card"} key={group.title}>
              <p className="owned-title">{group.title}</p>
              {group.text && <p className="owned-text">{group.text}</p>}
              {group.items && <Chips items={group.items} />}
              {group.parts?.map((part) => (
                <div className="owned-part" key={part.title}>
                  <p className="owned-part-title">{part.title}</p>
                  <Chips items={part.items} />
                </div>
              ))}
            </div>
          ))}
        </div>
        {rebuilds && (
          <p className="note owned-legend">↗ Rebuilt on 01scale: opens the service or component that rebuilds it here.</p>
        )}
      </div>
    </section>
  );
}
