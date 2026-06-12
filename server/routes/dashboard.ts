import { Router } from 'express';
import { prisma } from '../db';

export const dashboardRouter = Router();

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, days: number) { const r = new Date(d); r.setDate(r.getDate() + days); return r; }

dashboardRouter.get('/stats', async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const today = startOfDay(now);
    const in30 = addDays(today, 30);

    const [totalCompanies, payments, subscriptions, quotations, expenses, tasks] = await Promise.all([
      prisma.company.count(),
      prisma.payment.findMany({ select: { amount: true, amountPaid: true, fxRate: true, status: true, dueDate: true, datePaid: true } }),
      prisma.subscription.findMany({ select: { status: true, expiryDate: true } }),
      prisma.quotation.findMany({ where: { isTemplate: false }, select: { status: true } }),
      prisma.expense.findMany({ where: { date: { gte: monthStart } }, select: { amount: true, fxRate: true } }),
      prisma.task.findMany({ where: { status: { in: ['pending', 'in_progress'] } }, select: { id: true } }),
    ]);

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let pendingPayments = 0;
    let overduePayments = 0;
    for (const p of payments) {
      if (p.status === 'cancelled') continue;
      const paidLkr = p.amountPaid * p.fxRate;
      totalRevenue += paidLkr;
      if (p.datePaid && p.datePaid >= monthStart) monthlyRevenue += paidLkr;
      const remaining = p.amount - p.amountPaid;
      if (remaining > 0) {
        if (p.dueDate < now) overduePayments += 1;
        else pendingPayments += 1;
      }
    }

    let activeSubscriptions = 0;
    let expiringSubscriptions = 0;
    for (const s of subscriptions) {
      if (s.status !== 'active') continue;
      activeSubscriptions += 1;
      if (s.expiryDate <= in30) expiringSubscriptions += 1;
    }

    const pendingQuotations = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;
    const monthlyExpenses = expenses.reduce((s, e) => s + e.amount * e.fxRate, 0);
    const profit = totalRevenue - monthlyExpenses;
    const pendingTasks = tasks.length;

    res.json({
      totalCompanies, totalRevenue, monthlyRevenue, monthlyExpenses, profit,
      activeSubscriptions, expiringSubscriptions,
      pendingPayments, overduePayments,
      pendingQuotations, pendingTasks,
    });
  } catch (err) {
    console.error('[stats] error', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

dashboardRouter.get('/alerts', async (_req, res) => {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const in14 = addDays(today, 14);

    const [upcomingPayments, upcomingSubscriptions, upcomingInvoices, recentReminders] = await Promise.all([
      prisma.payment.findMany({
        where: { status: { notIn: ['paid', 'cancelled'] }, dueDate: { lte: in14 } },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: { company: { select: { id: true, name: true } } },
      }),
      prisma.subscription.findMany({ where: { status: 'active', expiryDate: { lte: in14 } }, orderBy: { expiryDate: 'asc' }, take: 10 }),
      prisma.invoice.findMany({
        where: { status: { notIn: ['paid', 'cancelled'] }, dueDate: { lte: in14 } },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: { items: true },
      }),
      prisma.reminder.findMany({
        orderBy: { sentAt: 'desc' },
        take: 8,
        include: { payment: { include: { company: { select: { name: true } } } }, subscription: { select: { provider: true } } },
      }),
    ]);

    res.json({
      upcomingPayments: upcomingPayments.map((p) => ({
        id: p.id,
        companyName: p.company.name,
        amount: (p.amount - p.amountPaid) * p.fxRate,
        dueDate: p.dueDate,
        invoiceNumber: p.invoiceNumber,
        service: p.service,
      })),
      upcomingSubscriptions: upcomingSubscriptions.map((s) => ({
        id: s.id, provider: s.provider, cost: s.cost, currency: s.currency, expiryDate: s.expiryDate,
      })),
      upcomingInvoices: upcomingInvoices.map((inv) => {
        const subtotal = inv.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
        const discount = (subtotal * inv.discountPercent) / 100;
        const tax = ((subtotal - discount) * inv.taxPercent) / 100;
        const total = subtotal - discount + tax;
        return { id: inv.id, number: inv.number, customerName: inv.customerName, balance: Math.max(0, total - inv.amountPaid) * inv.fxRate, dueDate: inv.dueDate };
      }),
      recentReminders: recentReminders.map((r) => ({
        id: r.id, type: r.type, status: r.status, sentAt: r.sentAt, email: r.email, detail: r.detail,
        target: r.payment?.company?.name ?? r.subscription?.provider ?? null,
      })),
    });
  } catch (err) {
    console.error('[alerts] error', err);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});
