import type { ReactNode } from "react";
import { costs } from "./costs";

// Expensive Mistakes (MVP1-E0-46): one short article per mistake, each no longer than one A4 page.
// Every figure comes from costs.mistakes, which `npm run costs` works out from the token ledger.

const REPO = "https://github.com/founder2863/01scale.com";
const m = costs.mistakes;
const usd = (value: number | null) => (value === null ? "pending" : `$${value.toFixed(2)}`);

export type Mistake = {
  slug: string;
  title: string;
  oneLine: string;
  cost: string;
  sections: { heading: string; body: ReactNode }[];
  links: { label: string; href: string }[];
};

export const mistakes: Mistake[] = [
  {
    slug: "designed-before-the-split",
    title: "Designed before the split",
    oneLine: "I designed every API and table for one app, then chose separate services and designed them all again.",
    cost: `${usd(m.designRedo.rework)} of rework on ${usd(m.designRedo.build)} of design`,
    sections: [
      {
        heading: "What happened",
        body: (
          <p>
            I wrote an API design and a database design into every MVP1 story while 01scale was still one
            Next.js app with one database. Then I chose the architecture: independent services behind a
            gateway, each owning its own schema. Every story&apos;s design assumed shared tables and
            app-level endpoints, so every one of them had to be redone.
          </p>
        ),
      },
      {
        heading: "What it cost",
        body: (
          <p>
            The first design cost {usd(m.designRedo.build)}. Redoing it cost {usd(m.designRedo.rework)}:
            more than twice the original, in a single request. Only {m.designRedo.yield}% of what I spent
            on that design survived the first time.
          </p>
        ),
      },
      {
        heading: "Why it happened",
        body: (
          <p>
            I treated the design of each story as the first decision, when the architecture was the
            first decision. A service boundary decides which endpoints exist, who owns each table and
            what may never be joined. Designing below that line before drawing it meant the work rested
            on an assumption I had not made yet.
          </p>
        ),
      },
      {
        heading: "What I do now",
        body: (
          <ul className="plain-list">
            <li>Decide the boundaries first: which service owns what, written down in ARCHITECTURE.md.</li>
            <li>Only then design the API and tables, inside one service&apos;s boundary.</li>
            <li>
              Run the architecture review skill across all services before building, so a wrong boundary
              is found on paper, where changing it is cheap.
            </li>
          </ul>
        ),
      },
    ],
    links: [
      { label: "Architecture decision", href: `${REPO}/blob/main/docs/architecture/ARCHITECTURE.md` },
      { label: "Token cost ledger", href: `${REPO}/blob/main/docs/process/TOKEN-COSTS.md` },
    ],
  },
  {
    slug: "built-before-the-words",
    title: "Built before the words were final",
    oneLine: "I built the home page first and settled its wording on the live page, one round at a time.",
    cost: `${usd(m.homePage.rework)} of rework on ${usd(m.homePage.build)} of build`,
    sections: [
      {
        heading: "What happened",
        body: (
          <p>
            The home page went from résumés to a built page quickly: a cover, a snapshot, numbers,
            companies, academics and recommendations. Then the wording changed, section by section: a
            degree name, the logos, what I owned at each company as tabs, then merged with the
            companies, two school names and the snapshot cards rewritten twice. Each change was a new
            round on a page that was already built.
          </p>
        ),
      },
      {
        heading: "What it cost",
        body: (
          <p>
            Building the page cost {usd(m.homePage.build)}. The {m.homePage.reworkRequests} rounds of
            changes afterwards cost {usd(m.homePage.rework)}, so only {m.homePage.yield}% of the spend was
            kept the first time. Of that rework, {usd(m.homePage.reworkAfterBreak)} came from three rounds
            sent after a break of more than an hour, each reloading the whole conversation (see{" "}
            <em>The cold-cache tax</em>).
          </p>
        ),
      },
      {
        heading: "Why it happened",
        body: (
          <p>
            A home page about a person is mostly words. Building first made every wording decision a code change, and seeing the page live raised new
            questions one at a time. The page was not wrong; the order was.
          </p>
        ),
      },
      {
        heading: "What I do now",
        body: (
          <ul className="plain-list">
            <li>Agree the wording first, as a recommendation, before anything on the site changes.</li>
            <li>Collect all the changes to a page and send them in one round.</li>
            <li>Build only once the words are settled; the layout is the cheap part.</li>
          </ul>
        ),
      },
    ],
    links: [{ label: "Home page stories (MVP1-E0-36 to E0-42)", href: `${REPO}/blob/main/docs/epics/MVP1-EPICS.md` }],
  },
  {
    slug: "the-cold-cache-tax",
    title: "The cold-cache tax",
    oneLine: "Coming back to a long conversation after an hour reloads all of it, and a one-line question costs dollars.",
    cost: `${usd(m.reloads.cost)}, ${m.reloads.share}% of everything spent`,
    sections: [
      {
        heading: "What happened",
        body: (
          <p>
            I build in one long Claude Code conversation, from my phone, between other things. When I
            came back after more than an hour, even a short question or a one-word change was expensive.
            It happened {m.reloads.requests} times.
          </p>
        ),
      },
      {
        heading: "What it cost",
        body: (
          <p>
            Those {m.reloads.requests} requests cost {usd(m.reloads.cost)}, {m.reloads.share}% of the{" "}
            {usd(costs.totals.cost)} spent so far. The middle one cost {usd(m.reloads.median)}; a typical
            request costs {usd(m.reloads.typical)}. Had they cost what a typical request does, I would have
            saved about {usd(m.reloads.extra)}.
          </p>
        ),
      },
      {
        heading: "Why it happened",
        body: (
          <p>
            Claude keeps the conversation in a cache, which is cheap to read. The cache lasts an hour.
            After that, the whole conversation has to be written into the cache again before the
            model can answer, and writing costs forty times as much as reading ($8 against $0.20 per
            million tokens). The longer the conversation, the bigger the bill,
            whatever the size of the question.
          </p>
        ),
      },
      {
        heading: "What I do now",
        body: (
          <ul className="plain-list">
            <li>Keep working sessions short: one story, then record its costs and close it.</li>
            <li>After a long break, start a new conversation with a short summary instead of reopening a long one.</li>
            <li>Ask quick questions in a separate, short conversation.</li>
            <li>Batch questions and changes into one sitting.</li>
          </ul>
        ),
      },
    ],
    links: [{ label: "Token cost ledger", href: `${REPO}/blob/main/docs/process/TOKEN-COSTS.md` }],
  },
  {
    slug: "merged-too-soon",
    title: "Merged too soon",
    oneLine: "I merged pull requests while their last commits were still on the way, and changes nearly went missing.",
    cost: `${usd(m.mergedTooSoon.cost)} and two follow-up pull requests`,
    sections: [
      {
        heading: "What happened",
        body: (
          <p>
            While the home page was being built, I merged pull request #119 before its last commits
            were pushed. Those commits landed on a branch that was already merged, so they were not
            on the site. They were carried into #120, and the same thing happened again: #120 was
            merged before its last changes, which went into #121.
          </p>
        ),
      },
      {
        heading: "What it cost",
        body: (
          <p>
            Little money: {usd(m.mergedTooSoon.cost)} for the request that opened the follow-up, and two
            extra pull requests to review. The real cost was the risk. A change pushed to a merged
            branch does not fail loudly; it just never reaches the site, and I only noticed because
            the live page did not show it.
          </p>
        ),
      },
      {
        heading: "Why it happened",
        body: (
          <p>
            The pull request was open and its preview looked right, so it looked finished. Nothing
            told me more commits were coming. Work in progress and work ready to merge looked the
            same.
          </p>
        ),
      },
      {
        heading: "What I do now",
        body: (
          <ul className="plain-list">
            <li>Merge only after the pull request says it is ready, never while work is still being pushed.</li>
            <li>Before pushing, check whether the branch&apos;s pull request has already merged; if it has, open a new one.</li>
            <li>When a change does not appear on the live site, check first that its pull request was merged.</li>
          </ul>
        ),
      },
    ],
    links: [
      { label: "Pull request #119", href: `${REPO}/pull/119` },
      { label: "Pull request #121", href: `${REPO}/pull/121` },
    ],
  },
];

export const findMistake = (slug: string) => mistakes.find((item) => item.slug === slug);
