'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SubscriptionFormDialog } from '@/components/subscriptions/subscription-form-dialog';
import { apiDelete, apiGet } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Subscription } from '@/lib/types';

function daysUntil(date: string): number {
  const t = new Date(date).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86_400_000);
}

function expiryTone(days: number, status: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status !== 'active') return 'muted';
  if (days < 0) return 'danger';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

function expiryLabel(days: number, status: string): string {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'expired') return 'expired';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'expires today';
  if (days === 1) return '1 day left';
  if (days <= 30) return `${days} days left`;
  return 'healthy';
}

export default function SubscriptionsPage() {
  const [rows, setRows] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [query, setQuery] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<Subscription[]>('/api/subscriptions');
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (s: Subscription) => {
    if (!window.confirm(`Delete subscription "${s.provider}"?`)) return;
    try {
      await apiDelete(`/api/subscriptions/${s.id}`);
      toast.success('Subscription deleted');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = rows.filter((r) =>
    query.trim() === ''
      ? true
      : [r.provider, r.notes, r.email].filter(Boolean).some((v) => (v as string).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Software, hosting, APIs, and licenses with auto reminders.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New subscription
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>Cycle</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Auto-renew</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-5 w-5" />
                    {rows.length === 0
                      ? 'No subscriptions yet. Add OpenAI, Vercel, your domain — anything that renews.'
                      : 'No subscriptions match your search.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => {
                const d = daysUntil(s.expiryDate);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{s.provider}</div>
                      {s.email && <div className="text-xs text-muted-foreground">{s.email}</div>}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">{s.renewalCycle}</TableCell>
                    <TableCell>
                      <div>{formatDate(s.expiryDate)}</div>
                      <div className="text-xs">
                        <Badge tone={expiryTone(d, s.status)}>{expiryLabel(d, s.status)}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.cost, s.currency)}</TableCell>
                    <TableCell>
                      {s.autoRenew ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <RefreshCw className="h-3 w-3" /> on
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">off</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={s.status === 'active' ? 'success' : 'muted'}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(s);
                            setDialogOpen(true);
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(s)} aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? 'edit' : 'create'}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}
