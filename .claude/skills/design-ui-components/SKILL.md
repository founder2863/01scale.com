---
name: design-ui-components
description: Design the UI components a 01scale service module ships for apps to use - each component's purpose, inputs, states and the endpoint it calls. Use when asked for a module's UI components or component library, or as step 5 of design-module.
---

# Design UI components

Each service ships its own components as the package `packages/ui-<service>`, usable by any app. This document is their contract. It designs; it does not write React code.

## Read first

`docs/process/DESIGN-RULES.md`, the module's user journeys and API specification, and `docs/services/identity/UI-COMPONENTS.md` as the example.

## For every component, write

1. **Name** and **kind**: component, provider and hook, wrapper, or page.
2. **Purpose** in one sentence.
3. **Inputs**: name, type, and meaning. Keep them few; prefer a sensible default.
4. **States**, all of them: default, loading, empty, working, failed, disabled, and each meaningful data state.
5. **Calls**: the endpoints it uses.

Open with the **rules** all the module's components follow, and close with any **pages provided by an outside service** in this version (for example a hosted login or payment page), marked as not ours.

## Rules that are easy to get wrong

- A component calls only its own service's API. It never calls another service or reads another component's internals.
- No tokens or secrets in browser JavaScript. Session cookies are HttpOnly.
- Design the loading state so the page does not jump when data arrives.
- Design the failure state: what the person sees and how they retry.
- Keyboard reachable, visible focus, labelled controls, WCAG AA contrast, usable at 320 pixels wide, in light and dark mode.
- App-agnostic: nothing that only makes sense in DocFlow.
- Derive components from journey steps. A component no journey needs should not exist.

## Checks

- Every endpoint a component calls exists in the API spec.
- Every journey step where the person acts is served by a component or by a marked outside page.
- Every component lists a loading and a failed state where it makes a request.

## Output

The component, rule and outside-page data in `scripts/site/<service>_design.py`; `UI-COMPONENTS.md` is generated from it. Say in the pull request that the components are new design, since no story lists them.
