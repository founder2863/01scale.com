---
name: design-user-journey
description: Write the user journeys for a 01scale service module - step by step, what a person sees and what the system does, including what happens when something goes wrong. Use when asked for a module's user journey, user flow or failure cases, or as step 4 of design-module.
---

# Design user journeys

Written from the person's side. A reader should be able to picture using the module without knowing how it is built.

## Read first

`docs/process/DESIGN-RULES.md`, the module's stories, its API specification (for error codes), and `docs/services/identity/USER-JOURNEYS.md` as the example.

## For every journey, write

1. **Name**, **who** it is for, and **what starts it**.
2. **Steps** in two columns: what the person does or sees, and what the system does in response. One action per step.
3. **Result**: what is true afterwards.
4. **Stories** it covers.

Then one table, **"When something goes wrong"**: the situation, what the person sees, and the error code behind it.

## Which journeys to write

- The first-time path and the returning path.
- Arriving from a link while signed out, if the module has protected pages.
- Each way of leaving or undoing.
- Any journey a story's acceptance criteria describe.

## Rules that are easy to get wrong

- Say what the person sees, in their words. "Sees 'Sign-in took too long' and a button to start again", not "receives a 400".
- Every failure names an error code that exists in the API spec. If the code does not exist, add it there first.
- Include slow and interrupted cases: timeouts, closing the tab, coming back later, a dependency being down.
- Never promise something the stories do not: no extra screens, emails or notifications.
- A step the person does on someone else's page (a hosted login, a payment page) is marked as such.
- Works on a phone: do not describe hover or drag as the only way to do something.

## Checks

- Each acceptance criterion written as "Given / When / Then" appears as steps in a journey.
- Each error code in the API spec that a person can trigger appears in the failure table.

## Output

The journey and failure data in `scripts/site/<service>_design.py`; `USER-JOURNEYS.md` is generated from it.
