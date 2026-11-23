// The skills kept in this repository under .claude/skills. Each entry mirrors
// that skill's SKILL.md; when a skill changes, change its entry here.
const REPO = "https://github.com/founder2863/01scale.com/blob/main";

export const skillOrder = [
  { step: "Steps 1 and 2", text: "API spec and data model. Everything else refers to them." },
  { step: "Step 3", text: "Schema. It must match the data model field for field." },
  { step: "Steps 4 and 5", text: "User journeys and UI components. They use the API's error codes and endpoints." },
  { step: "Step 6", text: "Read me. Written last, because it summarises the others." },
  { step: "Step 7", text: "Product page. Assembly and checks only, no new content." },
];

export const skills = [
  {
    name: "Design a module",
    id: "design-module",
    kind: "Runs the others",
    job: "Takes one module from its stories to a published product page by running the seven skills below in order, then checks that their outputs agree.",
    reads: "The module's stories and the architecture rules",
    makes: "A complete design and a pull request listing choices and open questions",
  },
  {
    name: "API spec",
    id: "design-api-spec",
    kind: "Step 1",
    job: "Every endpoint with its inputs, constraints, behaviour, responses, error codes and a sample request and response.",
    reads: "The stories and the platform's API rules",
    makes: "The API specification",
  },
  {
    name: "Data model",
    id: "design-data-model",
    kind: "Step 2",
    job: "What the service keeps, how the pieces relate, the life of each record, what every field means, and the business rules.",
    reads: "The stories and the platform's database rules",
    makes: "The data model",
  },
  {
    name: "Schema",
    id: "design-schema",
    kind: "Step 3",
    job: "The SQL: tables, named constraints, indexes, access grants, sample rows and the most common queries.",
    reads: "The data model, which it must match exactly",
    makes: "The schema",
  },
  {
    name: "User journey",
    id: "design-user-journey",
    kind: "Step 4",
    job: "Step by step, what a person sees and what the system does, including what happens when something goes wrong.",
    reads: "The stories and the API's error codes",
    makes: "The user journeys",
  },
  {
    name: "UI components",
    id: "design-ui-components",
    kind: "Step 5",
    job: "Each component a service ships for apps to use: its purpose, inputs, every state, and the endpoint it calls.",
    reads: "The user journeys and the API spec",
    makes: "The component contract",
  },
  {
    name: "Read me",
    id: "design-readme",
    kind: "Step 6",
    job: "What the module is, why it exists, what is in and out of this version, how it works, a quick start and its configuration.",
    reads: "All the documents above",
    makes: "The developer guide",
  },
  {
    name: "Publish product page",
    id: "publish-product-page",
    kind: "Step 7",
    job: "Moves the design onto the module's page on this site, regenerates its documents, and checks the page at six screen widths.",
    reads: "The finished design",
    makes: "The product page you see under Products",
  },
  {
    name: "Record token costs",
    id: "record-token-costs",
    kind: "After each story",
    job: "Measures what each request cost from the session record, assigns it to a story as build, rework or scaffolding, and updates the Token Costs table below.",
    reads: "The session transcript and the token ledger",
    makes: "The Token Costs table",
  },
  {
    name: "Estimate human cost",
    id: "estimate-human-cost",
    kind: "When an issue closes",
    job: "Works out what a human team would cost per story, so far and projected, from the story sizes in the epics files and the closed issues, at a rate shown as an assumption. Nothing is typed by hand.",
    reads: "The epics files, the cost model, closed GitHub issues and the token ledger",
    makes: "The human cost data for Total Cost",
  },
  {
    name: "Review the architecture",
    id: "review-architecture",
    kind: "Across all modules",
    job: "Reads every module's design at once and checks the seams: calls between services, events, data ownership, failure cases, security and the sequence diagrams. Writes a findings report with severity, owner and proposal.",
    reads: "Every design, the architecture decisions and the stories",
    makes: "An architecture review in docs/architecture/reviews",
  },
].map((skill) => ({ ...skill, href: `${REPO}/.claude/skills/${skill.id}/SKILL.md` }));

export const designSkillCount = 8;

export const rulesHref = `${REPO}/docs/process/DESIGN-RULES.md`;
