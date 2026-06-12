'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, Receipt, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaymentFormDialog } from '@/components/payments/payment-form-dialog';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { effectiveStatus, paymentStatusTone } from '@/lib/status';
import type { Company, Payment } from '@/lib/types';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PaymentsPage() {
  const [rows, setRows] = React.useState<Payment[]>([]);
  const [companies, setCompanies] = React.useState<Pick<Company, 'id' | 'name'>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Payment | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [payments, companyList] = await Promise.all([
        apiGet<Payment[]>('/api/payments'),
        apiGet<Company[]>('/api/companies'),
      ]);
      setRows(payments);
      setCompanies(companyList.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const onDelete = async (p: Payment) => {
    if (!window.confirm(`Delete this payment for ${p.company?.name ?? 'the company'}?`)) return;
    try { await apiDelete(`/api/payments/${p.id}`); toast.success('Payment deleted'); load(); }
    catch (err) { toast.error((err as Error).message); }
  };

  const onDuplicate = async (p: Payment) => {
    try {
      await apiPost(`/api/payments/${p.id}/duplicate`, {});
      toast.success('Payment duplicated');
      load();
    } catch (err) { toast.error((err as Error).message); }
  };

  const filtered = statusFilter ? rows.filter((p) => effectiveStatus(p) === statusFilter) : rows;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">Track invoices, outstanding balances, and recurring billing.</p>
        </div>
        <div className="flex items-center gap-2">
          <SelectNative value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </SelectNative>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={companies.length === 0}>
            <Plus className="h-4 w-4" /> New payment
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Invoice / Service</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="h-5 w-5" />
                    {rows.length === 0
                      ? (companies.length === 0 ? 'Create a company first, then record payments here.' : 'No payments yet.')
                      : 'No payments match this filter.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const status = effectiveStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.company?.name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{p.service || '—'}</span>
                        {p.recurring && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                            <RefreshCw className="h-2.5 w-2.5" /> {p.recurrenceCycle ?? 'monthly'}
                          </span>
                        )}
                      </div>
                      {p.invoiceNumber && <div className="text-xs text-muted-foreground">#{p.invoiceNumber}</div>}
                    </TableCell>
                    <TableCell>{formatDate(p.dueDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.amount, p.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(p.amountPaid, p.currency)}</TableCell>
                    <TableCell><Badge tone={paymentStatusTone(status)}>{status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onDuplicate(p)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(p)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaymentFormDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={editing ? 'edit' : 'create'} initial={editing} companies={companies} onSaved={load} />
    </div>
  );
}
