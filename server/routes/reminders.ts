import { Router } from 'express';
import { prisma } from '../db';
import { runDailyCheck } from '../scheduler';
import { emailEnabled } from '../email';

export const remindersRouter = Router();

remindersRouter.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const reminders = await prisma.reminder.findMany({
    orderBy: { sentAt: 'desc' },
    take: limit,
    include: {
      payment: { include: { company: { select: { id: true, name: true } } } },
      subscription: { select: { id: true, provider: true } },
    },
  });
  res.json(reminders);
});

remindersRouter.get('/status', async (_req, res) => {
  res.json({ emailEnabled: await emailEnabled() });
});

remindersRouter.post('/run-now', async (_req, res) => {
  try {
    const report = await runDailyCheck();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Daily check failed', detail: String(err) });
  }
});
