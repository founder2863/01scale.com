import Link from "next/link";
import { Brands } from "./home/brands";
import { Cover } from "./home/cover";
import { Responsibilities } from "./home/responsibilities";
import { Academics, Contact, LinkedIn, Numbers, Recommendations, Snapshot } from "./home/sections";

// The home page, in Nikhil's order (MVP1-E0-36 to E0-42): cover, hero, snapshot, numbers,
// brands, responsibilities, academics, recommendations, LinkedIn, contact.
export default function Home() {
  return (
    <>
      <Cover />

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

      <Snapshot />
      <Numbers />
      <Brands />
      <Responsibilities />
      <Academics />
      <Recommendations />
      <LinkedIn />
      <Contact />
    </>
  );
}
