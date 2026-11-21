import { cover } from "./profile";

// The arc that links one area's functional expertise to the previous area's (MVP1-E0-36 AC2).
function Arc() {
  return (
    <svg className="cover-arc" viewBox="0 0 64 28" aria-hidden="true" focusable="false">
      <path d="M62 24 C 48 2, 20 2, 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 12 L6 19 L13 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The home page cover: three areas, each with its apps, the platform under them, and the
// functional expertise that runs across all three. Built as the page, not an image, so it reads
// at every width and in both themes.
export function Cover() {
  return (
    <section className="cover" aria-labelledby="cover-title">
      <div className="container cover-grid">
        <div className="cover-intro">
          <h2 id="cover-title">{cover.title}</h2>
          <ul className="cover-legend">
            <li>
              <span className="cover-key cover-key-app" aria-hidden="true" />
              {cover.legend.app}
            </li>
            <li>
              <span className="cover-key cover-key-platform" aria-hidden="true" />
              {cover.legend.platform}
            </li>
            <li>
              <svg className="cover-key-arc" viewBox="0 0 28 14" aria-hidden="true" focusable="false">
                <path d="M2 11 C 8 2, 20 2, 26 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {cover.legend.expertise}
            </li>
          </ul>
        </div>

        {cover.areas.map((area, index) => (
          <article className="cover-area" key={area.title}>
            <h3>{area.title}</h3>
            <p className="cover-metric">{area.metric}</p>
            <ul className="cover-apps" aria-label={`${area.title}: apps`}>
              {area.apps.map((app) => (
                <li key={app}>{app}</li>
              ))}
            </ul>
            <ul className="cover-platform" aria-label={`${area.title}: platform`}>
              {area.platform.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="cover-expertise">
              {index > 0 && <Arc />}
              <p className="cover-expertise-pill">{area.expertise}</p>
              <p className="cover-modes">{area.modes}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
