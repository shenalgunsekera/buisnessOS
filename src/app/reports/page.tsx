'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { SelectNative } from '@/components/ui/select-native';
import type { ReportsSummary } from '@/lib/types';

export default function ReportsPage() {
  const [months, setMonths] = React.useState(6);
  const [data, setData] = React.useState<ReportsSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    apiGet<ReportsSummary>(`/api/reports/summary?months=${months}`)
      .then(setData)
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [months]);

  const maxAbs = data ? Math.max(1, ...data.series.flatMap((s) => [Math.abs(s.revenue), Math.abs(s.expenses), Math.abs(s.profit)])) : 1;
  const maxCat = data?.expensesByCategory[0]?.amount ?? 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Revenue, expenses, and profit trends.</p>
        </div>
        <SelectNative className="w-44" value={String(months)} onChange={(e) => setMonths(Number(e.target.value))}>
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </SelectNative>
      </div>

      {loading || !data ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Revenue" value={formatCurrency(data.totals.revenue)} icon={TrendingUp} />
            <Stat label="Expenses" value={formatCurrency(data.totals.expenses)} icon={TrendingDown} />
            <Stat label="Profit" value={formatCurrency(data.totals.profit)} icon={Wallet} />
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-5 text-sm font-semibold">Monthly trend</h2>
            <div className="flex items-end gap-4 overflow-x-auto pb-4">
              {data.series.map((s) => (
                <div key={s.month} className="flex w-20 shrink-0 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <Bar value={s.revenue} max={maxAbs} colorClass="bg-emerald-500" title={`Revenue ${formatCurrency(s.revenue)}`} />
                    <Bar value={s.expenses} max={maxAbs} colorClass="bg-amber-500" title={`Expenses ${formatCurrency(s.expenses)}`} />
                    <Bar value={s.profit} max={maxAbs} colorClass={s.profit >= 0 ? 'bg-blue-500' : 'bg-red-500'} title={`Profit ${formatCurrency(s.profit)}`} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{s.month.slice(5)}/{s.month.slice(2, 4)}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <Legend className="bg-emerald-500" label="Revenue" />
              <Legend className="bg-amber-500" label="Expenses" />
              <Legend className="bg-blue-500" label="Profit" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-sm font-semibold">Expenses by category</h2>
            {data.expensesByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded in this period.</p>
            ) : (
              <ul className="space-y-2">
                {data.expensesByCategory.map((c) => (
                  <li key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{c.category}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${(c.amount / maxCat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Bar({ value, max, colorClass, title }: { value: number; max: number; colorClass: string; title: string }) {
  const h = Math.max(2, (Math.abs(value) / max) * 100);
  return <div title={title} className={`${colorClass} w-3 rounded-t`} style={{ height: `${h}%` }} />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${className}`} /> {label}
    </span>
  );
}
