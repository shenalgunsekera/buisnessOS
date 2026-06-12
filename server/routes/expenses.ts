import { Router } from 'express';
import { prisma } from '../db';
import { ExpenseCreateSchema, ExpenseUpdateSchema } from '../validators';
import { getRateToLkr } from '../fx';

export const expensesRouter = Router();

expensesRouter.get('/', async (_req, res) => {
  const list = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
  res.json(list);
});

expensesRouter.post('/', async (req, res) => {
  const parsed = ExpenseCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { date, ...rest } = parsed.data;
  const fxRate = await getRateToLkr(rest.currency);
  const created = await prisma.expense.create({ data: { ...rest, fxRate, date: date ? new Date(date) : new Date() } });
  res.status(201).json(created);
});

expensesRouter.patch('/:id', async (req, res) => {
  const parsed = ExpenseUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { date, ...rest } = parsed.data;
  try {
    const fx = rest.currency ? { fxRate: await getRateToLkr(rest.currency) } : {};
    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: { ...rest, ...fx, ...(date !== undefined ? { date: new Date(date) } : {}) },
    });
    res.json(updated);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

expensesRouter.delete('/:id', async (req, res) => {
  try { await prisma.expense.delete({ where: { id: req.params.id } }); res.status(204).end(); }
  catch { res.status(404).json({ error: 'Not found' }); }
});
