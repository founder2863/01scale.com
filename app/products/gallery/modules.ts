// The modules whose UI Components section has a live gallery (MVP1-E0-19 AC5). Kept apart from
// gallery.tsx, a client module, so the server-rendered page can read it.
export const GALLERY_MODULES = [
  "login-using-aws",
  "document-upload",
  "extraction-with-claude",
  "human-review",
  "json-and-csv-output",
  "payment",
  "download-and-email-delivery",
  // Designed, not built yet (account and admin screens come later; Nikhil, 22 Nov 2026).
  "account-management",
] as const;

export const hasGallery = (module: string) => (GALLERY_MODULES as readonly string[]).includes(module);
