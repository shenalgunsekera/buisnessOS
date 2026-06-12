import { Router } from 'express';
import { prisma } from '../db';

export const reportsRouter = Router();

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

reportsRouter.get('/summary', async (req, res) => {
  const months = Math.max(1, Math.min(24, Number(req.query.months) || 6));
  const now = new Date();
  const firstMonth = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1));

  const [payments, expenses, invoices] = await Promise.all([
    prisma.payment.findMany({ where: { datePaid: { gte: firstMonth } } }),
    prisma.expense.findMany({ where: { date: { gte: firstMonth } } }),
    prisma.invoice.findMany({ where: { date: { gte: firstMonth } }, include: { items: true } }),
  ]);

  // Build monthly buckets.
  const buckets: Record<string, { month: string; revenue: number; expenses: number; profit: number; invoiceTotal: number }> = {};
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { month: key, revenue: 0, expenses: 0, profit: 0, invoiceTotal: 0 };
  }

  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  // All money is normalised to LKR using the rate snapshotted on each record.
  for (const p of payments) {
    if (!p.datePaid) continue;
    const k = keyOf(p.datePaid);
    if (buckets[k]) buckets[k].revenue += p.amountPaid * p.fxRate;
  }
  for (const e of expenses) {
    const k = keyOf(e.date);
    if (buckets[k]) buckets[k].expenses += e.amount * e.fxRate;
  }
  for (const inv of invoices) {
    const subtotal = inv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = subtotal * (inv.discountPercent / 100);
    const tax = (subtotal - discount) * (inv.taxPercent / 100);
    const total = (subtotal - discount + tax) * inv.fxRate;
    const k = keyOf(inv.date);
    if (buckets[k]) buckets[k].invoiceTotal += total;
  }
  for (const k of Object.keys(buckets)) {
    buckets[k].profit = buckets[k].revenue - buckets[k].expenses;
  }

  const series = Object.values(buckets);
  const totals = series.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.revenue,
      expenses: acc.expenses + b.expenses,
      profit: acc.profit + b.profit,
      invoiceTotal: acc.invoiceTotal + b.invoiceTotal,
    }),
    { revenue: 0, expenses: 0, profit: 0, invoiceTotal: 0 },
  );

  // Expense breakdown by category over the period.
  const categories: Record<string, number> = {};
  for (const e of expenses) {
    categories[e.category] = (categories[e.category] ?? 0) + e.amount * e.fxRate;
  }
  const expensesByCategory = Object.entries(categories)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  res.json({ months, series, totals, expensesByCategory });
});
