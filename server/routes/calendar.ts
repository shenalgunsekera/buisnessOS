import { Router } from 'express';
import { prisma } from '../db';

export const calendarRouter = Router();

calendarRouter.get('/', async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(new Date().setMonth(new Date().getMonth() + 2));

  const [payments, subs, contracts, tasks, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { dueDate: { gte: from, lte: to } },
      include: { company: { select: { name: true } } },
    }),
    prisma.subscription.findMany({ where: { expiryDate: { gte: from, lte: to } } }),
    prisma.contract.findMany({ where: { expiryDate: { gte: from, lte: to } } }),
    prisma.task.findMany({ where: { dueDate: { gte: from, lte: to } } }),
    prisma.invoice.findMany({ where: { dueDate: { gte: from, lte: to } } }),
  ]);

  const events = [
    ...payments.map((p) => ({ id: 'pay-' + p.id, kind: 'payment', date: p.dueDate, title: `${p.company.name}${p.service ? ' · ' + p.service : ''}`, status: p.status })),
    ...subs.map((s) => ({ id: 'sub-' + s.id, kind: 'subscription', date: s.expiryDate, title: `${s.provider} renewal`, status: s.status })),
    ...contracts.map((c) => ({ id: 'con-' + c.id, kind: 'contract', date: c.expiryDate as Date, title: `${c.name} expires`, status: c.status })),
    ...tasks.map((t) => ({ id: 'tsk-' + t.id, kind: 'task', date: t.dueDate as Date, title: t.title, status: t.status })),
    ...invoices.map((i) => ({ id: 'inv-' + i.id, kind: 'invoice', date: i.dueDate, title: `${i.number} · ${i.customerName}`, status: i.status })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  res.json({ from, to, events });
});
