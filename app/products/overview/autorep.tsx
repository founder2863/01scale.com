import type { AppOverviewData } from "../app-overview";
import { AutorepDiagram } from "../autorep-diagram";

// AutoRep V1's Overview content (MVP1-E0-50), from docs/prd/AUTOREP-PRD.md. Its diagram is AUTOREP-E6-03.
export const autorepOverview: AppOverviewData = {
  tryItComingSoon:
    "Demo mode will run AutoRep on recorded reviews, with each agent's output, the critic's revisions and the approval step shown as it happens.",
  problem: [
    "Small businesses get reviews faster than they can answer them well. Replies matter for ranking and trust, but writing each one takes time, and a careless reply to an angry or legal-sounding review can do real harm.",
    "Owners need replies that are fast for the easy reviews and careful, checked and approved for the hard ones.",
  ],
  personas: [
    {
      kind: "Primary",
      name: "Marco, who owns a café",
      text: "Gets about 40 Google reviews a month, mostly positive, a few angry. He wants good replies without writing them, and wants to see the hard ones before they go out.",
    },
    {
      kind: "Secondary",
      name: "A hiring manager",
      text: "Opens AutoRep in demo mode and watches a run: each agent's output, the critic's revisions and the approval step.",
    },
  ],
  product: [
    "A team of AI agents answers each Google review. The Analyst and the Researcher work in parallel, the Writer drafts a reply from sourced facts only, and the Critic checks it against fixed rules, sending it back up to twice.",
    "Replies to reviews of 4★ or more with no risk flag are published. Anything else waits for the owner's approval, and the owner gets an email when a reply needs it.",
  ],
  design: {
    title: "AutoRep at a glance",
    summary: "The agents, the human approval step, what goes in and comes out, and what it runs on.",
    diagram: <AutorepDiagram />,
  },
  versions: {
    V1: {
      title: "Careful replies to every review",
      text: "Reviews from a connected Google Business Profile, or recorded reviews in demo mode. Each one is analysed, researched, drafted, checked and routed: clean replies are published, the rest wait for the owner's approval.",
      notIn:
        "analytics, Slack, posting without approval, several locations, and languages other than English.",
    },
    V2: {
      title: "What V1 leaves out",
      text: "Analytics, a vector database for past replies, Slack, posting without approval, several locations and languages other than English, as the PRD lists them. V2 is designed when it is planned.",
    },
  },
};
