'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { apiGet } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

const empty: DashboardStats = {
  totalCompanies: 0,
  totalRevenue: 0,
  monthlyRevenue: 0,
  monthlyExpenses: 0,
  profit: 0,
  activeSubscriptions: 0,
  expiringSubscriptions: 0,
  pendingPayments: 0,
  overduePayments: 0,
  pendingQuotations: 0,
  pendingTasks: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(empty);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<DashboardStats>('/api/dashboard/stats')
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setOnline(true);
      })
      .catch(() => {
        if (cancelled) return;
        setOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Good day</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s a snapshot of your business today.</p>
        </div>
        <ApiStatus online={online} />
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Companies" value={stats.totalCompanies} icon={Building2} />
          <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} icon={DollarSign} />
          <StatCard label="Monthly Revenue" value={fmt(stats.monthlyRevenue)} icon={TrendingUp} />
          <StatCard label="Monthly Expenses" value={fmt(stats.monthlyExpenses)} icon={TrendingDown} />
          <StatCard label="Profit" value={fmt(stats.profit)} icon={Wallet} />
          <StatCard label="Active Subscriptions" value={stats.activeSubscriptions} icon={CreditCard} />
          <StatCard label="Pending Payments" value={stats.pendingPayments} icon={Clock} />
          <StatCard label="Overdue Payments" value={stats.overduePayments} icon={AlertCircle} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity
        </h2>
        <AlertsPanel />
      </section>
    </div>
  );
}

function ApiStatus({ online }: { online: boolean | null }) {
  const label = online === null ? 'Connecting' : online ? 'Connected' : 'Offline';
  const color =
    online === null ? 'bg-muted-foreground/40' : online ? 'bg-emerald-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
