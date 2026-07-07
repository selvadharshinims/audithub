import PDFDocument from "pdfkit";
import { CA_WATERMARK_PNG_BASE64 } from "./watermark-data.js";

const WATERMARK_BUFFER = Buffer.from(CA_WATERMARK_PNG_BASE64, "base64");

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export interface InvoicePdfInput {
  invoice: {
    number: string;
    kind: string;
    description: string | null;
    subtotal: number;
    cgst: number | null;
    sgst: number | null;
    igst: number | null;
    tax: number;
    total: number;
    status: string;
    issuedAt: Date;
    dueDate: Date | null;
    notes: string | null;
  };
  client: {
    name: string;
    gstin: string | null;
    pan: string | null;
    address: string | null;
    email: string | null;
    mobile: string | null;
  };
  org: {
    name: string;
    gstin: string | null;
    logo?: string | null;
  };
}

/** Decode a `data:image/...;base64,...` URL to a Buffer, or null if unusable. */
function decodeLogo(logo: string | null | undefined): Buffer | null {
  if (!logo) return null;
  const comma = logo.indexOf(",");
  if (!logo.startsWith("data:image/") || comma === -1) return null;
  try {
    return Buffer.from(logo.slice(comma + 1), "base64");
  } catch {
    return null;
  }
}

/** Kick off a PDF stream. Caller pipes it to the response. */
/** Render the PDF and buffer the output (useful for attachments). */
export function renderInvoicePdfToBuffer(input: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = renderInvoicePdf(input);
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

export function renderInvoicePdf(input: InvoicePdfInput): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 48 });

  const { invoice, client, org } = input;
  const title = titleForKind(invoice.kind);
  const grey = "#666";
  const light = "#e5e7eb";
  const dark = "#111827";

  // Faint CA-emblem watermark, centred behind all content. Drawn first so the
  // invoice text renders on top. Isolated in save()/restore() so the low opacity
  // never leaks into the rest of the document; guarded so a bad asset can never
  // break the PDF (page 1 only — long invoices flowing to page 2 won't repeat).
  try {
    const wmW = 300;
    const wmH = wmW * (WATERMARK_BUFFER.length ? 199 / 300 : 1); // asset aspect ~300x199
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    doc.save();
    doc.opacity(0.06);
    doc.image(WATERMARK_BUFFER, (pageW - wmW) / 2, (pageH - wmH) / 2, { width: wmW });
    doc.opacity(1);
    doc.restore();
  } catch {
    // no watermark rather than a broken invoice
  }

  // Header — optional logo + firm block on the left, doc meta on the right.
  // A bad/unsupported logo buffer must degrade to "no logo", never break the PDF.
  let firmX = 48;
  const logoBuf = decodeLogo(org.logo);
  if (logoBuf) {
    try {
      doc.image(logoBuf, 48, 44, { fit: [46, 46] });
      firmX = 106;
    } catch {
      firmX = 48;
    }
  }

  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text(org.name, firmX, 48, { width: 300 - (firmX - 48) });

  if (org.gstin) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(grey)
      .text(`GSTIN: ${org.gstin}`, firmX, doc.y, { width: 300 - (firmX - 48) });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(dark)
    .text(title.toUpperCase(), 300, 48, { width: 250, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(grey)
    .text(`#${invoice.number}`, 300, 74, { width: 250, align: "right" })
    .text(`Issued: ${formatDate(invoice.issuedAt)}`, { width: 250, align: "right" });

  if (invoice.dueDate) {
    doc.text(`Due: ${formatDate(invoice.dueDate)}`, { width: 250, align: "right" });
  }

  doc
    .moveTo(48, 130)
    .lineTo(547, 130)
    .strokeColor(light)
    .lineWidth(1)
    .stroke();

  // Bill to
  doc
    .fillColor(grey)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("BILL TO", 48, 148);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(dark)
    .text(client.name, 48, 162);

  doc.font("Helvetica").fontSize(9).fillColor(grey);
  const clientLines: string[] = [];
  if (client.gstin) clientLines.push(`GSTIN: ${client.gstin}`);
  if (client.pan) clientLines.push(`PAN: ${client.pan}`);
  if (client.address) clientLines.push(client.address);
  const contactBits = [client.email, client.mobile].filter(Boolean).join(" · ");
  if (contactBits) clientLines.push(contactBits);
  clientLines.forEach((line) => doc.text(line, { width: 400 }));

  // Description / line item
  const tableTop = 260;
  doc.rect(48, tableTop, 499, 24).fill(light);
  doc
    .fillColor(dark)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("DESCRIPTION", 56, tableTop + 8)
    .text("AMOUNT", 400, tableTop + 8, { width: 140, align: "right" });

  const descY = tableTop + 40;
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(dark)
    .text(invoice.description ?? "Professional services", 56, descY, { width: 320 })
    .text(inr.format(invoice.subtotal), 400, descY, { width: 140, align: "right" });

  // Totals block
  const totalsX = 340;
  let ty = descY + 60;
  const row = (label: string, value: string, bold = false) => {
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 12 : 10)
      .fillColor(bold ? dark : grey)
      .text(label, totalsX, ty, { width: 100 })
      .fillColor(dark)
      .text(value, totalsX + 100, ty, { width: 100, align: "right" });
    ty += bold ? 22 : 18;
  };

  row("Subtotal", inr.format(invoice.subtotal));
  if (invoice.cgst) row("CGST", inr.format(invoice.cgst));
  if (invoice.sgst) row("SGST", inr.format(invoice.sgst));
  if (invoice.igst) row("IGST", inr.format(invoice.igst));
  if (invoice.tax > 0) row("Tax total", inr.format(invoice.tax));

  ty += 4;
  doc.moveTo(totalsX, ty).lineTo(totalsX + 200, ty).strokeColor(light).stroke();
  ty += 10;
  row("Total", inr.format(invoice.total), true);

  // Status stamp
  const stampColor = statusColor(invoice.status);
  doc
    .roundedRect(48, ty + 20, 90, 22, 4)
    .fillColor(stampColor.bg)
    .fill();
  doc
    .fillColor(stampColor.fg)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(invoice.status.toUpperCase(), 48, ty + 26, { width: 90, align: "center" });

  // Notes
  if (invoice.notes) {
    const notesY = ty + 80;
    doc
      .fillColor(grey)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("NOTES", 48, notesY)
      .font("Helvetica")
      .fontSize(10)
      .fillColor(dark)
      .text(invoice.notes, 48, notesY + 12, { width: 499 });
  }

  // Footer
  doc
    .fontSize(8)
    .fillColor(grey)
    .text(
      `Generated by AuditHub on ${new Date().toLocaleString("en-IN")}`,
      48,
      780,
      { width: 499, align: "center" },
    );

  doc.end();
  return doc;
}

function titleForKind(kind: string): string {
  return (
    {
      invoice: "Tax Invoice",
      quotation: "Quotation",
      estimate: "Estimate",
      receipt: "Receipt",
    }[kind] ?? "Invoice"
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "paid":
      return { bg: "#d1fae5", fg: "#065f46" };
    case "partial":
      return { bg: "#dbeafe", fg: "#1e40af" };
    case "overdue":
      return { bg: "#fee2e2", fg: "#991b1b" };
    default:
      return { bg: "#fef3c7", fg: "#92400e" };
  }
}
