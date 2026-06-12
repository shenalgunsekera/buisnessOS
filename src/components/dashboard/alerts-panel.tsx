'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Bell, BellRing, CreditCard, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { DashboardAlerts } from '@/lib/types';

function daysUntil(date: string): number {
  const t = new Date(date).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86_400_000);
}

function dueLabel(days: number): { text: string; tone: 'danger' | 'warning' | 'success' | 'muted' } {
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: 'danger' };
  if (days === 0) return { text: 'due today', tone: 'danger' };
  if (days <= 3) return { text: `in ${days}d`, tone: 'danger' };
  if (days <= 7) return { text: `in ${days}d`, tone: 'warning' };
  return { text: `in ${days}d`, tone: 'muted' };
}

function reminderStatusTone(s: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (s === 'sent') return 'success';
  if (s === 'failed') return 'danger';
  if (s === 'skipped') return 'warning';
  return 'muted';
}

export function AlertsPanel() {
  const [data, setData] = React.useState<DashboardAlerts | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [emailEnabled, setEmailEnabled] = React.useState<boolean | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [alerts, status] = await Promise.all([
        apiGet<DashboardAlerts>('/api/dashboard/alerts'),
        apiGet<{ emailEnabled: boolean }>('/api/reminders/status'),
      ]);
      setData(alerts);
      setEmailEnabled(status.emailEnabled);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const report = await apiPost<{ sent: number; skipped: number; failed: number }>(
        '/api/reminders/run-now',
        {},
      );
      const parts = [
        `${report.sent} sent`,
        `${report.skipped} skipped`,
        report.failed ? `${report.failed} failed` : null,
      ].filter(Boolean);
      toast.success(`Reminder check: ${parts.join(', ')}`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Today&apos;s alerts</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Payments and subscriptions due in the next 14 days.</p>
          </div>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
            <RefreshCw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Checking…' : 'Run now'}
          </Button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data || (data.upcomingPayments.length === 0 && data.upcomingSubscriptions.length === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing pressing in the next 14 days.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.upcomingPayments.map((p) => {
              const d = daysUntil(p.dueDate);
              const lbl = dueLabel(d);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {p.companyName}
                        {p.service ? <span className="font-normal text-muted-foreground"> · {p.service}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(p.dueDate)}
                        {p.invoiceNumber ? ` · #${p.invoiceNumber}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-foreground">{formatCurrency(p.amount)}</span>
                    <Badge tone={lbl.tone}>{lbl.text}</Badge>
                  </div>
                </li>
              );
            })}
            {data.upcomingSubscriptions.map((s) => {
              const d = daysUntil(s.expiryDate);
              const lbl = dueLabel(d);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">{s.provider}</div>
                      <div className="text-xs text-muted-foreground">Expires {formatDate(s.expiryDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(s.cost, s.currency)}
                    </span>
                    <Badge tone={lbl.tone}>{lbl.text}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            {emailEnabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            Recent reminders
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {emailEnabled === null
              ? '…'
              : emailEnabled
                ? 'Email reminders are active.'
                : 'EmailJS keys not set in .env'}
          </p>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !data || data.recentReminders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No reminders yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentReminders.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{r.target ?? 'Unknown'}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.type.replaceAll('_', ' ')} · {formatDate(r.sentAt)}
                  </div>
                  {r.detail && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{r.detail}</div>}
                </div>
                <Badge tone={reminderStatusTone(r.status)}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
