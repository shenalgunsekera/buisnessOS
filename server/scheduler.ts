import cron from 'node-cron';
import { prisma } from './db';
import { emailEnabled, loadEmailConfig, sendEmail } from './email';
import { notify } from './notify';
import { getRateToLkr } from './fx';

const REMINDER_OFFSETS = [-7, -3, -1, 0] as const;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffInDays(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

function dayKey(d: Date) {
  return startOfDay(d).toISOString().slice(0, 10);
}

function paymentReminderType(daysUntilDue: number): string {
  if (daysUntilDue > 0) return `payment_due_in_${daysUntilDue}d`;
  if (daysUntilDue === 0) return 'payment_due_today';
  return 'payment_overdue';
}

function subscriptionReminderType(daysUntilExpiry: number): string {
  if (daysUntilExpiry > 0) return `subscription_expiring_in_${daysUntilExpiry}d`;
  if (daysUntilExpiry === 0) return 'subscription_expires_today';
  return 'subscription_expired';
}

function daysWord(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function paymentNotificationLine(d: number, name: string, remaining: number, inv: string | null, currency: string) {
  const sfx = inv ? ` (#${inv})` : '';
  const amt = `${currency} ${remaining.toFixed(2)}`;
  if (d < 0) return { title: `Payment ${daysWord(Math.abs(d), 'day', 'days')} overdue`, message: `${name}${sfx}: ${amt} outstanding.` };
  if (d === 0) return { title: 'Payment due today', message: `${name}${sfx}: ${amt}` };
  return { title: `Payment due in ${daysWord(d, 'day', 'days')}`, message: `${name}${sfx}: ${amt}` };
}

function subNotificationLine(d: number, provider: string, cost: number, currency: string) {
  if (d < 0) return { title: 'Subscription expired', message: `${provider} renewed ${daysWord(Math.abs(d), 'day', 'days')} ago.` };
  if (d === 0) return { title: 'Subscription expires today', message: `${provider} · ${currency} ${cost.toFixed(2)}` };
  return { title: `Subscription expires in ${daysWord(d, 'day', 'days')}`, message: `${provider} · ${currency} ${cost.toFixed(2)}` };
}

function addCycle(date: Date, cycle: string): Date {
  const d = new Date(date);
  switch (cycle) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'quarterly': d.setMonth(d.getMonth() + 3); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    case 'monthly':
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

export type SchedulerRunReport = {
  ranAt: string;
  emailEnabled: boolean;
  paymentsChecked: number;
  subscriptionsChecked: number;
  recurringSpawned: number;
  sent: number;
  skipped: number;
  failed: number;
};

async function spawnRecurringSuccessors(now: Date): Promise<number> {
  // Auto-roll a recurring payment to the next cycle once it is either paid or
  // its due date has arrived — whichever comes first — and it has no successor
  // yet (the unique parent link guarantees exactly one child per cycle, so this
  // never creates duplicates no matter how often the check runs).
  const candidates = await prisma.payment.findMany({
    where: {
      recurring: true,
      child: null,
      recurrenceCycle: { not: null },
      status: { not: 'cancelled' },
      OR: [{ status: 'paid' }, { dueDate: { lte: now } }],
    },
  });
  let spawned = 0;
  for (const p of candidates) {
    const cycle = p.recurrenceCycle ?? 'monthly';
    const nextDue = addCycle(p.dueDate, cycle);
    // Re-snapshot the live FX rate so each month's entry reflects that month's rate.
    const fxRate = await getRateToLkr(p.currency);
    const created = await prisma.payment.create({
      data: {
        companyId: p.companyId,
        amount: p.amount,
        amountPaid: 0,
        currency: p.currency,
        fxRate,
        dueDate: nextDue,
        invoiceNumber: null,
        service: p.service,
        method: p.method,
        status: 'pending',
        notes: p.notes,
        recurring: true,
        recurrenceCycle: cycle,
        parentPaymentId: p.id,
      },
    });
    spawned += 1;
    notify({
      title: 'Recurring payment created',
      message: `Next ${p.service ?? 'payment'} due ${nextDue.toISOString().slice(0, 10)}.`,
    });
    void created;
  }
  return spawned;
}

export async function runDailyCheck(): Promise<SchedulerRunReport> {
  const now = new Date();
  const today = startOfDay(now);
  const todayKey = dayKey(now);
  const cfg = await loadEmailConfig();
  const emailOn = cfg !== null;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const recurringSpawned = await spawnRecurringSuccessors(now);

  const payments = await prisma.payment.findMany({
    where: { status: { notIn: ['paid', 'cancelled'] } },
    include: { company: true },
  });

  for (const p of payments) {
    if (p.amountPaid >= p.amount) continue;
    const daysUntil = diffInDays(today, p.dueDate);
    const shouldRemind = REMINDER_OFFSETS.includes(daysUntil as -7 | -3 | -1 | 0) || daysUntil < 0;
    if (!shouldRemind) continue;

    const type = paymentReminderType(daysUntil);
    const existing = await prisma.reminder.findUnique({
      where: { type_dayKey_paymentId: { type, dayKey: todayKey, paymentId: p.id } },
    });
    if (existing) continue;

    const remaining = p.amount - p.amountPaid;
    notify(paymentNotificationLine(daysUntil, p.company.name, remaining, p.invoiceNumber, p.currency));

    const recipient = p.company.email ?? '';
    if (!recipient) {
      await prisma.reminder.create({ data: { type, dayKey: todayKey, paymentId: p.id, email: null, status: 'skipped', detail: 'Company has no email address' } });
      skipped += 1;
      continue;
    }
    if (!emailOn) {
      await prisma.reminder.create({ data: { type, dayKey: todayKey, paymentId: p.id, email: recipient, status: 'skipped', detail: 'EmailJS not configured' } });
      skipped += 1;
      continue;
    }

    const variables = {
      to_email: recipient,
      company_name: p.company.name,
      service_name: p.service ?? '',
      amount: String(remaining),
      due_date: p.dueDate.toISOString().slice(0, 10),
      invoice_number: p.invoiceNumber ?? '',
      days_until_due: String(daysUntil),
    };
    const result = await sendEmail(cfg!.paymentTemplateId, variables);
    await prisma.reminder.create({ data: { type, dayKey: todayKey, paymentId: p.id, email: recipient, status: result.ok ? 'sent' : 'failed', detail: result.ok ? undefined : result.error } });
    if (result.ok) sent += 1; else failed += 1;
  }

  const subscriptions = await prisma.subscription.findMany({ where: { status: 'active' } });

  for (const s of subscriptions) {
    const daysUntil = diffInDays(today, s.expiryDate);
    const shouldRemind = REMINDER_OFFSETS.includes(daysUntil as -7 | -3 | -1 | 0) || daysUntil < 0;
    if (!shouldRemind) continue;

    const type = subscriptionReminderType(daysUntil);
    const existing = await prisma.reminder.findUnique({
      where: { type_dayKey_subscriptionId: { type, dayKey: todayKey, subscriptionId: s.id } },
    });
    if (existing) continue;

    notify(subNotificationLine(daysUntil, s.provider, s.cost, s.currency));

    const recipient = s.email ?? '';
    if (!recipient) {
      await prisma.reminder.create({ data: { type, dayKey: todayKey, subscriptionId: s.id, email: null, status: 'skipped', detail: 'Subscription has no notification email' } });
      skipped += 1;
      continue;
    }
    if (!emailOn) {
      await prisma.reminder.create({ data: { type, dayKey: todayKey, subscriptionId: s.id, email: recipient, status: 'skipped', detail: 'EmailJS not configured' } });
      skipped += 1;
      continue;
    }
    const variables = {
      to_email: recipient,
      provider: s.provider,
      cost: String(s.cost),
      currency: s.currency,
      expiry_date: s.expiryDate.toISOString().slice(0, 10),
      renewal_cycle: s.renewalCycle,
      days_until_expiry: String(daysUntil),
    };
    const result = await sendEmail(cfg!.subscriptionTemplateId, variables);
    await prisma.reminder.create({ data: { type, dayKey: todayKey, subscriptionId: s.id, email: recipient, status: result.ok ? 'sent' : 'failed', detail: result.ok ? undefined : result.error } });
    if (result.ok) sent += 1; else failed += 1;
  }

  return {
    ranAt: now.toISOString(),
    emailEnabled: emailOn,
    paymentsChecked: payments.length,
    subscriptionsChecked: subscriptions.length,
    recurringSpawned,
    sent,
    skipped,
    failed,
  };
}

export function startScheduler() {
  cron.schedule('0 8 * * *', () => {
    runDailyCheck()
      .then((r) => console.log('[scheduler] daily check', r))
      .catch((e) => console.error('[scheduler] daily check failed', e));
  }, { timezone: process.env.TZ ?? 'UTC' });

  setTimeout(() => {
    runDailyCheck()
      .then((r) => console.log('[scheduler] startup check', r))
      .catch((e) => console.error('[scheduler] startup check failed', e));
  }, 5000);

  emailEnabled().then((on) => {
    console.log(`[scheduler] cron 0 8 * * * registered; email ${on ? 'enabled' : 'disabled (configure in Settings)'}`);
  });
}
