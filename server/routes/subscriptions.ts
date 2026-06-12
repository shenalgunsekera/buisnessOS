import { Router } from 'express';
import { prisma } from '../db';
import { SubscriptionCreateSchema, SubscriptionUpdateSchema } from '../validators';
import { getRateToLkr } from '../fx';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/', async (_req, res) => {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { expiryDate: 'asc' },
  });
  res.json(subscriptions);
});

subscriptionsRouter.get('/:id', async (req, res) => {
  const s = await prisma.subscription.findUnique({ where: { id: req.params.id } });
  if (!s) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(s);
});

subscriptionsRouter.post('/', async (req, res) => {
  const parsed = SubscriptionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  const { purchaseDate, expiryDate, ...rest } = parsed.data;
  try {
    const fxRate = await getRateToLkr(rest.currency);
    const created = await prisma.subscription.create({
      data: {
        ...rest,
        fxRate,
        expiryDate: new Date(expiryDate),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create subscription', detail: String(err) });
  }
});

subscriptionsRouter.patch('/:id', async (req, res) => {
  const parsed = SubscriptionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues });
    return;
  }
  const { purchaseDate, expiryDate, ...rest } = parsed.data;
  try {
    const fx = rest.currency ? { fxRate: await getRateToLkr(rest.currency) } : {};
    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...fx,
        ...(expiryDate !== undefined ? { expiryDate: new Date(expiryDate) } : {}),
        ...(purchaseDate !== undefined
          ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }
          : {}),
      },
    });
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

subscriptionsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.subscription.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});
