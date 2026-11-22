// The sample invoice of the DocFlow prototype. Synthetic: a made-up company, example.com
// addresses and invented numbers (Nikhil's privacy rule; DESIGN-RULES rule 10).
//
// SAMPLE_FIELDS is what the mocked Extraction service "reads" from it, with three fields flagged
// for a person, each for a different reason the journey needs to show:
//   - invoice_date: an ambiguous date (02/11/2026), read the wrong way round;
//   - line 2 amount: a smudged digit, so the lines no longer add up to the subtotal (a rule fails);
//   - vendor_tax_id: not on the document at all.

export type InvoiceFieldName =
  | "vendor_name"
  | "vendor_address"
  | "vendor_tax_id"
  | "invoice_number"
  | "invoice_date"
  | "due_date"
  | "bill_to_name"
  | "bill_to_address"
  | "currency"
  | "subtotal"
  | "tax_total"
  | "total"
  | "payment_terms"
  | "description"
  | "quantity"
  | "unit_price"
  | "amount";

type SampleField = {
  name: InvoiceFieldName;
  line_index: number | null;
  value: string | null;
  confidence: number;
  model_confidence?: number;
  source_page: number | null;
  source_quote: string | null;
  flagged: boolean;
  flag_reasons: string[];
};

const f = (
  name: InvoiceFieldName,
  value: string | null,
  confidence: number,
  quote: string | null,
  line_index: number | null = null,
  flag_reasons: string[] = [],
): SampleField => ({
  name,
  line_index,
  value,
  confidence,
  source_page: quote ? 1 : null,
  source_quote: quote,
  flagged: flag_reasons.length > 0,
  flag_reasons,
});

export const SAMPLE_FIELDS: SampleField[] = [
  f("vendor_name", "Northwind Paper Co.", 0.97, "Northwind Paper Co."),
  f("vendor_address", "12 Mill Lane, Springfield, 01234", 0.93, "12 Mill Lane, Springfield, 01234"),
  f("vendor_tax_id", null, 0.41, null, null, ["Not found on the document.", "The schema expects a tax ID for most suppliers."]),
  f("invoice_number", "NW-2026-0187", 0.98, "Invoice NW-2026-0187"),
  f("invoice_date", "2026-02-11", 0.58, "Date: 02/11/2026", null, [
    "The date could be read as 2 November or 11 February.",
    "Confidence is below 0.6.",
  ]),
  f("due_date", "2026-12-02", 0.9, "Due: 02/12/2026"),
  f("bill_to_name", "Example Trading Ltd", 0.95, "Example Trading Ltd"),
  f("bill_to_address", "1 Sample Street, Exampletown", 0.92, "1 Sample Street, Exampletown"),
  f("currency", "USD", 0.96, "All amounts in USD"),
  f("subtotal", "1150.00", 0.94, "Subtotal 1,150.00"),
  f("tax_total", "92.00", 0.91, "Tax (8%) 92.00"),
  f("total", "1242.00", 0.96, "Total due 1,242.00"),
  f("payment_terms", "Net 30", 0.88, "Terms: Net 30"),
  f("description", "A4 copy paper, 80 gsm, box of 5 reams", 0.95, "A4 copy paper, 80 gsm, box of 5 reams", 0),
  f("quantity", "20", 0.97, "20", 0),
  f("unit_price", "38.50", 0.95, "38.50", 0),
  f("amount", "770.00", 0.96, "770.00", 0),
  f("description", "Toner cartridge, black", 0.94, "Toner cartridge, black", 1),
  f("quantity", "4", 0.96, "4", 1),
  f("unit_price", "95.00", 0.93, "95.00", 1),
  f("amount", "350.00", 0.66, "3?0.00", 1, [
    "One digit is smudged on the scan.",
    "Line amounts add up to 1120.00, not the subtotal 1150.00.",
  ]),
];

export const SAMPLE_FILE_NAME = "sample-invoice-northwind.pdf";
export const SAMPLE_FILE_SIZE = 48_213;
/** The sample invoice drawn as a page, so the prototype has a document to look at. */
export function SampleInvoice({ highlight }: { highlight?: string | null }) {
  const mark = (quote: string, text: string = quote) =>
    highlight && highlight === quote ? <mark className="df-mark">{text}</mark> : text;
  return (
    <figure className="df-invoice" aria-label="Sample invoice from Northwind Paper Co. (synthetic)">
      <div className="df-invoice-top">
        <div>
          <strong>{mark("Northwind Paper Co.")}</strong>
          <br />
          {mark("12 Mill Lane, Springfield, 01234")}
          <br />
          billing@example.com
        </div>
        <div className="df-invoice-meta">
          <strong className="df-invoice-word">INVOICE</strong>
          <br />
          {mark("Invoice NW-2026-0187")}
          <br />
          {mark("Date: 02/11/2026")}
          <br />
          {mark("Due: 02/12/2026")}
        </div>
      </div>
      <div className="df-invoice-to">
        <span className="df-invoice-label">Bill to</span>
        <br />
        {mark("Example Trading Ltd")}
        <br />
        {mark("1 Sample Street, Exampletown")}
      </div>
      <table className="df-invoice-lines">
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{mark("A4 copy paper, 80 gsm, box of 5 reams")}</td>
            <td>20</td>
            <td>38.50</td>
            <td>770.00</td>
          </tr>
          <tr>
            <td>{mark("Toner cartridge, black")}</td>
            <td>4</td>
            <td>95.00</td>
            <td>
              {highlight === "3?0.00" ? <mark className="df-mark df-smudge">380.00</mark> : <span className="df-smudge">380.00</span>}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="df-invoice-totals">
        <span>{mark("Subtotal 1,150.00")}</span>
        <span>{mark("Tax (8%) 92.00")}</span>
        <strong>{mark("Total due 1,242.00")}</strong>
        <span>{mark("All amounts in USD")}</span>
        <span>{mark("Terms: Net 30")}</span>
      </div>
      <figcaption className="df-invoice-caption">Synthetic sample · page 1 of 1</figcaption>
    </figure>
  );
}
