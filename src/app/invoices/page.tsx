'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, FileSpreadsheet, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants, Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { computeTotals } from '@/lib/totals';
import type { Invoice } from '@/lib/types';

function effective(inv: Invoice, total: number): string {
  if (inv.status === 'cancelled') return 'cancelled';
  if (inv.amountPaid >= total) return 'paid';
  if (inv.amountPaid > 0) return 'partial';
  if (new Date(inv.dueDate).getTime() < Date.now()) return 'overdue';
  return inv.status;
}
function tone(s: string): 'success' | 'warning' | 'info' | 'danger' | 'muted' {
  if (s === 'paid') return 'success';
  if (s === 'overdue') return 'danger';
  if (s === 'partial') return 'info';
  if (s === 'pending') return 'warning';
  return 'muted';
}

export default function InvoicesPage() {
  const [rows, setRows] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');

  const load = React.useCallback(() => {
    apiGet<Invoice[]>('/api/invoices')
      .then(setRows)
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const duplicate = async (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const created = await apiPost<{ id: string; number: string }>(`/api/invoices/${inv.id}/duplicate`, {});
      toast.success(`Duplicated as ${created.number}`);
      load();
    } catch (err) { toast.error((err as Error).message); }
  };

  const filtered = rows.filter((r) =>
    query.trim() === '' ? true : [r.number, r.customerName, r.customerEmail].filter(Boolean).some((v) => (v as string).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Issued documents with payment status.</p>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <Link href="/invoices/new" className={buttonVariants()}><Plus className="h-4 w-4" /> New invoice</Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-5 w-5" />
                    {rows.length === 0 ? 'No invoices yet.' : 'No invoices match your search.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => {
                const t = computeTotals(inv.items, inv.discountPercent, inv.taxPercent);
                const status = effective(inv, t.total);
                const balance = Math.max(0, t.total - inv.amountPaid);
                return (
                  <TableRow key={inv.id} className="cursor-pointer" onClick={() => { window.location.href = `/invoices/edit/?id=${inv.id}`; }}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell>{inv.customerName}</TableCell>
                    <TableCell>{formatDate(inv.date)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(t.total, inv.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={balance > 0 ? 'font-medium text-amber-700' : 'text-muted-foreground'}>{formatCurrency(balance, inv.currency)}</span>
                    </TableCell>
                    <TableCell><Badge tone={tone(status)}>{status}</Badge></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={(e) => duplicate(inv, e)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
