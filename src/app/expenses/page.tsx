'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { formatCurrency, formatDate, toDateInputValue } from '@/lib/format';
import type { Expense } from '@/lib/types';

const CATEGORIES = ['hosting','software','fuel','internet','electricity','marketing','salary','office','travel','meals','taxes','miscellaneous'] as const;

type FormState = { date: string; category: string; amount: string; currency: string; description: string; vendor: string; notes: string };
const empty: FormState = { date: toDateInputValue(new Date()), category: 'hosting', amount: '0', currency: 'LKR', description: '', vendor: '', notes: '' };

export default function ExpensesPage() {
  const [rows, setRows] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);
  const [categoryFilter, setCategoryFilter] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Expense[]>('/api/expenses').then(setRows).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        date: toDateInputValue(editing.date),
        category: editing.category,
        amount: String(editing.amount),
        currency: editing.currency ?? 'LKR',
        description: editing.description ?? '',
        vendor: editing.vendor ?? '',
        notes: editing.notes ?? '',
      });
    } else setForm(empty);
  }, [open, editing]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(Number(form.amount) >= 0)) { toast.error('Invalid amount'); return; }
    setSubmitting(true);
    try {
      const payload = { date: form.date, category: form.category, amount: Number(form.amount), currency: form.currency, description: form.description || undefined, vendor: form.vendor || undefined, notes: form.notes || undefined };
      if (editing) await apiPatch(`/api/expenses/${editing.id}`, payload);
      else await apiPost('/api/expenses', payload);
      toast.success(editing ? 'Expense updated' : 'Expense added');
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (e: Expense) => {
    if (!window.confirm(`Delete ${e.category} expense of ${formatCurrency(e.amount, e.currency)}?`)) return;
    try { await apiDelete(`/api/expenses/${e.id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error((err as Error).message); }
  };

  const filtered = categoryFilter ? rows.filter((r) => r.category === categoryFilter) : rows;
  // Totals are normalised to LKR using each entry's snapshotted rate.
  const total = filtered.reduce((s, r) => s + r.amount * (r.fxRate || 1), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track business costs by category.</p>
        </div>
        <div className="flex items-center gap-2">
          <SelectNative value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-44">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </SelectNative>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Total" value={formatCurrency(total)} />
        <Stat label="Entries" value={filtered.length} />
        <Stat label="Avg / entry" value={filtered.length ? formatCurrency(total / filtered.length) : formatCurrency(0)} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                <Wallet className="mx-auto mb-2 h-5 w-5" />{rows.length === 0 ? 'No expenses yet.' : 'No matches.'}</TableCell></TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{formatDate(e.date)}</TableCell>
                <TableCell><Badge tone="muted">{e.category}</Badge></TableCell>
                <TableCell>{e.description ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{e.vendor ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(e.amount, e.currency)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(e)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit expense' : 'New expense'}</DialogTitle>
            <DialogDescription>Record a business cost.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="date">Date</Label><Input id="date" type="date" value={form.date} onChange={set('date')} required /></div>
              <div className="space-y-1.5"><Label htmlFor="category">Category</Label>
                <SelectNative id="category" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </SelectNative>
              </div>
              <div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} required /></div>
              <div className="space-y-1.5"><Label htmlFor="currency">Currency</Label>
                <SelectNative id="currency" value={form.currency} onChange={set('currency')}>
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </SelectNative>
              </div>
              <div className="space-y-1.5"><Label htmlFor="vendor">Vendor</Label><Input id="vendor" value={form.vendor} onChange={set('vendor')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="description">Description</Label><Input id="description" value={form.description} onChange={set('description')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save' : 'Add expense'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
