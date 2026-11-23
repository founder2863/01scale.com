import Link from "next/link";
import { Flow, PRODUCT_NAME } from "./flow";
import DocFlowPrototype from "./docflow/try/prototype";

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

// DocFlow V1's User Journey and Built On sections (MVP1-E0-48). Its Overview is in overview/docflow.tsx (MVP1-E0-50).

export function DocflowJourney() {
  return (
    <>
    <section id="try-it">
      <h2 className="group-title">Try it</h2>
      <p className="note">
        The journey, clickable (MVP1-E0-18). The written step for where you are is highlighted beside the screens,
        with every API call the step makes. <Link href="/products/docflow/try">Open it full screen →</Link>
      </p>
      <DocFlowPrototype />
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
    </>
  );
}

export function DocflowWhyComponents() {
  return (
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
  );
}
