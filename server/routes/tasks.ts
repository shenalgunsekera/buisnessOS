import { Router } from 'express';
import { prisma } from '../db';
import { TaskCreateSchema, TaskUpdateSchema } from '../validators';

export const tasksRouter = Router();

tasksRouter.get('/', async (_req, res) => {
  const list = await prisma.task.findMany({ orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] });
  res.json(list);
});

tasksRouter.post('/', async (req, res) => {
  const parsed = TaskCreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { dueDate, ...rest } = parsed.data;
  const created = await prisma.task.create({ data: { ...rest, dueDate: dueDate ? new Date(dueDate) : null } });
  res.status(201).json(created);
});

tasksRouter.patch('/:id', async (req, res) => {
  const parsed = TaskUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  const { dueDate, ...rest } = parsed.data;
  try {
    const data: Record<string, unknown> = { ...rest };
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (rest.status === 'completed') data.completedAt = new Date();
    if (rest.status && rest.status !== 'completed') data.completedAt = null;
    const updated = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

tasksRouter.delete('/:id', async (req, res) => {
  try { await prisma.task.delete({ where: { id: req.params.id } }); res.status(204).end(); }
  catch { res.status(404).json({ error: 'Not found' }); }
});
