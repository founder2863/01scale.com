---
name: design-api-spec
description: Write the API specification for a 01scale service module - every endpoint with its inputs, constraints, behaviour, responses, error codes and a sample request and response. Use when asked to design, specify or review a module's API, or as step 1 of design-module.
---

# Design an API specification

## Read first

`docs/process/DESIGN-RULES.md`, `docs/architecture/API-DESIGN.md`, the module's stories (their "API design" lines are the starting contract), and `docs/services/identity/API-SPEC.md` as the example.

## For every endpoint, write

1. **Method and path** under `/api/{service}/v1`, plus a short title.
2. **Access**: Public, Signed in, Admin or Service. Service endpoints are never callable from a browser.
3. **Scope**: what a token needs. By default `<service>:read` for GET and `<service>:write` otherwise; state the exceptions (session only, admin, per tool, signature or client secret). A delegated token carries the user's scopes granted to the acting service.
4. **Inputs**: for each, where it is (path, query, header, cookie, body), type, whether required, its constraints (allowed values, length, format) and what it means.
5. **Behaviour**: what it does, in order, including what it writes and which audit event it records.
6. **Responses**: status, when, and the body or headers.
7. **Errors**: status, a stable machine-readable `code`, and when it happens.
8. **Sample request and sample response** that match the inputs and responses exactly.

## Rules that are easy to get wrong

- Errors are `application/problem+json` with a `code`. Clients branch on `code`, so never reuse one code for two meanings.
- Another user's resource returns `404`, never `403`.
- A `POST` that creates something accepts `Idempotency-Key`, or is idempotent by design. Say which.
- Lists use cursor pagination: `cursor`, `limit` → `{data, next_cursor}`.
- Long work returns `202` and a job to poll, with `Retry-After`.
- Files never pass through the API: issue a short-lived presigned URL.
- An endpoint that could reveal whether an account or record exists must answer the same way in both cases.
- Only an app's server may call an endpoint that sets a price or sends a message.
- State rate limits as starting values, and list them as an open question.

## Also cover

- Anything that behaves like part of the contract but is not an endpoint (cookies, tokens and their claims, signed events the service emits).
- Behaviour a story requires that has no endpoint of its own, and where it is handled.
- A closing list: "Constraints at the API level".

## Checks

- Every "API design" line in the module's stories appears, with the same method and path. A change to a story's contract is flagged, never made silently.
- Every sample is valid against its own endpoint's inputs and responses.
- Every error code a journey or component will need exists here.

## Output

The endpoint, cookie, claim and error data in `scripts/site/<service>_design.py`; `API-SPEC.md` is generated from it.
