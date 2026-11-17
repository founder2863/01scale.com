---
name: publish-product-page
description: Publish a 01scale module's design to its product page on the site and regenerate its documents, then check the page on every screen size. Use after a module's design file changes, when a story in docs/epics changes, when asked to "update the product page" or "publish the design", or as step 7 of design-module.
---

# Publish a product page

Assembly only. This skill adds no design content; it moves what exists onto the site and proves the page works.

## How the site gets its content

| Source | Command | Generated |
|---|---|---|
| Stories in `docs/epics/*.md` | `npm run site:data` | `app/products/data.ts`: every module's requirements, endpoint list and data notes |
| `scripts/site/<key>_design.py` | `npm run site:data` | `docs/services/<service>/*.md`, `app/products/<key>.ts` and the registry `app/products/details.generated.ts` |

Never edit a generated file by hand. Change the source and run the command.

## Steps

1. Run `npm run site:data`. It must finish without errors.
2. For a module being published for the first time, nothing needs registering: the build script finds every `*_design.py` file. Check that:
   - its `MODULE["slug"]` matches the module's slug in `MODULES` in `scripts/site/build_products.py`;
   - it belongs to a step in `app/products/flow.tsx`;
   - `COMPLETE` is `True` only when all six documents are written. Until then the page shows "In design".
3. Run `npm run build`. It must pass.
4. Run `git diff --stat`. Only the files you expect should have changed. An unexpected change to a generated file means a source changed without regenerating.
5. Check the page in a browser at 320, 390, 768, 1024, 1440 and 1920 pixels wide:
   - no sideways scrolling of the page, with every collapsible section open;
   - the header on one or two lines as designed;
   - all seven tabs open and show content or "Coming Soon...";
   - the flow shows this module's step highlighted and the rest greyed out.
6. Check light and dark mode on at least the phone and desktop widths.

## Rules that are easy to get wrong

- A section with no finalized design shows "Coming Soon..." and says what will appear. Do not fill it.
- If an endpoint list changed, update `app/apis/endpoints.ts` too.
- Report what was actually checked. If a width, a browser or dark mode was not checked, say so in the pull request.

## Output

The regenerated files and a "How to test" section in the pull request listing the widths and modes checked.
