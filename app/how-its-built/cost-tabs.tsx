import Link from "next/link";
import { costTabs, type CostTab } from "./tabs";

// The four tabs of Total Cost (MVP1-E8-10). On a desktop, one row. On a phone or tablet,
// the site's pattern for many tabs (MVP1-E0-49): one button showing where you are, which opens the
// list. Built on <details>, so it works without JavaScript.
export function CostTabs({ current }: { current: CostTab }) {
  const tab = costTabs.find((item) => item.slug === current);
  const links = costTabs.map((item) => (
    <Link key={item.slug} href={item.href} aria-current={item.slug === current ? "page" : undefined}>
      {item.label}
    </Link>
  ));
  return (
    <>
      {/* Keyed by tab, so the list is closed again on the page it opens. */}
      <details className="section-picker section-picker-inline" key={current}>
        <summary>
          <span className="section-picker-where">
            <span className="side-tabs-heading">Total Cost</span>
            <span className="section-picker-current">{tab?.label}</span>
          </span>
          <span className="section-picker-label">Tabs</span>
        </summary>
        <nav className="section-picker-list" aria-label="Total Cost tabs">
          <div className="side-tabs-group">{links}</div>
        </nav>
      </details>
      <nav className="sub-tabs" aria-label="Total Cost tabs">
        {links}
      </nav>
    </>
  );
}

// Previous / Next at the end of each tab, as on module pages (MVP1-E0-49).
export function CostPager({ current }: { current: CostTab }) {
  const index = costTabs.findIndex((item) => item.slug === current);
  const previous = index > 0 ? costTabs[index - 1] : null;
  const next = index < costTabs.length - 1 ? costTabs[index + 1] : null;
  return (
    <nav className="section-pager" aria-label="Previous and next tab">
      {previous ? (
        <Link className="section-pager-link" href={previous.href} rel="prev">
          <span className="section-pager-dir">← Previous</span>
          <span className="section-pager-name">{previous.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="section-pager-link section-pager-next" href={next.href} rel="next">
          <span className="section-pager-dir">Next →</span>
          <span className="section-pager-name">{next.label}</span>
        </Link>
      )}
    </nav>
  );
}
