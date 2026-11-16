import type { Metadata } from "next";
import { apiGroups } from "./endpoints";

export const metadata: Metadata = {
  title: "APIs — 01scale",
  description: "The API behind 01scale: designed first, for people and AI agents alike.",
};

const total = apiGroups.reduce((sum, group) => sum + group.endpoints.length, 0);

const rules = [
  {
    title: "API first",
    text: "Each service's API is its product, and this website is one client of it. Every endpoint is designed in its story before any code is written.",
  },
  {
    title: "Agents first",
    text: "Anything a person can do here, an AI agent can do with the user's permission: API keys, an OpenAPI contract and an MCP server per service with the same operations as tools.",
  },
  {
    title: "Independent services",
    text: "Each service owns its data, versions its API on its own under /api/{service}/v1, and follows one set of rules: one error format, cursor pagination, idempotent writes.",
  },
];

export default function Apis() {
  return (
    <>
      <section className="hero hero-small">
        <div className="container">
          <p className="eyebrow">API first · Agents first</p>
          <h1>APIs</h1>
          <p className="lead">
            {total} endpoints across {apiGroups.length - 3} platform services, the
            gateway and the DocFlow app. Designed before they are built.
          </p>
        </div>
      </section>

      <div className="container content">
        <div className="cards">
          {rules.map((rule) => (
            <section className="card" key={rule.title}>
              <p className="eyebrow">{rule.title}</p>
              <p>{rule.text}</p>
            </section>
          ))}
        </div>

        {apiGroups.map((group) => (
          <section key={group.tag + group.epic} id={`${group.tag}-${group.epic}`.toLowerCase()}>
            <h2 className="group-title">
              <span className="group-tag">{group.tag}</span>
              {group.title}
              <span className="status">Designed</span>
            </h2>
            <p className="group-about">{group.about}</p>
            <ul className="endpoints">
              {group.endpoints.map((endpoint) => (
                <li key={endpoint.method + endpoint.path}>
                  <div className="endpoint-line">
                    <span className={`method method-${endpoint.method.toLowerCase()}`}>
                      {endpoint.method}
                    </span>
                    <code>{endpoint.path}</code>
                  </div>
                  <p>
                    {endpoint.summary} <span className="access">{endpoint.access}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
