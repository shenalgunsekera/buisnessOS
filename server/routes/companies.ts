import { Router } from 'express';
import { prisma } from '../db';
import { CompanyCreateSchema, CompanyUpdateSchema } from '../validators';

export const companiesRouter = Router();

companiesRouter.get('/', async (_req, res) => {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      payments: { select: { amount: true, amountPaid: true, status: true } },
    },
  });

  const enriched = companies.map((c) => {
    const outstanding = c.payments
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => sum + Math.max(0, p.amount - p.amountPaid), 0);
    const paymentCount = c.payments.length;
    const { payments, ...rest } = c;
    return { ...rest, outstanding, paymentCount };
  });

  res.json(enriched);
});

companiesRouter.get('/:id', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { id: req.params.id },
    include: { payments: { orderBy: { dueDate: 'desc' } } },
  });
  if (!company) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(company);
});

companiesRouter.post('/', async (req, res) => {
  const parsed = CompanyCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  const created = await prisma.company.create({ data: parsed.data });
  res.status(201).json(created);
});

companiesRouter.patch('/:id', async (req, res) => {
  const parsed = CompanyUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  try {
    const updated = await prisma.company.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

companiesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});
