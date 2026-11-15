import type { Metadata } from "next";
import { moduleGroups } from "./modules";

export const metadata: Metadata = {
  title: "Product demos — 01scale",
  description: "The modules that make up DocFlow, each shipped as a working demo.",
};

export default function Demos() {
  let number = 0;

  return (
    <>
      <h1>Product demos</h1>
      <p className="lead">
        DocFlow is built one module at a time. Each module below becomes a
        working demo as it ships.
      </p>

      {moduleGroups.map((group) => (
        <section key={group.heading}>
          <h2>{group.heading}</h2>
          <ol className="modules">
            {group.modules.map((module) => {
              number += 1;
              return (
                <li key={module.slug} id={module.slug}>
                  <span className="module-number">{number}.</span>
                  <div className="module-body">
                    <div className="module-title">
                      {module.title}
                      <span className="status">Planned</span>
                    </div>
                    <p>{module.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
