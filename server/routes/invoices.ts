import { Router } from 'express';
import { prisma } from '../db';
import { InvoiceCreateSchema, InvoiceUpdateSchema } from '../validators';
import { nextInvoiceNumber } from '../numbering';
import { renderDocumentPdf } from '../pdf';
import { getSettings } from '../settings';
import { getRateToLkr } from '../fx';

export const invoicesRouter = Router();

invoicesRouter.get('/', async (_req, res) => {
  const list = await prisma.invoice.findMany({
    orderBy: { date: 'desc' },
    include: { items: true, company: { select: { id: true, name: true } } },
  });
  res.json(list);
});

invoicesRouter.get('/:id', async (req, res) => {
  const inv = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      items: { orderBy: { position: 'asc' } },
      company: { select: { id: true, name: true } },
      quotation: { select: { id: true, number: true } },
    },
  });
  if (!inv) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(inv);
});

invoicesRouter.post('/', async (req, res) => {
  const parsed = InvoiceCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { items, date, dueDate, companyId, ...rest } = parsed.data;
  const number = await nextInvoiceNumber();
  const fxRate = await getRateToLkr(rest.currency);
  const created = await prisma.invoice.create({
    data: {
      ...rest,
      fxRate,
      number,
      companyId: companyId || null,
      date: date ? new Date(date) : new Date(),
      dueDate: new Date(dueDate),
      items: { create: items.map((it, i) => ({ ...it, position: it.position ?? i })) },
    },
    include: { items: true },
  });
  res.status(201).json(created);
});

invoicesRouter.patch('/:id', async (req, res) => {
  const parsed = InvoiceUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { items, date, dueDate, companyId, ...rest } = parsed.data;
  try {
    const id = req.params.id;
    const fx = rest.currency ? { fxRate: await getRateToLkr(rest.currency) } : {};
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          ...rest,
          ...fx,
          ...(companyId !== undefined ? { companyId: companyId || null } : {}),
          ...(date !== undefined ? { date: new Date(date) } : {}),
          ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        },
      });
      if (items !== undefined) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        if (items.length > 0) {
          await tx.invoiceItem.createMany({
            data: items.map((it, i) => ({ ...it, position: it.position ?? i, invoiceId: id })),
          });
        }
      }
    });
    const fresh = await prisma.invoice.findUnique({ where: { id }, include: { items: { orderBy: { position: 'asc' } } } });
    res.json(fresh);
  } catch (err) {
    res.status(404).json({ error: 'Not found', detail: String(err) });
  }
});

invoicesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

invoicesRouter.post('/:id/duplicate', async (req, res) => {
  const src = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!src) { res.status(404).json({ error: 'Not found' }); return; }
  const number = await nextInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const created = await prisma.invoice.create({
    data: {
      number,
      date: new Date(),
      dueDate,
      companyId: src.companyId,
      customerName: src.customerName,
      customerEmail: src.customerEmail,
      customerAddress: src.customerAddress,
      notes: src.notes,
      currency: src.currency,
      fxRate: src.fxRate,
      discountPercent: src.discountPercent,
      taxPercent: src.taxPercent,
      status: 'pending',
      amountPaid: 0,
      items: { create: src.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, position: it.position })) },
    },
    include: { items: true },
  });
  res.status(201).json(created);
});

invoicesRouter.get('/:id/pdf', async (req, res) => {
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { position: 'asc' } } } });
  if (!inv) { res.status(404).json({ error: 'Not found' }); return; }
  const settings = await getSettings();
  try {
    const buf = await renderDocumentPdf({
      kind: 'Invoice',
      number: inv.number,
      date: inv.date,
      dueOrValidUntil: inv.dueDate,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      customerAddress: inv.customerAddress,
      items: inv.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      discountPercent: inv.discountPercent,
      taxPercent: inv.taxPercent,
      amountPaid: inv.amountPaid,
      notes: inv.notes,
      businessName: settings.businessName,
      businessEmail: settings.businessEmail ?? undefined,
      businessPhone: settings.businessPhone ?? undefined,
      businessAddress: settings.businessAddress ?? undefined,
      currency: inv.currency,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', detail: String(err) });
  }
});
