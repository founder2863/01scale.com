import { academics, certifications, contact, linkedin, numbers, recommendations, snapshot } from "./profile";

// The home page's static sections (MVP1-E0-36 to E0-42). Content lives in profile.ts.

export function Snapshot() {
  return (
    <div className="container content cards home-snapshot">
      {snapshot.map((item) => (
        <section className="card" key={item.label}>
          <p className="eyebrow">{item.label}</p>
          <p>{item.text}</p>
        </section>
      ))}
    </div>
  );
}

export function Numbers() {
  return (
    <section className="home-section" aria-labelledby="numbers-title">
      <div className="container">
        <h2 className="home-title" id="numbers-title">In numbers</h2>
        <ul className="numbers-grid">
          {numbers.map((item) => (
            <li key={item.figure}>
              <span className="numbers-figure">{item.figure}</span>
              <span className="numbers-label">{item.label}</span>
              <span className="numbers-source">{item.source}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Academics() {
  return (
    <section className="home-section" aria-labelledby="academics-title">
      <div className="container">
        <h2 className="home-title" id="academics-title">Academics</h2>
        <ul className="academics-grid">
          {academics.map((item) => (
            <li key={item.school}>
              <p className="academics-school">{item.school}</p>
              <p className="academics-degree">{item.degree}</p>
              {item.note && <p className="academics-note">{item.note}</p>}
            </li>
          ))}
        </ul>
        <ul className="link-list certifications" aria-label="Certifications">
          {certifications.map((item) => (
            <li key={item}>
              <span className="status">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Recommendations() {
  return (
    <section className="home-section" aria-labelledby="recommendations-title">
      <div className="container">
        <h2 className="home-title" id="recommendations-title">What leaders say</h2>
        <ul className="recommendations-grid">
          {recommendations.map((item) => (
            <li key={item.quote}>
              <blockquote>
                <p>&ldquo;{item.quote}&rdquo;</p>
              </blockquote>
              <p className="recommendations-who">
                <strong>{item.role}</strong> · {item.company}
              </p>
              <p className="recommendations-source">via LinkedIn</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LinkedIn() {
  return (
    <section className="home-section" aria-labelledby="linkedin-title">
      <div className="container">
        <div className="card linkedin-card">
          <div>
            <h2 className="home-title" id="linkedin-title">On LinkedIn</h2>
            <p>{linkedin.headline}</p>
            <p className="note">{linkedin.articles}</p>
          </div>
          <div className="linkedin-actions">
            <a className="button button-solid" href={linkedin.url} target="_blank" rel="noopener noreferrer">
              View profile
            </a>
            <a className="button" href={linkedin.articlesUrl} target="_blank" rel="noopener noreferrer">
              Read my articles
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="home-section home-contact" aria-labelledby="contact-title">
      <div className="container">
        <h2 className="home-title" id="contact-title">Contact</h2>
        <p>{contact.text}</p>
        <a className="button button-solid" href={contact.url} target="_blank" rel="noopener noreferrer">
          {contact.label}
        </a>
      </div>
    </section>
  );
}
