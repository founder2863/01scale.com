import type { ReactNode } from "react";

// Building blocks shared by every app's high-level design diagram (AUTOREP-E6-03, MVP1-E0-51),
// so DocFlow's and AutoRep's diagrams look the same. Styles are the `.ar-*` classes in globals.css.

export type Accent = "purple" | "green" | "blue" | "teal" | "amber" | "red";

// A numbered step or agent in the orchestration column.
export function DiagramNode({ n, name, accent, children }: { n: number; name: string; accent: Accent; children?: ReactNode }) {
  return (
    <div className={`ar-node ar-${accent}`}>
      <p className="ar-node-title">
        <span className="ar-badge">{n}</span>
        {name}
      </p>
      {children}
    </div>
  );
}

export const Down = () => (
  <div className="ar-arrow" aria-hidden="true">
    ↓
  </div>
);
