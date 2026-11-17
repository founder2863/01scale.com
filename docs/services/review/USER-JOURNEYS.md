# Human Review service — user journeys

> **Version 1 · A person checks flagged fields.** Status: designed, not built. Stories: `MVP1-E4-01`, `MVP1-E4-02`, `MVP1-E4-03`, `MVP1-E4-04`.

What a person sees and what the system does while checking flagged values, in version 1.

## Check the flagged values

**Who:** Someone whose document has flagged fields · **Starts when:** Taps 'Review 3 flagged fields'. · **Stories:** `MVP1-E4-01`, `MVP1-E4-02`

| Step | The person | The system |
|---|---|---|
| 1 | Sees the flagged fields first, the least certain at the top, each with its value, the reason and the quote from the document, and '0 of 3 resolved'. | Review returns the task's queue, flagged first, lowest confidence first. |
| 2 | Reads 'Total ≠ subtotal + tax' beside the total of 1,240.00 and the quote 'TOTAL DUE $1,240.00'. | Nothing new is fetched: the evidence came with the task. |
| 3 | Checks the paper invoice, taps Edit and types 1230.00. | Review checks it is a decimal number, saves it, records the change with the old value, and saves a candidate test case. '1 of 3 resolved'. |
| 4 | Taps Accept on the next field, which is right. | The field is marked accepted; its value is unchanged. |
| 5 | Taps 'Not on document' for a tax ID the invoice does not have. | The value is emptied and marked not present. '3 of 3 resolved'. |

**Result:** Every uncertain value has a person's decision, with the history kept.

## Finish the review

**Who:** Someone who has decided every flagged field · **Starts when:** Taps Complete review, now enabled. · **Stories:** `MVP1-E4-03`

| Step | The person | The system |
|---|---|---|
| 1 | Taps Complete review. | The app re-runs the rule checks on the corrected values through the LLM Extraction service. |
| 2 | If every check passes: is taken to the results. | The app completes the task in Review; the values are locked and Review announces that the task is completed. |
| 3 | If a check still fails: sees which one, for example 'Subtotal plus tax doesn't equal the total', with Fix it or 'Values are correct as on the document'. | Nothing is locked yet. |
| 4 | Confirms the values are as printed. | The task is completed with `checks_overridden`, so the record shows the person chose to keep them. |

**Result:** The values are final and ready for the results. Nothing can change them afterwards.

## Review on a computer with the keyboard

**Who:** Someone checking many fields quickly · **Starts when:** Opens the review queue on a desktop. · **Stories:** `MVP1-E4-02`

| Step | The person | The system |
|---|---|---|
| 1 | Presses Enter. | The highlighted field is accepted and the next one is highlighted. |
| 2 | Presses E, types a value and presses Enter. | The field is edited and checked. |
| 3 | Presses ↓ to skip to the next field. | Nothing is changed. |

**Result:** A short invoice is checked in seconds without the mouse. On a phone, every action is a large button instead.

## Approve corrections as test cases

**Who:** The owner (admin) · **Starts when:** Opens the eval candidates list. · **Stories:** `MVP1-E4-04`

| Step | The person | The system |
|---|---|---|
| 1 | Sees each correction: the field, what the system said and what the person changed it to. | Review lists candidates waiting for a decision. |
| 2 | Approves the ones that are real model mistakes and rejects the rest. | Each decision is recorded with who and when. |
| 3 | Exports the approved ones. | Review writes ground-truth files with the corrected values and returns links. The documents themselves are never added automatically. |

**Result:** Real mistakes become test cases, so the next prompt change is measured against them.

## When something goes wrong

| Situation | What the person sees | Error code |
|---|---|---|
| Types a date that does not exist, like 31 February | 'Enter a real date, like 2026-11-30.' The field stays as it was. | `invalid_date` |
| Types letters into an amount | 'Enter a number, like 1230.00.' | `invalid_decimal` |
| Types a currency that is not a real code | 'Enter a 3-letter currency code, like USD.' | `invalid_currency` |
| Tries to complete with fields still to check | Complete review stays disabled; the remaining fields are highlighted. | `fields_unresolved` |
| Edits after the review was completed, for example in a second tab | 'This review is finished, so values can't change.' | `task_completed` |
| Follows a link to someone else's review | 'Not found.' | `task_not_found` |
| Exports a correction that was not approved | 'Approve these first.' with the list. | `candidate_not_approved` |
| Is signed out | Is taken to sign in, then back to the review. | `not_authenticated` |
