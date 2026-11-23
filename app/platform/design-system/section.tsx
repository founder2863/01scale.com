import Link from "next/link";
import { packageCards, UI_CORE } from "./packages";
import { DesignSystemShowcase } from "./showcase";

// What the Design system page adds to the Platform Core component page (MVP1-E0-52): the base
// components live, then a card per service package linking to its one gallery. The service
// galleries are not copied here: each component keeps one gallery (AC2).
export function DesignSystemSections() {
  return (
    <>
      <section>
        <h2 className="group-title">Base components</h2>
        <p className="note">
          Every base component of <code>{UI_CORE.name}</code>, rendered from the
          package itself in its states. Pick a theme to see them light or dark.
        </p>
        <DesignSystemShowcase version={UI_CORE.version} />
      </section>

      <section>
        <h2 className="group-title">Service components</h2>
        <p className="note">
          Each service ships its own components, built on{" "}
          <code>{UI_CORE.name}</code>, in its own package. Each component is
          shown live once, on its module&apos;s UI Components section.
        </p>
        <ul className="core-grid">
          {packageCards.map((card) => (
            <li key={card.key}>
              <article className="core-card ds-package">
                <span className="core-card-head">
                  <strong>
                    <code>{card.name}</code>
                  </strong>
                  <span className="status">{card.version}</span>
                </span>
                <span className="core-card-purpose">
                  {card.owner} · {card.components}{" "}
                  {card.components === 1 ? "component" : "components"}
                </span>
                <ul className="ds-package-links">
                  {card.galleries.map((gallery) => (
                    <li key={gallery.href}>
                      <Link href={gallery.href}>
                        {gallery.title}: UI Components
                        {card.galleries.length > 1
                          ? ` (${gallery.components})`
                          : ""}{" "}
                        →
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
