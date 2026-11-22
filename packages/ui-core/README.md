# @01scale/ui-core

The 01scale design system (story `MVP1-E0-19`): design tokens and accessible base components that every service's UI package (`packages/ui-<service>`) builds on, so the platform looks like one product while each service ships on its own.

## Use

```tsx
import "@01scale/ui-core/tokens.css"; // colours, type, spacing, radius, shadows; light and dark
import "@01scale/ui-core/styles.css"; // the base components' styles ("ui-" classes)
import { Button, Input, Badge, ToastProvider } from "@01scale/ui-core";
```

Inside this repository it is an npm workspace; Next.js compiles its TypeScript source (`transpilePackages` in `next.config.ts`).

## What is in it

| Kind | Items |
|---|---|
| Tokens | `--brand` `#0b00bf`, surfaces, text, borders, focus, status colours (success, warning, danger, info), type scale, 4-pixel spacing, radius, shadows, motion. Dark theme follows the system, or `data-theme="dark"` on `<html>`. |
| Actions | `Button` (primary, secondary, ghost, danger; `loading`; at least 44 pixels tall) |
| Forms | `Input`, `Select`, `Checkbox`, `FieldError`: every control labelled, hints and errors linked by `aria-describedby` |
| Display | `Card`, `Badge` (never colour alone), `Alert`, `ProgressBar`, `Skeleton`, `Spinner` |
| Overlays and navigation | `Dialog` (native `<dialog>`: focus trap, Escape), `Tabs` (arrow keys, Home, End), `ToastProvider` and `useToast()` (a polite live region) |

## Rules

- No business logic and no calls to any service (AC3).
- Services build on it and never restyle its components (AC6, `docs/process/DESIGN-RULES.md` rule 12). If something is missing, add it here and bump the version.
- Every component is keyboard reachable, has visible focus and labelled controls, meets WCAG AA contrast, and works at 320 pixels wide in both themes (AC2).

First used by the DocFlow V1 clickable prototype, `app/products/docflow/try`.
