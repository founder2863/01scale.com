---
name: design-module
description: Design one 01scale product module end to end, from its stories to its product page, by running the design skills in order. Use when asked to "design", "spec" or "document" a module or service (for example "design the Upload module"), or to bring a module from "Planned" to "Designed".
---

# Design a module

Runs the seven design skills for one module in the right order and checks that their outputs agree. It writes design only: no service code, no migrations.

## Before starting

1. Read `docs/process/DESIGN-RULES.md`. Its rules apply to every step.
2. Read `docs/architecture/ARCHITECTURE.md`, `API-DESIGN.md` and `DATABASE-DESIGN.md`.
3. Find the module in `scripts/site/build_products.py` (`MODULES`) to get its slug, service, epic and story IDs, then read those stories in `docs/epics/`.
4. Open the reference example: `scripts/site/identity_design.py` and `docs/services/identity/`.

If the stories are missing acceptance criteria, stop and ask. Do not design from a title alone.

## Steps

Create `scripts/site/<key>_design.py` defining `KEY` (a short name such as `upload`), `MODULE` (the design, in the same shape as `app/products/identity.ts`) and `COMPLETE = False`. Use the helpers in `scripts/site/render.py` (`endpoint`, `param`, `column`, `journey`, `component`, ...). Then fill it one skill at a time, running `npm run site:data` and committing after each step, so the pull request has one commit per document. The product page shows "In design" and "Coming Soon..." for the parts not yet written:

| Step | Skill | Fills |
|---|---|---|
| 1 | `design-api-spec` | endpoints, cookies or tokens, error codes |
| 2 | `design-data-model` | entities, life of each record, fields, business rules |
| 3 | `design-schema` | SQL, constraints, indexes, sample rows, common queries |
| 4 | `design-user-journey` | journeys and what happens when something goes wrong |
| 5 | `design-ui-components` | components, inputs, states, the endpoint each calls |
| 6 | `design-readme` | what it is, why, scope, how it works, quick start, configuration |
| 7 | `publish-product-page` | the site page and the generated documents |

Steps 1 and 2 can be done together. Do not start step 3 before step 2 is settled, or step 6 before the others.

## Cross-checks before finishing

- Each acceptance criterion maps to something designed, or is listed as needing no design.
- Components call only endpoints in the API spec; journeys use only its error codes.
- Schema and data model list the same tables and fields.
- Nothing describes a later version except the "Not in this version" list.

## Output

- `scripts/site/<key>_design.py` with `COMPLETE = True`, the generated files, and the module shown as "Designed".
- A pull request named after the story IDs, whose description lists the technical choices, the refinements beyond the stories, and the open questions.

## Not in scope

Writing service code, changing a story's acceptance criteria (ask first), or designing a later version.
