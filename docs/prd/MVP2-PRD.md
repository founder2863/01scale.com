# PRD — DocFlow MVP2: Own identity, many documents, trustworthy AI

| | |
|---|---|
| Owner | Nikhil Shrivastava |
| Status | Draft |
| Depends on | MVP1 shipped |
| Epics | `docs/epics/MVP2-EPICS.md` (E8–E14) |
| Evals | `docs/evals/EVALS.md` (MVP2 section) |

## 1. Summary
MVP2 replaces Cognito with a hand-built passwordless identity system, handles batches of documents, adds an LLM judge and web enrichment with chat-based correction, introduces saved payment methods and payment history, and notifies users by SMS and push as well as email.

**How it is built.** MVP2 is the next version of each platform service, not a rewrite of the app: Identity moves from consuming Cognito to being its own provider, Extraction gains orchestration and a judge, Payment and Delivery gain new capabilities. Each service keeps its API contract, so DocFlow changes only where it uses a new capability. See `docs/architecture/ARCHITECTURE.md` §8.

## 2. Why
- **Identity:** prove the ability to build what an identity company sells (magic links, passkeys, sessions, account recovery), not just configure a vendor.
- **Scale and trust:** real users process batches, and they need to trust the AI more than model self-confidence allows.
- **Commerce:** returning users expect saved cards, history and notifications.

## 3. Goals and non-goals
**Goals**
1. All existing MVP1 users can sign in with a magic link or passkey, with no password and no lost accounts.
2. A batch of up to 10 documents processes in parallel and is reviewed in one tabbed screen.
3. With the LLM judge, at least 95% of wrong fields are routed to review, without raising the share of fields flagged above 25%.
4. Every enriched metadata value cites a source, and users can correct data by chatting, with every change shown as a diff and logged.
5. Returning users pay with a saved default card in one tap.

**Non-goals**
- Enterprise SSO, RBAC/ABAC and SCIM (a later identity phase).
- Live payments.
- Native mobile apps. Push is web push, including iOS home-screen web apps.

## 4. Feature requirements

### A · Passwordless identity, built by hand (E8)
- **Sign-in methods:** magic link (default); passkeys (register after the first sign-in, then use as the primary method); email one-time code as a fallback for devices where links open in the wrong browser.
- **Sessions:**
  - Opaque random tokens stored only as hashes, with a sliding 7-day expiry and a 30-day absolute limit.
  - A sessions page where users can see devices and revoke sessions.
  - Re-authentication required for sensitive actions: removing a passkey, changing email, deleting the account, removing a payment method.
- **Recovery:** email-based recovery, plus 10 single-use recovery codes offered when the first passkey is registered.
- **Security:**
  - Rate limits per email and per IP; the same reply whether or not an account exists; short-lived single-use tokens.
  - The magic link opens a confirmation page, so email link scanners can't sign the user in.
  - Every auth event goes to the audit log.
- **Migration from Cognito:**
  - Matching by verified email; the user record keeps the same internal user ID.
  - Cognito stays read-only for 30 days, then is shut down.
- **Libraries allowed:** `@node-rs/argon2`, `jose`, `@simplewebauthn/*`, Node `crypto`, Resend. Nothing else for auth.

### B · Multi-document support (E9)
- Batch upload of up to 10 files (same limits per file as MVP1).
- A Python + LangGraph orchestrator on AWS Lambda fans out one extraction per document (at most 3 at once), collects the results and handles partial failure (successful documents continue; failed ones can be retried individually).
- A batch status page shows per-document progress.

### C · LLM as judge (E10)
- After extraction, a judge model checks each field against the document and returns `correct | incorrect | unsure` with a short reason.
- The judge uses a different prompt and, ideally, a different model tier from the extractor.
- Final confidence combines the model's own confidence, the rule checks and the judge's verdict. Routing to review uses this combined score.
- A report compares the judge with human decisions in production (agreement rate).

### D · Metadata enrichment and chat correction (E11)
- **Research agent** (Claude web search tool) enriches vendor metadata: official website, normalized address, business category, and whether the vendor appears to be a registered business. Every value carries its source URL(s) and the date retrieved.
- **No document PII** (amounts, bill-to details, line items) is ever sent in web search queries.
- **Human review of enrichment:** accept or reject each suggested value.
- **Chat panel:** the user asks the agent to fix data in plain language ("the total is 1,240 not 1,420"). The agent proposes a diff, and the user applies or rejects it. The agent can only change fields through defined tools, never by free-text rewriting. Each applied change is logged and can be undone.

### E · Multi-document review and outputs (E12)
- Tabbed review: one tab per document, with a flagged-field count per tab and a "next flagged field" shortcut across tabs.
- Outputs:
  - Per-document JSON and a combined JSON array.
  - A combined CSV with a `document_id` column, plus a ZIP with one CSV per document.
  - Download all.

### F · Payments v2 (E13)
- A Stripe Customer per user.
- Save a card during checkout or from a Payment methods page (SetupIntent through Stripe Elements; card data never touches our servers).
- List, add, remove and set the default card; removing one requires re-authentication.
- Pay for a batch with the default card in one tap; 3-D Secure is handled when required.
- Payment history page: date, documents, amount, status, receipt link.

### G · Notifications (E14)
- A notification preferences page: email (on by default), SMS (opt-in), push (opt-in).
- **SMS:**
  - The phone number is verified with a one-time code built by hand (reusing the E8 code service).
  - Sent via Twilio, with AWS SNS as the alternative.
  - Honour STOP/opt-out.
- **Push:** web push via a service worker with VAPID keys; supports multiple devices; expired subscriptions are cleaned up.
- **Events:** batch extracted, review needed, payment succeeded, files ready.
- A notification log per user with each attempt's delivery status.

## 5. Non-functional requirements
- **Security:** OWASP ASVS L2 for the auth chapters, passkeys only on 01scale.com, CSRF protection on state-changing routes, secrets in AWS Secrets Manager or Vercel environment variables.
- **Performance:** a 10-document batch is extracted in under 3 minutes (p95). The judge adds no more than 30% to extraction time.
- **Cost:** no more than $0.20 per document including judge and enrichment.
- **Privacy:** enrichment queries contain only vendor-identifying data; users can export and delete their data.

## 6. Success metrics
- Share of sign-ins using a passkey (target: 40% of returning users).
- Magic link success rate (sent → completed) of at least 85%.
- Routing recall of at least 95% and a flag rate of at most 25% (evals).
- Chat corrections: at least 95% applied correctly, zero unrequested changes (evals).
- Repeat purchase with a saved card in no more than 2 taps.

## 7. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Users locked out during migration | Lazy migration by verified email, Cognito read-only window, recovery codes |
| Email link scanners consume magic links | The link opens a confirmation page; the token is used only on a deliberate click |
| The judge agrees with the extractor's mistakes | Different prompt and model, judge sees only the document plus a single field, agreement measured against human labels |
| Enrichment leaks PII or cites bad sources | Query allow-list of vendor fields, PII redaction test in evals, citations required, human approval |
| SMS cost or abuse | Opt-in only, verified numbers, per-user daily cap |

## 8. Release plan
E8 (identity) can ship on its own first. Then E9 → E10 → E12 (multi-document core), E11 (enrichment and chat), E13 (payments v2) and E14 (notifications). Each epic gets a tagged release and a demo clip.
