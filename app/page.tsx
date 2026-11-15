import Link from "next/link";

export default function Home() {
  return (
    <>
      <h1>Working prototypes, built hands-on</h1>
      <p className="lead">
        01scale is a live portfolio of products I have built in my career,
        rebuilt one module at a time and shipped here as working demos.
      </p>

      <h2>What this site is</h2>
      <p>
        Each module is a small, working slice of a real product: sign-in,
        document upload, AI extraction, human review, payment and delivery. The
        first product is DocFlow, which turns an uploaded invoice into reviewed,
        structured data.
      </p>

      <h2>Who I am</h2>
      <p>
        I&apos;m Nikhil Shrivastava, a platform and AI product leader with 17+
        years in regulated SaaS: identity, payments, integrations and AI.
      </p>

      <h2>Who this is for</h2>
      <p>
        Hiring managers and teams looking for a platform product leader who can
        show the work, not only describe it. Each demo is something you can try
        yourself as it ships.
      </p>

      <Link href="/demos" className="button">
        See the product demos
      </Link>
    </>
  );
}
