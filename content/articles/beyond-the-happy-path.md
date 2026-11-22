Architecture diagrams make payments look clean. Production does not.

I built an embedded payments product inside a regulatory and compliance platform, which grew to $100M+ in gross transaction volume with 40+ enterprise customers in 18 months. Most of what I learned didn't come from the happy path. It came from fees, refunds, returns, limits, onboarding delays and reconciliation breaks: the things no architecture diagram warns you about.

If your software company is adding payments as a new revenue line, or already has one, these are the ten lessons I'd want you to know on day one. They are ordered from the most strategic to the most foundational. Seasoned payments teams will know the last few well; teams new to payments should treat them as non-negotiable.

First, a quick primer and a word on the economics, because every lesson ultimately shows up in them.

## A 60-Second Primer

A Payment Service Provider (PSP) lets a business accept, process and settle payments across cards, wallets and bank transfers through a single integration. Stripe, Adyen, Checkout.com, PayPal, Square, Worldpay, Global Payments and Moneris are well-known examples. Behind that one integration, the PSP handles fraud checks, tokenization, routing, compliance (PCI DSS, KYC/KYB, AML), ledgers and payouts.

Cards and bank transfers work very differently, and that difference drives many of the lessons below:

- Cards: the merchant's bank (the acquirer) and the customer's bank (the issuer) talk through a card network such as Visa or Mastercard. Authorization happens in milliseconds; funds settle in one to two business days. Customers dispute payments through chargebacks.
- ACH (US bank transfers): there is no real-time authorization. Payment instructions are batched into files and exchanged between banks at fixed windows. The bank sending the instruction is the ODFI and the payer's bank is the RDFI. Instead of chargebacks, the payer's bank sends "returns" with reason codes, sometimes weeks later.

Software companies typically offer payments in one of three ways: referring customers to a PSP, embedding a PSP's white-label product, or becoming a payment facilitator (PayFac) that onboards merchants under its own master account. Each step up earns more revenue but takes on more risk, compliance and operational work.

## The Business Case: What Embedded Payments Actually Earn

When a software company adds payments, two numbers matter: how many customers adopt it (attach rate) and how much of each payment the platform keeps after costs (net take rate).

It helps to separate two rates:

- Gross rate: what the merchant or payer pays. For cards, list pricing is typically around 2.9% + 30¢ online, and government convenience fees commonly run 2.3% to 3.3%.
- Net take rate: what the platform keeps after interchange, network fees and processor costs. This is the number that matters.

Industry benchmarks for net take rate on card volume:

- Toast, one of the most successful vertical SaaS payments businesses, reported a payments take rate of about 0.48% in Q4 2025 (0.58% including other fintech products).
- A study of vertical SaaS platforms by Rainforest found effective take rates in tiers of roughly 0.83%, 0.98% and 1.13%+.
- Industry estimates put white-label PayFac models at around 0.5%, and full in-house PayFac models at roughly 0.5% to 1.0%, with higher risk and compliance cost.

In short, net take rates in vertical SaaS typically range from about 0.5% to 1.5% on card volume, depending on the model, merchant size and who pays the fee.

ACH economics look completely different. Pricing is usually flat or capped rather than a percentage:

- Stripe lists ACH at 0.8%, capped at $5.
- Square charges 1% with a $1 minimum and a $5 to $10 cap.
- Adyen charges roughly $0.40 per ACH payment.
- ACH specialists charge roughly $0.20 to $0.50, and the general market range is $0.20 to $1.50, plus $2 to $5 per returned payment.
- Government agencies commonly charge payers a flat e-check fee of $0 to $2.50, often $1.50.

This creates a real product tension. Steering large payments to ACH (see Lesson 6) protects the merchant's or payer's costs, but it also cuts the platform's revenue: a $1 fee on a $5,000 payment is a 0.02% take rate, compared with roughly 1% on a card. Good payments products don't pretend this tension doesn't exist. They design pricing for it, through payer-paid fees, tiered pricing, ACH caps that still cover costs, and value-added services such as faster payouts and reconciliation tools.

Attach rate is the other half of the equation. Building payments is the easy part; convincing existing customers to switch from their current processor is the hard part. New customers adopt far more readily when payments are part of onboarding, while existing customers need migration help, incentives and a clear reason to switch. In enterprise and government markets, with long procurement cycles, every customer that goes live represents significant volume.

## Lesson 1: Design fees for multiple parties from day one

In embedded payments, money rarely moves between just two parties. A single payment can involve the payer, the merchant, the software platform, the processor, and sometimes a reseller or implementation partner that earns a share. Every contract can answer the fee questions differently:

- Who pays the processing fee: the payer (through a convenience or service fee), the merchant, the platform, or a split between them?
- How is the platform's fee calculated: flat, percentage, tiered by volume, capped, or with a minimum?
- Does pricing differ by payment method, for example a percentage on cards but a flat fee on ACH?
- Who receives a revenue share, and when is it paid?
- Who absorbs the cost of refunds, disputes and returned payments?

Liability is part of the same design. In platform setups such as Stripe Connect and Worldpay for Platforms, who pays processing fees and who is liable for refunds, disputes and negative balances depends on how charges are structured. When a merchant's balance goes negative after refunds or disputes, the platform is often the one left covering it.

If fees are hard-coded around your first customer, every new contract becomes an engineering project, pricing changes need a code release, and finance teams can't explain statements to customers.

**What to do:** build fees as configuration from day one, not code, not any custom file. Support fee schedules per merchant or contract, with effective dates so old transactions keep old pricing. Model every party in the money flow and their split. Define rounding rules once. Show a clear fee breakdown on receipts and statements. And settle liability for refunds, disputes and negative balances in contracts before the first payment, not after the first loss.

## Lesson 2: Refunds return the payment, not the fee

When a payment is refunded, the payer gets their money back, but the processor usually keeps its fee. Stripe states that processing, Connect and currency conversion fees from the original charge are not returned on refunds. PayPal adopted the same policy in 2019, with limited exceptions such as duplicate transactions and most disputes.

So on a $100 card payment with a $3 fee, a full refund still costs someone $3, plus any refund or return fees. That someone is the merchant of record, the platform, or the payer, depending on what was agreed upfront.

This is why many government payment pages state that convenience fees are non-refundable. Card network rules shape how these fees can be charged. Since Visa's rule changes of October 18, 2025, convenience fees must be a flat amount, percentage-based service fees are limited to government, education and utility merchants, and fees must be disclosed before payment with an option to cancel. But whether a fee is refundable is not set by the networks. It comes from your own terms and contracts, which is why it has to be decided and disclosed deliberately.

Refunds have other traps too: partial refunds, refunds issued after the money has already been paid out to the merchant (which can push their balance negative), and ACH refunds, which are new outgoing payments rather than reversals of the original.

**What to do:** decide the refund-fee policy for every contract (it belongs in the fee configuration from Lesson 1). State it clearly on the payment page, receipts and terms. Build refund flows that show the fee impact before the refund is issued. And include expected refund rates in your pricing model.

## Lesson 3: ACH settles fast for most payments, but the long tail is where the work is

The vast majority of ACH payments are confirmed within 3–4 business days. That sounds reassuring, but the small share that isn't creates a disproportionate amount of support tickets, reconciliation breaks and finance escalations.

Why 3–4 days and not 1? Under NACHA rules, an ACH debit itself settles between banks in one to two business days. But the payer's bank then has two banking days to return it for common reasons such as insufficient funds or a closed account. Most processors wait out that window before treating a payment as final, which is why merchants see 3–4 days.

The long tail comes from several causes:

- Insufficient or uncollected funds (return codes R01, R09). The payer's account didn't have the money when the debit arrived.
- Closed, invalid or frozen accounts (R02, R03, R04, R16). Common when payers mistype account numbers or use old accounts.
- Stop payments (R08). The payer told their bank to block this specific payment.
- Debit blocks and ACH filters on business accounts. Many companies tell their bank to reject any ACH debit from an originator they haven't pre-approved. These usually come back as R29 ("corporate customer advises not authorized") and are fixed by the payer whitelisting your company ID with their bank, which can take days.
- Limits set by the payer's bank. Banks cap the size or daily total of ACH debits on some accounts, especially newer or smaller ones.
- Unauthorized-debit disputes. ACH has no chargeback process. Instead, a consumer can sign a statement that a debit was unauthorized, and their bank can return it as late as 60 calendar days after settlement (R05, R07, R10, R11). Business accounts get a much shorter window, two banking days (R29). This means a "settled" consumer payment is not fully final for two months.
- Processor risk holds. New merchants, unusually large payments or sudden volume spikes can trigger reviews or rolling reserves at the processor, delaying payouts.
- Fraud monitoring. Since 2026, NACHA rules require originators, processors and banks to run risk-based fraud monitoring on ACH payments (phase 1 from March 20, 2026, phase 2 from June 2026). Payments that look unusual may get extra review.
- Weekends and bank holidays. ACH only moves on banking days, so a payment made on a Friday before a long weekend can take a week.

Many of these can be prevented before the first debit. Since March 19, 2021, NACHA has required businesses that debit consumer accounts online to validate the account before its first use, through micro-deposits, a prenote, or an instant account validation service. Validation catches mistyped, closed and invalid accounts before they become returns.

**What to do:** validate accounts before the first debit, show payers and merchants a clear "pending" state, track every return by reason code, build automatic re-presentment for insufficient funds (NACHA allows limited retries), and never retry unauthorized returns.

## Lesson 4: Default transaction limits will block your largest customers

Processors and their banks apply default limits to new merchants to contain fraud and credit risk: a maximum single transaction size, a daily total, and often a monthly total. Under NACHA rules, the bank that originates ACH payments is responsible for managing the risk of each originator, and limits are its main tool.

Defaults are usually set for a typical small business. For enterprise and government customers, a single legitimate payment can exceed the default ceiling, and the payment simply fails, often at the worst possible moment, like a filing deadline.

Limits can be raised, but only with evidence: historical transaction volumes, examples of large payments, bank statements, financial statements or contracts that show expected volume.

**What to do:** ask enterprise customers about their largest expected payment during onboarding, request limit increases before go-live rather than after the first failure, and plan for seasonal peaks such as tax and renewal deadlines.

## Lesson 5: KYB onboarding stalls on finding the right person

Every merchant onboarding requires Know Your Business (KYB) checks. Under US anti-money-laundering rules (FinCEN's Customer Due Diligence rule), the provider must identify the business's beneficial owners in two ways:

- Ownership: every individual who owns 25% or more of the business.
- Control: one individual with significant responsibility to control or manage the business, such as a CEO, CFO, COO, president, managing member or treasurer.

The control person is required in every case, even when no one owns 25% or more. In small businesses, this takes minutes. In large organizations, it can take weeks: the person who signed up is usually in finance or IT, not an executive, and finding an officer who is willing to provide personal details (name, date of birth, address, ID number) involves legal and internal approvals.

Two common sources of confusion:

- The control person is not necessarily the person who signs the agreement. The authorized signer accepts the terms; the control person is the senior official whose identity is verified. Onboarding flows should ask for both and explain the difference.
- Government agencies and publicly listed companies are generally excluded from the beneficial ownership requirement under the rule. Even so, many processors still ask for a named authorized representative, so public-sector onboarding is not friction-free.

**What to do:** explain upfront why the information is needed and who usually qualifies, allow onboarding to be saved and handed off to another person, and let teams start configuring while verification completes.

## Lesson 6: Business cards carry higher fees and eat margin fast

Commercial and business cards typically cost merchants well above 2.5% per transaction, depending on payment size, card type and the merchant's contract. When your pricing to customers assumes consumer-card economics, a shift toward business cards erodes profitability quickly, especially on large-ticket payments.

There are ways to manage this:

- Send enhanced transaction data. Card networks offer lower interchange on commercial cards when the merchant passes extra data such as tax amount, customer code and line items (historically called "Level 2" and "Level 3" data). Visa moved this into its Commercial Enhanced Data Program in 2025. Industry estimates put the savings at roughly 0.5 to 1.5 percentage points on qualifying transactions.
- Large-ticket interchange rates. Very large commercial card payments can qualify for lower rates, but usually only with enhanced data.
- Surcharging, where allowed. In the US, Visa caps credit card surcharges at 3% (or the merchant's actual cost, if lower) and some states restrict surcharging. In Canada, surcharges are capped at 2.4% and are not allowed in Quebec. Surcharges are not allowed on debit cards.
- Steer large payments to ACH. A flat ACH fee on a $50,000 payment is far cheaper than any card fee. Making ACH the default for large invoices protects margin, with the revenue trade-off described in the business case above.
- Negotiate enterprise contracts on interchange-plus pricing rather than flat-rate pricing, so card-mix changes don't silently eat your margin.

## Lesson 7: You can't selectively refuse business cards

A natural reaction to Lesson 6 is "let's just not accept business cards." Under the card networks' Honor All Cards rules, that generally isn't allowed in the US: if you accept a network's credit cards, you must accept all of its credit cards, including commercial and premium cards. Merchants can choose to accept credit but not debit (or the reverse), but not to block a category within credit.

This may change. A revised settlement between Visa, Mastercard and merchants, which received preliminary court approval in June 2026, would let US merchants choose whether to accept commercial, premium and standard consumer credit cards separately. It is not final yet, so product teams should design for today's rules while planning for more flexibility.

**What to do:** handle business card costs through pricing, surcharging, enhanced data and ACH steering (Lesson 6), not through acceptance rules.

## Lesson 8: Reconciliation is slow because "settled" means different things on different days

Card payments reconcile relatively cleanly: authorization, capture and payout follow a predictable pattern. ACH is harder because each payment settles on its own timeline. The payment may settle one or two days after submission, the processor may confirm it after the return window, the payout to the merchant may follow on another schedule, and a return can arrive days or weeks later and reverse money that was already paid out.

Other complications:

- Payouts are often netted. One deposit to the merchant's bank combines many payments, minus fees, minus refunds and returns, so finance teams can't match deposits to invoices one to one.
- Card and ACH payments settle on different schedules, so a single day's sales arrive in several deposits.
- Returns and refunds arrive as separate events and must be matched back to the original payment.

The foundation that makes this manageable is a proper ledger. Experienced payments engineers converge on the same principles: use double-entry bookkeeping so every movement of money has two sides that must balance; make entries append-only, so refunds and corrections are recorded as new entries rather than edits; and store amounts as whole numbers in the smallest currency unit (cents), because decimal rounding errors compound across millions of transactions.

**What to do:** run reconciliation from your own ledger, not from bank deposits. Record every payment with its processor ID and expected settlement date, move it through clear states (pending, settled, paid out, refunded, returned), match payouts against the processor's itemized payout report, and keep an aging report of payments that haven't settled by their expected date. This turns reconciliation from a monthly fire drill into a daily exception list.

## Lesson 9: ACH cut-off times are fixed by the system; your processor's are earlier

Same Day ACH runs on fixed windows set by the ACH operators. For the Federal Reserve's FedACH service, the file submission deadlines are 10:30 a.m., 2:45 p.m. and 4:45 p.m. Eastern Time, with settlement at 1:00 p.m., 5:00 p.m. and 6:00 p.m. ET. Payments that miss the last window settle the next banking day.

Your processor's cut-off is always earlier than these deadlines, because it needs time to run fraud checks, build and validate files and send them to its bank. Each processor allocates that time differently, so cut-offs vary by vendor, sometimes by an hour or more.

Two more details matter:

- Same Day ACH has a per-payment limit of $1 million (rising to $10 million in September 2027). Larger payments settle next day.
- Weekends and federal holidays don't count. A payment made at 5 p.m. ET on a Friday before a holiday Monday won't move until Tuesday.

**What to do:** publish your actual cut-off times to customers, show the expected settlement date at checkout, and design payout schedules around the windows rather than around calendar days.

## Lesson 10: Build idempotency in from the first transaction

Payments have many failure points: a user double-clicks "Pay," a browser retries after a timeout, a mobile app resends on a reconnect, a message queue delivers the same event twice, a processor times out without telling you whether the charge went through, or a batch job restarts halfway. Every one of these can turn into a customer being charged twice.

The fix is idempotency: every payment request carries a unique key, and the system guarantees that the same key can only ever create one payment. Repeating the request returns the original result instead of creating a new charge. Stripe popularized this pattern with its Idempotency-Key header.

Webhooks, the notifications processors send when a payment succeeds, fails or is returned, need the same discipline. Processors retry them, so the same event can arrive more than once, and events can arrive out of order. Verify each webhook's signature, ignore events you've already processed, and never assume a "succeeded" event arrives before a "refunded" one.

Practical rules:

- Generate the key when the payment is created, not when it is sent, and reuse it on every retry.
- Enforce uniqueness in the database, not just in application code.
- When a processor call times out, check the payment status with the processor before retrying.
- Track each payment in a clear state machine (created, submitted, pending, settled, refunded, returned) so recovery jobs know exactly what to do.

ACH has its own duplicate protections. NACHA has a return code for duplicate entries (R24), and originators can reverse duplicate or erroneous entries within five banking days. But reversals are messy and visible to customers. It is far cheaper to never create the duplicate.

Retrofitting idempotency after launch is painful, because every integration path has to be audited. Build it in from day one.

## Why Vertical Embedding Changes the Game

Most of these lessons get easier when payments are built into the workflow rather than bolted on.

Horizontal payment platforms provide standardized tools that work across any industry. Vertically embedded payments are built into a specific workflow, such as a regulatory filing, a license renewal, a permit application or a subscription lifecycle. The payment is tied to the business record it belongs to.

That tie is what makes the hard parts manageable. Fees and refund policies can be set per contract and per workflow (Lessons 1 and 2). Returns and holds can be handled in context, for example by pausing a license approval until a returned payment is resolved (Lesson 3). Limits and onboarding can be planned around known customer volumes (Lessons 4 and 5). Reconciliation improves because every payment maps to a specific filing or invoice (Lesson 8). And audit trails come built in, which matters enormously in regulated industries.

The architectural shift is that transactions stop being isolated financial events and become part of the workflow's state: a payment moves a filing forward, a return moves it back.

## What's Next: Agentic Commerce Is an Identity Problem

Three trends will shape embedded payments over the next few years: payment orchestration across multiple PSPs to improve reliability and cost; real-time rails such as RTP, FedNow and Interac, which remove much of the settlement uncertainty in Lessons 3 and 8; and agentic commerce.

Agentic commerce, where AI agents initiate purchases and payments on behalf of people and businesses, is the most interesting for product builders. At its core, it is an identity problem. Every agent-initiated payment needs answers to three questions: which agent is acting, on whose behalf, and within what limits. That requires machine identities and credentials for agents, scoped permissions such as spending caps, merchant restrictions and expiry dates, and an audit trail that links each payment back to the human or organization that delegated authority.

PSPs and vertical platforms that solve this will become the trust and control layer for machine-initiated commerce.

## The Takeaway

For software companies, payments are one of the strongest revenue and retention levers available. But the hardest problems are rarely in the happy path. They live in fees, refunds, returns, limits, onboarding and reconciliation. Teams that design for those from day one build payments products customers trust, and that trust is what drives adoption.

If you're building or scaling payments in vertical SaaS, I'd love to compare notes.

## Sources

- [NACHA, Risk Management Topics: Fraud Monitoring Phase 1](https://www.nacha.org/rules/risk-management-topics-fraud-monitoring-phase-1)
- [NACHA, Risk Management Topics: Fraud Monitoring Phase 2](https://www.nacha.org/rules/risk-management-topics-fraud-monitoring-phase-2)
- [NACHA, Supplementing Fraud Detection Standards for WEB Debits (account validation)](https://nacha.org/rules/supplementing-fraud-detection-standards-web-debits)
- [NACHA, Same Day ACH $1 million limit](https://www.nacha.org/news/same-day-ach-1-million-transaction-limit-guidance)
- [NACHA, Increasing the Same Day ACH dollar limit to $10 million](https://www.nacha.org/rules/increasing-same-day-ach-dollar-limit-10-million-0)
- [Federal Reserve Financial Services, FedACH Processing Schedule](https://frbservices.org/resources/resource-centers/same-day-ach/fedach-processing-schedule.html)
- [Modern Treasury, ACH return codes](https://www.moderntreasury.com/ach-return-codes/r10)
- [Plaid, ACH return codes guide](https://plaid.com/en-eu/resources/ach/ach-return/)
- [Stripe, Understanding fees for refunded payments](https://support.stripe.com/questions/understanding-fees-for-refunded-payments)
- [Stripe, Connect risk management](https://docs.stripe.com/connect/manage-risk)
- [Stripe, Connect refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes)
- [Stripe, Connect account balances](https://docs.stripe.com/connect/account-balances)
- [Core Business Technologies, Convenience fees and service fees](https://www.corebt.com/convenience-fees-and-service-fees/)
- [Checkout.com, Changes to Visa service fee rules](https://support.checkout.com/hc/en-us/articles/38814478450450-Changes-to-Visa-service-fee-rules-for-U-S-consumer-debit-and-consumer-prepaid-transactions)
- [Payments Dive, Court approves Visa-Mastercard settlement (June 2026)](https://www.paymentsdive.com/news/court-approves-visa-mastercard-settlement/822440/)
- [Visa Inc. Form 8-K, settlement terms (November 2025)](https://www.sec.gov/Archives/edgar/data/1403161/000140316125000093/v-20251110.htm)
- [Arent Fox Schiff, Visa reduces merchant surcharge cap to 3%](https://www.afslaw.com/perspectives/alerts/visa-reduces-its-merchant-surcharge-cap-3-effective-april-15-2023-merchants)
- [Visa Canada, Surcharging FAQ for businesses](https://www.visa.ca/content/dam/VCOM/regional/na/canada/Support/Documents/surcharging-faq-businesses-en.pdf)
- [Corpay, Level 2 and Level 3 card data](https://www.corpay.com/en-SG/resources/blog/level-2-level-3-card-data)
- [Checkout.com, Level 2 and Level 3 data in credit card processing](https://checkout.com/blog/level-2-and-level-3-data-in-credit-card-processing)
- [Federal Reserve Bank of Minneapolis, Customer due diligence requirements](https://minneapolisfed.org/article/2016/customer-due-diligence-requirements)
- [Toast, Q4 and Full Year 2025 Prepared Remarks](https://s28.q4cdn.com/141746709/files/doc_financials/2025/q4/Q4-25-Prepared-Remarks.pdf)
- [Charge Forward, Embedded Payments Benchmarks (incl. Rainforest vertical SaaS study)](https://chargeforward.io/learn/research/embedded-payments-benchmarks/)
- [Apideck, Embedded Finance for Vertical SaaS](https://www.apideck.com/blog/embedded-finance-vertical-saas)
- [Square, Fees and pricing](https://squareup.com/help/us/en/article/5068-fees-and-pricing)
- [Adyen, Pricing](https://www.adyen.com/pricing)
- [Ramp, ACH processing fees](https://ramp.com/blog/ach-processing-fees)
- [Johnson County (KS) Tax Office, Payment options](https://johnsoncountytaxoffice.org/payment-options)
- [Ajit Singh, Payment System Design: Ledger, Idempotency, and Settlement](https://singhajit.com/payment-system-design/)
