import type { Metadata } from "next";
import Link from "next/link";
import { products } from "./data";
import { PRODUCT_NAME, VISION_HREF } from "./flow";
import { groups } from "./tabs";

export const metadata: Metadata = {
  title: "Products — 01scale",
  description: "The modules that make up the 01scale platform, each with its own page.",
};

export default function Products() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">Platform components</p>
          <h1>Products</h1>
          <p className="lead">
            Each module is built and released on its own. Open one to see its
            read me, requirements, user journey, UI components, API, data model
            and schema.
          </p>
          <Link href={VISION_HREF} className="button">
            Read the {PRODUCT_NAME} product vision
          </Link>
        </div>
      </section>

      <div className="container content">
        {groups.map((group) => (
          <section key={group.tag} id={group.tag.toLowerCase()}>
            <h2 className="group-title">
              <Link href={VISION_HREF}>{PRODUCT_NAME} Platform</Link>
              <span className="group-tag">{group.tag}</span>
            </h2>
            <p className="group-about">{group.heading}</p>
            <ul className="product-grid">
              {products
                .filter((product) => product.group === group.tag)
                .map((product) => (
                  <li key={product.slug}>
                    <Link className="product-card" href={`/products/${product.slug}`}>
                      <span className="module-number">{product.number}</span>
                      <span className="module-body">
                        <span className="module-title">
                          {product.title}
                          <span className="status">{product.status}</span>
                        </span>
                        <span className="product-card-text">{product.description}</span>
                        <span className="product-card-service">{product.service}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <section>
          <p className="note">
            Looking for every endpoint in one place? See the{" "}
            <Link href="/apis">API index across all services</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
