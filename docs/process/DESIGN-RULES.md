# Design rules — shared by every design skill

Every skill in `.claude/skills/design-*` and `publish-product-page` reads this file first. It holds the rules that are the same for every document, so the skills do not drift apart.

## What a module's design consists of

| Document | File in `docs/services/<service>/` | Skill |
|---|---|---|
| Requirements | (the stories in `docs/epics/`) | none: written by Nikhil, never generated |
| API specification | `API-SPEC.md` | `design-api-spec` |
| Data model | `DATA-MODEL.md` | `design-data-model` |
| Schema | `SCHEMA.md` | `design-schema` |
| User journeys | `USER-JOURNEYS.md` | `design-user-journey` |
| UI components | `UI-COMPONENTS.md` | `design-ui-components` |
| Read me | `README.md` | `design-readme` |
| Product page on the site | `/products/<module>` | `publish-product-page` |

`design-module` runs them in order.

## Order, and why

1. **API spec** and **data model** first. Everything else refers to them.
2. **Schema** next. It must match the data model field for field.
3. **User journeys** and **UI components**. Journeys use the API's error codes; components call the API's endpoints.
4. **Read me** last. It summarises the others and must not say anything they do not.
5. **Product page**: assembly only, no new content.

## Rules for all documents

1. **The stories are the source.** Read the module's stories in `docs/epics/` first. Design exactly what their acceptance criteria require. If a story is silent, make the smallest reasonable choice and list it under "Open questions" or "Refinements beyond the stories"; never present a guess as settled.
2. **Scope is the current version only.** Do not describe a later version's behaviour except in one "Not in this version" list.
3. **Never invent to fill a gap.** If something is not decided, the document says so. On the site, an undecided section shows "Coming Soon...".
4. **One source per module.** A module's design content lives in one file, `scripts/site/<key>_design.py`, which holds data only; `scripts/site/render.py` turns it into the documents and the site data with `npm run site:data`. Never edit a generated file by hand: `docs/services/<service>/*.md`, `app/products/<key>.ts`, `app/products/data.ts`, `app/products/details.generated.ts`.
5. **Follow the platform rules.** `docs/architecture/ARCHITECTURE.md`, `API-DESIGN.md` and `DATABASE-DESIGN.md` win over anything here. A service owns its data, publishes a contract, and never reaches into another service.
6. **Services are app-agnostic.** No DocFlow-specific wording or logic in a platform service's design.
7. **Plain language.** A reader who is not a developer should follow the first paragraph of every section. Define a term the first time it is used.
8. **Voice.** Decisions are Nikhil's: write "I chose", never "we". Descriptions of how the system behaves are in the present tense.
9. **Status is stated.** Every document opens with the version and whether it is designed or built.
10. **Sample data is safe.** Use `example.com` addresses and made-up IDs. Never real names, emails, keys or secrets.
11. **Security defaults.** Store hashes, never tokens or passwords. Other users' records return `404`. Never reveal whether an account exists. See `CLAUDE.md`, "Secure by default".
12. **User data stays private.** A user's data never leaves that user's account: it is never seen by another user and never written to the public repository (code, docs, datasets, fixtures, eval reports, logs, issues or PR comments). Test data in the repository is synthetic or public with a clear licence. A design that exports, copies or publishes user data (for example to `evals/`) is a finding. Admin views of all users are for the owner only, behind `is_admin`.

## Definition of done for a module's design

- Every acceptance criterion in the module's stories is covered by an endpoint, a table, a journey step or a component, or is listed as needing no design.
- Every endpoint a component calls exists in the API spec. Every error code a journey mentions exists in the API spec. Every field in the schema exists in the data model, and the reverse.
- `npm run site:data` runs clean and `npm run build` passes.
- The product page shows the content on all seven tabs, with no sideways scrolling at 320, 390, 768, 1024, 1440 and 1920 pixels.
- Open questions and refinements beyond the stories are listed in the pull request description.

## Reference example

Identity, version 1 (login with AWS Cognito): `docs/services/identity/` and `/products/login-using-aws`. Its source, `scripts/site/identity_design.py`, predates the shared renderer and also holds its own rendering code; new modules hold data only. Upload (`scripts/site/upload_design.py`) is the first module written the new way.
