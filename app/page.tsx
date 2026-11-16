import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Product portfolio</p>
          <h1>Working prototypes, built hands-on</h1>
          <p className="lead">
            01scale is a live portfolio of products I have built in my career,
            rebuilt one module at a time and shipped here as working demos.
          </p>
          <Link href="/products" className="button">
            See the products
          </Link>
        </div>
      </section>

      <div className="container content cards">
        <section className="card">
          <p className="eyebrow">What this site is</p>
          <p>
            Each module is a small, working slice of a real product: sign-in,
            document upload, AI extraction, human review, payment and delivery.
            The first product is DocIntel, which turns an uploaded invoice into
            reviewed, structured data.
          </p>
        </section>

        <section className="card">
          <p className="eyebrow">Who I am</p>
          <p>
            I&apos;m Nikhil Shrivastava, a platform and AI product leader with
            17+ years in regulated SaaS: identity, payments, integrations and
            AI.
          </p>
        </section>

        <section className="card">
          <p className="eyebrow">Who this is for</p>
          <p>
            Hiring managers and teams looking for a platform product leader who
            can show the work, not only describe it. Each demo is something you
            can try yourself as it ships.
          </p>
        </section>
      </div>
    </>
  );
}
