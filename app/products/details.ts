import { generatedDetails } from "./details.generated";
import { identity } from "./identity";

// Detailed design content, keyed by the product page it fills. A module with no
// entry here shows what its stories already say and "Coming Soon..." elsewhere.
// Entries come from scripts/site/<key>_design.py through `npm run site:data`;
// every module's data must have the same shape as Identity's.
export type Detail = typeof identity;

export const details: Record<string, Detail | undefined> = generatedDetails;
