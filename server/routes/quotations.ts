import { Router } from 'express';
import { prisma } from '../db';
import { QuotationCreateSchema, QuotationUpdateSchema } from '../validators';
import { nextQuotationNumber, nextInvoiceNumber } from '../numbering';
import { renderDocumentPdf } from '../pdf';
import { getSettings } from '../settings';
import { getRateToLkr } from '../fx';

export const quotationsRouter = Router();

quotationsRouter.get('/', async (req, res) => {
  const isTemplate = req.query.template === 'true';
  const list = await prisma.quotation.findMany({
    where: { isTemplate },
    orderBy: { date: 'desc' },
    include: { items: true, company: { select: { id: true, name: true } } },
  });
  res.json(list);
});

quotationsRouter.get('/:id', async (req, res) => {
  const q = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: {
      items: { orderBy: { position: 'asc' } },
      company: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true } },
    },
  });
  if (!q) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(q);
});

quotationsRouter.post('/', async (req, res) => {
  const parsed = QuotationCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { items, date, validUntil, companyId, isTemplate, ...rest } = parsed.data;
  // Templates use a placeholder number to keep the unique constraint happy, real quotes get a sequence.
  const number = isTemplate ? `TPL-${Date.now()}` : await nextQuotationNumber();
  const fxRate = await getRateToLkr(rest.currency);
  const created = await prisma.quotation.create({
    data: {
      ...rest,
      fxRate,
      number,
      isTemplate,
      companyId: companyId || null,
      date: date ? new Date(date) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      items: { create: items.map((it, i) => ({ ...it, position: it.position ?? i })) },
    },
    include: { items: true },
  });
  res.status(201).json(created);
});

quotationsRouter.patch('/:id', async (req, res) => {
  const parsed = QuotationUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { items, date, validUntil, companyId, ...rest } = parsed.data;
  try {
    const id = req.params.id;
    const fx = rest.currency ? { fxRate: await getRateToLkr(rest.currency) } : {};
    await prisma.$transaction(async (tx) => {
      await tx.quotation.update({
        where: { id },
        data: {
          ...rest,
          ...fx,
          ...(companyId !== undefined ? { companyId: companyId || null } : {}),
          ...(date !== undefined ? { date: new Date(date) } : {}),
          ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
        },
      });
      if (items !== undefined) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        if (items.length > 0) {
          await tx.quotationItem.createMany({
            data: items.map((it, i) => ({ ...it, position: it.position ?? i, quotationId: id })),
          });
        }
      }
    });
    const fresh = await prisma.quotation.findUnique({ where: { id }, include: { items: { orderBy: { position: 'asc' } } } });
    res.json(fresh);
  } catch (err) {
    res.status(404).json({ error: 'Not found', detail: String(err) });
  }
});

quotationsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

quotationsRouter.post('/:id/duplicate', async (req, res) => {
  const src = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!src) { res.status(404).json({ error: 'Not found' }); return; }
  const asTemplate = req.body?.asTemplate === true;
  const number = asTemplate ? `TPL-${Date.now()}` : await nextQuotationNumber();
  const created = await prisma.quotation.create({
    data: {
      number,
      date: new Date(),
      validUntil: src.validUntil,
      companyId: src.companyId,
      customerName: src.customerName,
      customerEmail: src.customerEmail,
      customerAddress: src.customerAddress,
      notes: src.notes,
      currency: src.currency,
      fxRate: src.fxRate,
      discountPercent: src.discountPercent,
      taxPercent: src.taxPercent,
      status: 'draft',
      isTemplate: asTemplate,
      templateName: asTemplate ? src.templateName ?? src.customerName : null,
      items: { create: src.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, position: it.position })) },
    },
    include: { items: true },
  });
  res.status(201).json(created);
});

quotationsRouter.post('/:id/use-template', async (req, res) => {
  const src = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!src || !src.isTemplate) { res.status(404).json({ error: 'Template not found' }); return; }
  const number = await nextQuotationNumber();
  const created = await prisma.quotation.create({
    data: {
      number,
      date: new Date(),
      companyId: null,
      customerName: src.customerName,
      customerEmail: src.customerEmail,
      customerAddress: src.customerAddress,
      notes: src.notes,
      currency: src.currency,
      fxRate: src.fxRate,
      discountPercent: src.discountPercent,
      taxPercent: src.taxPercent,
      status: 'draft',
      isTemplate: false,
      items: { create: src.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, position: it.position })) },
    },
  });
  res.status(201).json(created);
});

quotationsRouter.post('/:id/convert', async (req, res) => {
  const q = await prisma.quotation.findUnique({
    where: { id: req.params.id },
    include: { items: { orderBy: { position: 'asc' } }, invoice: true },
  });
  if (!q) { res.status(404).json({ error: 'Not found' }); return; }
  if (q.isTemplate) { res.status(400).json({ error: 'Cannot convert a template' }); return; }
  if (q.invoice) { res.status(400).json({ error: 'Already converted', invoiceId: q.invoice.id }); return; }
  const number = await nextInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const invoice = await prisma.invoice.create({
    data: {
      number,
      date: new Date(),
      dueDate,
      companyId: q.companyId,
      customerName: q.customerName,
      customerEmail: q.customerEmail,
      customerAddress: q.customerAddress,
      notes: q.notes,
      currency: q.currency,
      fxRate: q.fxRate,
      discountPercent: q.discountPercent,
      taxPercent: q.taxPercent,
      status: 'pending',
      quotationId: q.id,
      items: { create: q.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, position: it.position })) },
    },
    include: { items: true },
  });
  await prisma.quotation.update({ where: { id: q.id }, data: { status: 'converted' } });
  res.status(201).json(invoice);
});

quotationsRouter.get('/:id/pdf', async (req, res) => {
  const q = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { position: 'asc' } } } });
  if (!q) { res.status(404).json({ error: 'Not found' }); return; }
  const settings = await getSettings();
  try {
    const buf = await renderDocumentPdf({
      kind: 'Quotation',
      number: q.number,
      date: q.date,
      dueOrValidUntil: q.validUntil,
      customerName: q.customerName,
      customerEmail: q.customerEmail,
      customerAddress: q.customerAddress,
      items: q.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      discountPercent: q.discountPercent,
      taxPercent: q.taxPercent,
      notes: q.notes,
      businessName: settings.businessName,
      businessEmail: settings.businessEmail ?? undefined,
      businessPhone: settings.businessPhone ?? undefined,
      businessAddress: settings.businessAddress ?? undefined,
      currency: q.currency,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${q.number}.pdf"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'PDF generation failed', detail: String(err) });
  }
});
