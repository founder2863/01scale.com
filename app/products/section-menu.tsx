import Link from "next/link";

// The section menu of module and app pages (MVP1-E0-49). On a desktop, a side menu with a heading
// per group. On a phone or tablet, one "Sections" button showing where you are, which opens the
// whole grouped list: any section in two taps, no sideways swiping. Built on <details>, so it
// works without JavaScript. Previous / Next links close each section.

type Item = { slug: string; label: string };
type Group = { heading: string; tabs: readonly Item[] };

type Props = {
  label: string;
  groups: readonly Group[];
  current: string;
  href: (slug: string) => string;
};

function Links({ groups, current, href }: Omit<Props, "label">) {
  return groups.map((group) => (
    <div className="side-tabs-group" key={group.heading}>
      <span className="side-tabs-heading">{group.heading}</span>
      {group.tabs.map((item) => (
        <Link key={item.slug} href={href(item.slug)} aria-current={item.slug === current ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </div>
  ));
}

export function SectionMenu({ label, groups, current, href }: Props) {
  const group = groups.find((item) => item.tabs.some((tab) => tab.slug === current));
  const tab = group?.tabs.find((item) => item.slug === current);
  return (
    <>
      {/* Keyed by section, so the list is closed again on the page it opens. */}
      <details className="section-picker" key={current}>
        <summary>
          <span className="section-picker-where">
            <span className="side-tabs-heading">{group?.heading}</span>
            <span className="section-picker-current">{tab?.label}</span>
          </span>
          <span className="section-picker-label">Sections</span>
        </summary>
        <nav className="section-picker-list" aria-label={`${label} sections`}>
          <Links groups={groups} current={current} href={href} />
        </nav>
      </details>
      <nav className="side-tabs" aria-label={`${label} sections`}>
        <Links groups={groups} current={current} href={href} />
      </nav>
    </>
  );
}

export function SectionPager({ groups, current, href }: Omit<Props, "label">) {
  const all = groups.flatMap((group) => group.tabs);
  const index = all.findIndex((item) => item.slug === current);
  const previous = index > 0 ? all[index - 1] : null;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : null;
  if (!previous && !next) return null;
  return (
    <nav className="section-pager" aria-label="Previous and next section">
      {previous ? (
        <Link className="section-pager-link" href={href(previous.slug)} rel="prev">
          <span className="section-pager-dir">← Previous</span>
          <span className="section-pager-name">{previous.label}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link className="section-pager-link section-pager-next" href={href(next.slug)} rel="next">
          <span className="section-pager-dir">Next →</span>
          <span className="section-pager-name">{next.label}</span>
        </Link>
      )}
    </nav>
  );
}
