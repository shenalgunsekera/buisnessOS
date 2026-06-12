import { Router } from 'express';
import { prisma } from '../db';
import { ContractCreateSchema, ContractUpdateSchema } from '../validators';

export const contractsRouter = Router();

contractsRouter.get('/', async (_req, res) => {
  const list = await prisma.contract.findMany({ orderBy: { expiryDate: 'asc' } });
  res.json(list);
});

contractsRouter.post('/', async (req, res) => {
  const parsed = ContractCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { startDate, expiryDate, renewalDate, ...rest } = parsed.data;
  const created = await prisma.contract.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      renewalDate: renewalDate ? new Date(renewalDate) : null,
    },
  });
  res.status(201).json(created);
});

contractsRouter.patch('/:id', async (req, res) => {
  const parsed = ContractUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { startDate, expiryDate, renewalDate, ...rest } = parsed.data;
  try {
    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
        ...(renewalDate !== undefined ? { renewalDate: renewalDate ? new Date(renewalDate) : null } : {}),
      },
    });
    res.json(updated);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

contractsRouter.delete('/:id', async (req, res) => {
  try { await prisma.contract.delete({ where: { id: req.params.id } }); res.status(204).end(); }
  catch { res.status(404).json({ error: 'Not found' }); }
});
