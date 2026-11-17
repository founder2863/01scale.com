import { identity } from "./identity";

// Detailed design content, keyed by the product page it fills. A module with no
// entry here shows what its stories already say and "Coming Soon..." elsewhere.
// To add one: write its design file in scripts/site/, generate its data file
// with `npm run site:data`, and register it below.
export type Detail = typeof identity;

export const details: Record<string, Detail | undefined> = {
  [identity.slug]: identity,
};
