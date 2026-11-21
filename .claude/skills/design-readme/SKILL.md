---
name: design-readme
description: Write the Read Me (developer guide) for a 01scale service module - what it is, why it exists, what is in and out of this version, how it works, a quick start and its configuration. Use when asked for a module's read me, overview or developer guide, or as step 6 of design-module, after the other design documents exist.
---

# Design a Read Me

The first page someone reads about a module. Write it last: it summarises the other documents and must not say anything they do not.

## Read first

`docs/process/DESIGN-RULES.md`, the module's other design documents, and `docs/services/identity/README.md` as the example.

## Write, in this order

1. **What this service is**: two or three short paragraphs a non-developer can follow.
2. **Why it exists**: three or four reasons, each a short title and one or two sentences.
3. **In this version** and **Not in this version**: two lists. The second names the story or version where each item lands.
4. **How it works**: numbered steps naming who acts (browser, this service, an outside provider, the gateway, another service).
5. **Words used here**: only the terms this module introduces.
6. **Quick start**: three or four copyable examples covering the most common uses, each with one sentence of context. Say they work once the service is built.
7. **Configuration**: each environment variable, its shape, and whether it is a secret.
8. **Open questions**.

## Rules that are easy to get wrong

- The Read Me is the technical entry page. The site wraps it with **At a glance** (links to the Product sections) and **Go deeper** (links to the technical sections), so do not write those lists or repeat what the sections say. Technical links to a module (GitHub READMEs, the API catalogue) go to `/products/<module>/readme`; `/products/<module>` is Market Outlook, for market-facing visitors (`MVP1-E0-21`).
- The first paragraph answers "what is this for" before any mechanism.
- "Why it exists" gives reasons, not features.
- Quick-start code uses only endpoints in the API spec, with the same paths and field names.
- Never show a real secret or a value that looks like one.
- Link to the other documents; do not repeat their tables.
- State the version and status at the top.

## Checks

- A reader could decide whether the module is relevant to them from the first screen.
- Every endpoint, cookie, token or variable named here exists in the API spec or configuration list.
- Nothing describes a later version outside the "Not in this version" list.

## Output

The overview, flow, glossary, quick-start, configuration and open-question data in `scripts/site/<service>_design.py`; `README.md` is generated from it.
