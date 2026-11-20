# MVP1-E1 · Identity: decision log

## 2026-11-17 · Services act for a user with a delegated token

**Decided by:** Nikhil, after Claude's architecture review (finding B2, `docs/architecture/reviews/2026-11-17-mvp1.md`). Discussion: issue #24.

**Problem.** Some steps run with no person present: DocFlow's handling of `extraction.job.completed` (read the fields, create a Review task), and Extraction's background fetch of the file. There is no user token to pass on, but every service must still know which user the work is for.

**Options.**

| | A: delegated token (chosen) | B: service token plus `owner_id` |
|---|---|---|
| How | A service, signed in as itself, asks Identity's `POST /token` for a 5-minute token for a named user (`on_behalf_of`, the token-exchange pattern of RFC 8693) | A service calls others as itself and names the user in the body |
| Ownership rule | One, in every service: the token's user owns it | Two paths in every service |
| Audit | User and acting service (`act` claim) | Depends on each service copying `owner_id` |
| Contracts | Lose fields (`owner_id`, `user_id`) | Gain fields |
| Cost | More to build in Identity first; an extra call per step, cached for 5 minutes | Quicker; the rule is copied six times |
| Risk | A powerful service credential, limited by an allow-list, narrow scopes and 5-minute tokens | One mistake in one service exposes any user's data |
| Later | The model OAuth for agents uses | Likely replaced |

**Why A.** I keep the security rule in one place and every service simple, and audit always shows who acted for whom. The extra work lands once, in Identity, the service I know best.

**Consequences.**
1. Identity's `POST /token` gains:
   - a client-credentials grant for services and apps (secrets hashed in Identity, held in environment variables), with claims `auth: service`, `app`, `sub: service:<name>`;
   - the `on_behalf_of` exchange, with claim `act`, for allowed services only, and never with scopes for keys, passwords or accounts.
2. The service template adds `requireService(scope)` and records `act` in audit events.
3. DocFlow and Extraction use delegated tokens. Upload drops `owner_id`. Payment and Delivery take the user from the token.
4. ARCHITECTURE.md's sequence diagram shows which calls use a user, delegated or service token.
