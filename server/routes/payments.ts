import { Router } from 'express';
import { prisma } from '../db';
import { PaymentCreateSchema, PaymentUpdateSchema } from '../validators';
import { getRateToLkr } from '../fx';

export const paymentsRouter = Router();

paymentsRouter.get('/', async (req, res) => {
  const { companyId, status } = req.query as { companyId?: string; status?: string };
  const payments = await prisma.payment.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { dueDate: 'desc' },
    include: { company: { select: { id: true, name: true } } },
  });
  res.json(payments);
});

paymentsRouter.get('/:id', async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!payment) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(payment);
});

paymentsRouter.post('/', async (req, res) => {
  const parsed = PaymentCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { dueDate, datePaid, ...rest } = parsed.data;
  try {
    const fxRate = await getRateToLkr(rest.currency);
    const created = await prisma.payment.create({
      data: {
        ...rest,
        fxRate,
        dueDate: new Date(dueDate),
        datePaid: datePaid ? new Date(datePaid) : null,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create payment', detail: String(err) });
  }
});

paymentsRouter.patch('/:id', async (req, res) => {
  const parsed = PaymentUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { dueDate, datePaid, ...rest } = parsed.data;
  try {
    const fx = rest.currency ? { fxRate: await getRateToLkr(rest.currency) } : {};
    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...fx,
        ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
        ...(datePaid !== undefined ? { datePaid: datePaid ? new Date(datePaid) : null } : {}),
      },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

paymentsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

paymentsRouter.post('/:id/duplicate', async (req, res) => {
  const src = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!src) { res.status(404).json({ error: 'Not found' }); return; }
  const created = await prisma.payment.create({
    data: {
      companyId: src.companyId,
      amount: src.amount,
      amountPaid: 0,
      currency: src.currency,
      fxRate: src.fxRate,
      dueDate: new Date(),
      invoiceNumber: null,
      service: src.service,
      method: src.method,
      status: 'pending',
      notes: src.notes,
      recurring: src.recurring,
      recurrenceCycle: src.recurrenceCycle,
    },
  });
  res.status(201).json(created);
});
