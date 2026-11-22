"use client";

import { useState } from "react";
import { brands } from "./profile";

// Where the numbers came from (MVP1-E0-38): a brand per company; tap one for the role, dates and results.
export function Brands() {
  const [open, setOpen] = useState<string>(brands[0].key);
  const brand = brands.find((item) => item.key === open);
  return (
    <section className="home-section" aria-labelledby="brands-title">
      <div className="container">
        <h2 className="home-title" id="brands-title">Where I built it</h2>
        <div className="brands-row" role="tablist" aria-label="Companies">
          {brands.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`brand-tab-${item.key}`}
              aria-selected={item.key === open}
              aria-controls="brand-panel"
              className="brand-tile"
              onClick={() => setOpen(item.key)}
            >
              {item.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.logo} alt={item.name} />
              ) : (
                <span className="brand-wordmark">{item.name}</span>
              )}
              {item.note && <span className="brand-note">{item.note}</span>}
            </button>
          ))}
        </div>
        {brand && (
          <div className="card brand-panel" id="brand-panel" role="tabpanel" aria-labelledby={`brand-tab-${brand.key}`}>
            <p className="card-title">{brand.role}</p>
            <p className="note">
              {brand.name}
              {brand.note ? ` (${brand.note})` : ""} · {brand.dates}
            </p>
            <ul className="plain-list">
              {brand.results.map((result) => (
                <li key={result}>{result}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
