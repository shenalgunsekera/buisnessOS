import PDFDocument from 'pdfkit';
import { computeTotals, type LineItem } from './totals';

export type PdfDocData = {
  kind: 'Quotation' | 'Invoice';
  number: string;
  date: Date;
  dueOrValidUntil?: Date | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  items: LineItem[];
  discountPercent: number;
  taxPercent: number;
  amountPaid?: number;
  notes?: string | null;
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  currency: string;
};

// ---------------------------------------------------------------------------
// Your fixed details — these are auto-printed on every invoice / quotation.
// Edit these to update the bank account & issuer block in the template.
// ---------------------------------------------------------------------------
const PAYMENT_INFO = {
  title: 'Payment Information',
  lines: [
    'Name -  SHENAL AROSH DESILVA',
    'Bank name - commercial bank of ceylon',
    'ACC NO -  8024409205',
    'Branch - Kaduwela',
  ],
};

const ISSUER = {
  name: 'Shenal Gunasekera',
  lines: [
    '25/2, Weraluwila Rd, Hewagama, Kaduwela',
    '074 336 4614',
    'shenalgd@gmail.com',
  ],
};

function fmtMoney(n: number, currency: string) {
  const num = n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${num} ${currency}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function renderDocumentPdf(data: PdfDocData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const PAD = 46;

    const ink = '#1a1a1a';      // primary text
    const muted = '#5c5c57';     // secondary text
    const line = '#cdcabc';      // hairline rules
    const bg = '#f4f2e7';        // cream background

    // ---- Background + thin outer frame ----
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(bg);
    doc.roundedRect(13, 13, PAGE_W - 26, PAGE_H - 26, 6).lineWidth(1).strokeColor('#2c2c2c').stroke();

    const RIGHT = PAGE_W - PAD; // right content edge

    // ---- Title + meta ----
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(58)
      .text(data.kind, PAD, 58);

    doc.font('Helvetica').fontSize(9.5).fillColor(ink)
      .text(fmtDate(data.date), RIGHT - 200, 92, { width: 200, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink)
      .text(`${data.kind} No. ${data.number}`, RIGHT - 200, 107, { width: 200, align: 'right' });

    // ---- Billed to ----
    const BILL_Y = 168;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text('Billed to:', PAD, BILL_Y);
    let by = BILL_Y + 15;
    doc.font('Helvetica').fontSize(9).fillColor(muted);
    const billLines = [data.customerName, data.customerAddress, data.customerEmail].filter(Boolean) as string[];
    for (const l of billLines) {
      doc.text(l, PAD, by, { width: 280 });
      by += 12;
    }

    // ---- Items table ----
    const TABLE_Y = Math.max(348, by + 40);

    // column geometry (numeric columns are right-aligned to their right edge)
    const COL = {
      desc: { x: PAD, w: 250 },
      rate: { x: 300, w: 78 },
      amount: { x: 384, w: 72 },
      total: { x: RIGHT - 96, w: 96 },
    };

    const rule = (y: number, x1 = PAD, x2 = RIGHT) =>
      doc.moveTo(x1, y).lineTo(x2, y).lineWidth(1).strokeColor(line).stroke();

    rule(TABLE_Y - 8);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink);
    doc.text('Description', COL.desc.x, TABLE_Y);
    doc.text('Rate', COL.rate.x, TABLE_Y, { width: COL.rate.w, align: 'right' });
    doc.text('Amount', COL.amount.x, TABLE_Y, { width: COL.amount.w, align: 'right' });
    doc.text(data.currency, COL.total.x, TABLE_Y, { width: COL.total.w, align: 'right' });
    rule(TABLE_Y + 16);

    let rowY = TABLE_Y + 28;
    doc.font('Helvetica').fontSize(9.5).fillColor(ink);
    for (const it of data.items) {
      const qty = it.quantity ?? 0;
      const unit = it.unitPrice ?? 0;
      const descH = doc.heightOfString(it.description || '—', { width: COL.desc.w });
      const rowH = Math.max(22, descH + 10);
      doc.font('Helvetica').fontSize(9.5).fillColor(ink);
      doc.text(it.description || '—', COL.desc.x, rowY, { width: COL.desc.w });
      doc.text(fmtMoney(unit, data.currency), COL.rate.x, rowY, { width: COL.rate.w, align: 'right' });
      doc.text(String(qty), COL.amount.x, rowY, { width: COL.amount.w, align: 'right' });
      doc.text(fmtMoney(qty * unit, data.currency), COL.total.x, rowY, { width: COL.total.w, align: 'right' });
      rowY += rowH;
    }

    // ---- Totals (right aligned, ruled rows) ----
    const totals = computeTotals(data.items, data.discountPercent, data.taxPercent);
    const LABEL = { x: COL.rate.x, w: COL.amount.x + COL.amount.w - COL.rate.x };
    const VALUE = COL.total;
    let ty = rowY + 34;

    const totalRow = (label: string, value: string, bold = false) => {
      const f = bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink)
        .text(label, LABEL.x, ty, { width: LABEL.w, align: 'right' });
      doc.font(f).fontSize(9.5).fillColor(ink)
        .text(value, VALUE.x, ty, { width: VALUE.w, align: 'right' });
      ty += 16;
      rule(ty, COL.rate.x, RIGHT);
      ty += 12;
    };

    totalRow('Subtotal', fmtMoney(totals.subtotal, data.currency));
    if (data.discountPercent > 0) {
      totalRow(`Discount (${data.discountPercent}%)`, '- ' + fmtMoney(totals.discountAmount, data.currency));
    }
    totalRow(`Tax (${data.taxPercent}%)`, fmtMoney(totals.taxAmount, data.currency));
    totalRow('Total', fmtMoney(totals.total, data.currency), true);

    if (data.kind === 'Invoice' && typeof data.amountPaid === 'number' && data.amountPaid > 0) {
      totalRow('Paid', '- ' + fmtMoney(data.amountPaid, data.currency));
      totalRow('Balance Due', fmtMoney(Math.max(0, totals.total - data.amountPaid), data.currency), true);
    }

    // ---- Optional notes (left side, below items) ----
    if (data.notes) {
      const ny = rowY + 34;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(muted).text('Notes', PAD, ny);
      doc.font('Helvetica').fontSize(9).fillColor(ink).text(data.notes, PAD, ny + 13, { width: 250 });
    }

    // ---- Footer: payment information + issuer ----
    const FOOT_Y = 700;
    rule(FOOT_Y - 18);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(PAYMENT_INFO.title, PAD, FOOT_Y);
    let py = FOOT_Y + 16;
    doc.font('Helvetica').fontSize(9).fillColor(ink);
    for (const l of PAYMENT_INFO.lines) {
      doc.text(l, PAD, py, { width: 260 });
      py += 13;
    }

    const ISSUER_X = 320;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(ISSUER.name, ISSUER_X, FOOT_Y, { width: RIGHT - ISSUER_X });
    let iy = FOOT_Y + 16;
    doc.font('Helvetica').fontSize(9).fillColor(ink);
    for (const l of ISSUER.lines) {
      doc.text(l, ISSUER_X, iy, { width: RIGHT - ISSUER_X });
      iy += 13;
    }

    doc.end();
  });
}
