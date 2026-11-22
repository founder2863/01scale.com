import Link from "next/link";
import type { ReactNode } from "react";
import { serviceHref } from "./apps";

// AutoRep V1 at a glance (AUTOREP-E6-03): laid out like Nikhil's reference image, with content from
// docs/prd/AUTOREP-PRD.md. Where the two differed, the PRD wins: no vector database in V1, the
// Researcher uses web search, the Critic + risk router + Publisher replace an auto-posting agent.

type Accent = "purple" | "green" | "blue" | "teal" | "amber" | "red";

const steps = ["Analyse", "Research", "Draft", "Critique", "Route", "Publish"];

const inputs = [
  {
    title: "Google Business Profile",
    note: "Behind a flag, once Google approves API access",
    items: ["Review text and rating", "Reviewer display name", "The review thread"],
  },
  {
    title: "Demo mode",
    note: "The default for visitors",
    items: ["Recorded reviews, written for the demo", "Never posts anywhere"],
  },
  {
    title: "Business profile",
    note: "Fits in the prompt: no vector database",
    items: ["Facts about the business", "Past replies, for tone"],
  },
];

const outputs = [
  { title: "Reply posted on Google", items: ["Once per review, whatever retries happen"] },
  { title: "\"Needs approval\" email", items: ["Through Delivery, below 4★ or flagged risky"] },
  { title: "Run trace", items: ["Each agent's output, tools, sources, revisions, route and cost"] },
];

const agents: { n: number; name: string; accent: Accent; items: string[] }[] = [
  {
    n: 1,
    name: "Analyst",
    accent: "purple",
    items: ["Sentiment and topics", "Risk flags: legal threat, safety, personal information", "What the reply must address"],
  },
  {
    n: 2,
    name: "Researcher",
    accent: "green",
    items: ["A tool loop over web search (with citations)", "Business profile, past replies, the review thread", "Every fact with its source"],
  },
  {
    n: 3,
    name: "Writer",
    accent: "blue",
    items: ["Drafts from the analysis and sourced facts only", "The business's voice, in English"],
  },
  {
    n: 4,
    name: "Critic",
    accent: "teal",
    items: ["check_policy: no promises, refunds or personal information", "Every claim has a source", "Sends it back, up to 2 revisions"],
  },
  {
    n: 5,
    name: "Owner approval",
    accent: "red",
    items: ["Pauses the run (interrupt + Postgres checkpoint)", "Owner accepts or edits in Human Review", "Resumes with the approved text"],
  },
  {
    n: 6,
    name: "Publisher",
    accent: "amber",
    items: ["post_reply: the only step that acts", "Idempotent: never posts twice"],
  },
];

const infrastructure: { title: string; accent: Accent; text: string }[] = [
  { title: "LangGraph on AWS Lambda", accent: "purple", text: "Python; parallel agents, tool loops, interrupt() for the human step." },
  { title: "Neon Postgres", accent: "green", text: "Checkpoints, runs and traces in AutoRep's own schema. No vector database in V1." },
  { title: "Claude", accent: "blue", text: "Opus 5.5, then Haiku 5.5: $5 + $5 a month, then paused. Web search with citations." },
  { title: "Security & privacy", accent: "red", text: "Review text and web pages are untrusted data; tools only read; LangSmith is off." },
];

const flow = [
  { title: "New review", note: "Google or demo" },
  { title: "Analyse ‖ research", note: "Analyst and Researcher" },
  { title: "Draft", note: "Writer" },
  { title: "Critique", note: "Critic, up to 2 revisions" },
  { title: "Route", note: "Publish, or owner approval" },
  { title: "Post once + trace", note: "Publisher" },
];

function Agent({ n, name, accent, children }: { n: number; name: string; accent: Accent; children?: ReactNode }) {
  return (
    <div className={`ar-node ar-${accent}`}>
      <p className="ar-node-title">
        <span className="ar-badge">{n}</span>
        {name}
      </p>
      {children}
    </div>
  );
}

const Down = () => (
  <div className="ar-arrow" aria-hidden="true">
    ↓
  </div>
);

export function AutorepDiagram() {
  return (
    <section className="ar" aria-labelledby="ar-title">
      <header className="ar-head">
        <h2 id="ar-title">AutoRep: replies to Google reviews</h2>
        <p className="ar-sub">A multi-agent AI system with LangGraph orchestration</p>
        <ol className="ar-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </header>

      <div className="ar-main">
        <div className="ar-col">
          <p className="ar-col-title">Inputs</p>
          {inputs.map((item) => (
            <div className="ar-card" key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <p className="ar-card-note">{item.note}</p>
              <ul>
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="ar-graph">
          <p className="ar-col-title">LangGraph: multi-agent orchestration</p>
          <div className="ar-start">Ingest a new review</div>
          <Down />
          <p className="ar-label">In parallel</p>
          <div className="ar-pair">
            <Agent n={1} name="Analyst" accent="purple">
              <p className="ar-node-text">Sentiment, topics, risk flags</p>
            </Agent>
            <Agent n={2} name="Researcher" accent="green">
              <p className="ar-node-text">Web search, profile, past replies, thread</p>
            </Agent>
          </div>
          <Down />
          <p className="ar-label">Draft ⇄ critique, up to 2 revisions</p>
          <div className="ar-pair ar-loop">
            <Agent n={3} name="Writer" accent="blue">
              <p className="ar-node-text">Drafts from sourced facts only</p>
            </Agent>
            <Agent n={4} name="Critic" accent="teal">
              <p className="ar-node-text">check_policy; sends back up to 2 times</p>
            </Agent>
          </div>
          <Down />
          <div className="ar-router">
            <strong>Risk router</strong>
            <span>4★ or more and no risk flag?</span>
          </div>
          <div className="ar-branches">
            <div className="ar-branch">
              <p className="ar-branch-label ar-yes">Yes: low risk</p>
              <Agent n={6} name="Publisher" accent="amber">
                <p className="ar-node-text">Posts the reply once</p>
              </Agent>
            </div>
            <div className="ar-branch">
              <p className="ar-branch-label ar-no">No: below 4★, flagged, or still failing</p>
              <Agent n={5} name="Owner approval" accent="red">
                <p className="ar-node-text">Human Review task + &ldquo;needs approval&rdquo; email</p>
              </Agent>
              <Down />
              <Agent n={6} name="Publisher" accent="amber">
                <p className="ar-node-text">Posts the approved reply once</p>
              </Agent>
            </div>
          </div>
        </div>

        <div className="ar-col">
          <p className="ar-col-title">Outputs</p>
          {outputs.map((item) => (
            <div className="ar-card" key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <ul>
                {item.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">Data & infrastructure</p>
        <div className="ar-band-grid">
          {infrastructure.map((item) => (
            <div className={`ar-card ar-${item.accent}`} key={item.title}>
              <p className="ar-card-title">{item.title}</p>
              <p className="ar-card-text">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">Platform services reused, unchanged</p>
        <ul className="link-list">
          <li>
            <Link className="status" href={serviceHref("identity")}>Identity: sign-in</Link>
          </li>
          <li>
            <Link className="status" href={serviceHref("review")}>Human Review: approval</Link>
          </li>
          <li>
            <Link className="status" href={serviceHref("delivery")}>Delivery: the approval email</Link>
          </li>
        </ul>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">Agents: roles and responsibilities</p>
        <div className="ar-agents">
          {agents.map((agent) => (
            <Agent n={agent.n} name={agent.name} accent={agent.accent} key={agent.name}>
              <ul>
                {agent.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Agent>
          ))}
        </div>
      </div>

      <div className="ar-band">
        <p className="ar-band-title">End-to-end flow</p>
        <ol className="ar-flow">
          {flow.map((item, index) => (
            <li key={item.title}>
              <span className="ar-badge">{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <span className="ar-flow-note">{item.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
