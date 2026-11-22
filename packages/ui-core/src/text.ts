/** A plain-language message for a failed request (problem+json, API-DESIGN.md); never a stack trace. */
export function problemMessage(error: unknown): string {
  if (error && typeof error === "object" && "problem" in error) {
    const problem = (error as { problem: { detail?: string; code?: string } }).problem;
    if (problem.code === "dependency_unavailable" || !problem.detail) return "Something went wrong. Try again in a moment.";
    return problem.detail;
  }
  return "Something went wrong. Try again in a moment.";
}

/** A label from a field name: "vendor_tax_id" → "Vendor tax ID"; a line item adds "Line 2 · ". */
export function labelFromName(name: string, lineIndex: number | null = null): string {
  const label = name
    .split("_")
    .map((word) => (word === "id" ? "ID" : word))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
  return lineIndex === null ? label : `Line ${lineIndex + 1} · ${label.toLowerCase().replace(/\bid\b/, "ID")}`;
}
