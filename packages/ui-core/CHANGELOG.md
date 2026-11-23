# @01scale/ui-core changelog

## 0.1.2 — 23 Nov 2026 (MVP1-E0-52)

- Themes: `data-theme="light"` or `data-theme="dark"` now works on any element, not only `<html>`, so one part of a page can show the other theme. Forcing dark now also sets the focus, overlay, status and shadow colours, as the system dark theme does.

## 0.1.1 — 22 Nov 2026

- Tabs: a wide panel (such as a table) now scrolls inside itself instead of widening the page; the focus ring is no longer clipped. Stacks keep wide children inside them, and keep their rows at natural height when stretched beside a taller column (a lone button no longer grows to fill it).

## 0.1.0 — 22 Nov 2026 (MVP1-E0-19)

- Design tokens: brand, surface, text and status colours for light and dark themes; type, spacing, radius, shadow and motion.
- Helpers for service UI packages: `createClientContext` (each package reaches its own API through a client the app supplies), `problemMessage` and `labelFromName`.
- Base components: Button, Input, Select, Checkbox, Card, Badge, Dialog, Tabs, Toast, FieldError, plus Alert, ProgressBar, Skeleton and Spinner.
