import Link from "next/link";
import type { ReactNode } from "react";
import { appHref, appLabel } from "./apps";
import { products } from "./data";
import { Flow, flowSteps, PRODUCT_NAME } from "./flow";

const whyBuild = [
  {
    title: "To show the work, not describe it",
    text: "I have led platform and AI products for 17 years. This is that experience rebuilt hands-on, one working component at a time, where anyone can try it.",
  },
  {
    title: "Because it touches every hard part",
    text: "One journey covers identity, secure file handling, AI extraction with measured quality, human review, payments and delivery. Few products exercise all of them.",
  },
  {
    title: "Because trust in AI output is the real problem",
    text: "Extraction tools either make silent mistakes or make people check everything. The interesting product work is being right on the easy fields and honest about the hard ones.",
  },
];

const whyComponents = [
  {
    title: "Each step is a product of its own",
    text: "Identity, Upload, Extraction, Review, Payment and Delivery are released, demoed and documented one by one, each with its own UI, API and tools for AI agents.",
  },
  {
    title: "The next app reuses them",
    text: "A Procure-to-Pay or Order-to-Cash app would use the same Extraction, Review and Payment components in a different order, without copying anything.",
  },
  {
    title: "Each one grows up without breaking the rest",
    text: "A component starts by wrapping a cloud service and becomes the provider of that capability itself. Login starts on AWS Cognito and becomes a hand-built identity provider behind the same API.",
  },
];

const endProduct = [
  {
    phase: "V1",
    title: "One invoice, end to end",
    text: "Sign up, upload an invoice, watch it extracted, fix the few fields the system flags, preview the results, pay, and download JSON and CSV. Under three minutes on a phone.",
  },
  {
    phase: "V2",
    title: "Many documents, more trust, own identity",
    text: "Batches of documents, a second model that judges the first, web enrichment with sources, fixes by chat, saved cards, notifications, and sign-in rebuilt by hand with passkeys.",
  },
  {
    phase: "Later",
    title: "A platform other apps are built on",
    text: "More apps assembled from the same components, Identity offered as a provider to other apps, and a visual way to connect components into a business process.",
  },
];

// DocFlow V1's tab: the product vision (MVP1-E0-33 AC2). The app page provides the hero and the tabs.
export function DocflowVision({ children }: { children?: ReactNode }) {
  return (
    <>

      <div className="container content">
        <section id="what">
          <h2 className="group-title">What the product is</h2>
          <div className="two-col">
            <div>
              <p>
                {PRODUCT_NAME} takes a document, starting with invoices, and
                returns its contents as structured data. A user signs in,
                uploads the document, and Claude extracts every field with a
                confidence score and the exact text it was read from.
              </p>
              <p>
                Fields the system is unsure about go to a person, who accepts
                or corrects them with the evidence beside each one. The user
                then previews the result, pays, and receives the files by
                download and email.
              </p>
            </div>
            <div>
              <p>
                <strong>The problem.</strong> Small businesses and bookkeepers
                retype invoice data into spreadsheets and accounting tools by
                hand. Tools that automate it either make silent mistakes or
                ask people to review every field.
              </p>
              <p>
                <strong>Who it is for.</strong> A bookkeeper handling invoices
                for a handful of clients, who wants clean files and does not
                trust tools that hide mistakes. And a hiring manager, who can
                run the whole journey in a few minutes.
              </p>
            </div>
          </div>
        </section>

        <section id="flow">
          <h2 className="group-title">The whole flow</h2>
          <p className="note">
            Seven steps, each handled by one platform component. Choose a step
            to open that component.
          </p>
          <Flow app="docflow" version="V1" detailed />
          <p className="note flow-caption">
            {PRODUCT_NAME} itself is thin: it holds the order of the steps and
            the invoice-specific results. Everything else is a component it
            calls.
          </p>
        </section>

        <section id="why-build">
          <h2 className="group-title">Why I am building this</h2>
          <div className="cards">
            {whyBuild.map((item) => (
              <div className="card" key={item.title}>
                <p className="card-title">{item.title}</p>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why-components">
          <h2 className="group-title">Why platform components</h2>
          <p className="note">
            I could have built this as one app, and it would have been faster.
            I chose separate components because the goal is a platform, not a
            single product.
          </p>
          <div className="cards">
            {whyComponents.map((item) => (
              <div className="card" key={item.title}>
                <p className="card-title">{item.title}</p>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <p className="doc-link">
            <Link href="/platform/architecture">How it is built, and the trade-offs I accepted →</Link>
          </p>
        </section>

        <section id="end-product">
          <h2 className="group-title">What the end product will be</h2>
          <div className="cards">
            {endProduct.map((item) => (
              <div className="card" key={item.phase}>
                <p className="eyebrow">{item.phase}</p>
                <p className="card-title">{item.title}</p>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="steps">
          <h2 className="group-title">What each step adds over time</h2>
          <dl className="decisions">
            {flowSteps.map((step, index) => (
              <div key={step.key}>
                <dt>
                  {index + 1}. {step.label} · {step.service}
                </dt>
                <dd>
                  <strong>V1:</strong> {step.does}
                </dd>
                <dd>
                  <strong>V2:</strong> {step.later}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="modules">
          <h2 className="group-title">
            <span className="group-tag">V1</span>
            The full journey, end to end
          </h2>
          <ul className="product-grid">
            {products
              .filter((product) => product.group === "MVP1")
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
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
          <p className="doc-link">
            <Link href={appHref("docflow", "V2")}>What {appLabel("docflow", "V2")} adds →</Link>
          </p>
        </section>

        {children}
      </div>
    </>
  );
}
