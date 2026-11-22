"use client";

import Link from "next/link";
import { useState } from "react";
import { companies, type OwnershipGroup } from "./profile";

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

// Companies worked for (MVP1-E0-38, E0-39, merged on PR #119): a logo tile per company; the open
// tab shows the role and dates, then what Nikhil owned there, by category.
export function Companies() {
  const [open, setOpen] = useState<string>(companies[0].key);
  const company = companies.find((item) => item.key === open)!;
  const rebuilds = company.groups.some((group) =>
    [...(group.items ?? []), ...(group.parts ?? []).flatMap((part) => part.items)].some((item) => typeof item !== "string"),
  );
  return (
    <section className="home-section" aria-labelledby="companies-title">
      <div className="container">
        <h2 className="home-title" id="companies-title">Companies worked for</h2>
        <div className="brands-row" role="tablist" aria-label="Companies">
          {companies.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`company-tab-${item.key}`}
              aria-selected={item.key === open}
              aria-controls="company-panel"
              className="brand-tile"
              onClick={() => setOpen(item.key)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.logo} alt="" width={64} height={64} />
              <span className="brand-wordmark">{item.name}</span>
              {item.note && <span className="brand-note">{item.note}</span>}
            </button>
          ))}
        </div>

        <div id="company-panel" role="tabpanel" aria-labelledby={`company-tab-${company.key}`}>
          <div className="company-role">
            <p className="card-title">{company.role}</p>
            <p className="note">
              {company.name}
              {company.note ? ` (${company.note})` : ""} · {company.dates}
            </p>
          </div>

          <div className="owned-grid">
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
      </div>
    </section>
  );
}
