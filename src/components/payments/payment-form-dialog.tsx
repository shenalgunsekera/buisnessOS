'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import { apiPatch, apiPost } from '@/lib/api';
import { toDateInputValue } from '@/lib/format';
import type { Company, Payment } from '@/lib/types';

type Mode = 'create' | 'edit';
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  initial?: Payment | null;
  companies: Pick<Company, 'id' | 'name'>[];
  onSaved: () => void;
};

type FormState = {
  companyId: string; amount: string; amountPaid: string; currency: string;
  dueDate: string; datePaid: string;
  invoiceNumber: string; service: string; method: string;
  status: string; notes: string;
  recurring: boolean; recurrenceCycle: string;
};

const today = toDateInputValue(new Date());
const empty: FormState = {
  companyId: '', amount: '0', amountPaid: '0', currency: 'LKR',
  dueDate: today, datePaid: '',
  invoiceNumber: '', service: '', method: 'transfer',
  status: 'pending', notes: '',
  recurring: false, recurrenceCycle: 'monthly',
};

function fromPayment(p: Payment): FormState {
  return {
    companyId: p.companyId,
    amount: String(p.amount),
    amountPaid: String(p.amountPaid),
    currency: p.currency ?? 'LKR',
    dueDate: toDateInputValue(p.dueDate),
    datePaid: toDateInputValue(p.datePaid),
    invoiceNumber: p.invoiceNumber ?? '',
    service: p.service ?? '',
    method: p.method ?? '',
    status: p.status,
    notes: p.notes ?? '',
    recurring: p.recurring,
    recurrenceCycle: p.recurrenceCycle ?? 'monthly',
  };
}

export function PaymentFormDialog({ open, onOpenChange, mode, initial, companies, onSaved }: Props) {
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) setForm(fromPayment(initial));
    else setForm({ ...empty, companyId: companies[0]?.id ?? '' });
  }, [open, mode, initial, companies]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId) { toast.error('Choose a company'); return; }
    if (!form.dueDate) { toast.error('Due date is required'); return; }
    if (!(Number(form.amount) > 0)) { toast.error('Amount must be greater than zero'); return; }
    setSubmitting(true);
    try {
      const payload = {
        companyId: form.companyId,
        amount: Number(form.amount),
        amountPaid: Number(form.amountPaid) || 0,
        currency: form.currency,
        dueDate: form.dueDate,
        datePaid: form.datePaid || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        service: form.service || undefined,
        method: form.method || undefined,
        status: form.status,
        notes: form.notes || undefined,
        recurring: form.recurring,
        recurrenceCycle: form.recurring ? form.recurrenceCycle : undefined,
      };
      if (mode === 'create') {
        await apiPost('/api/payments', payload);
        toast.success('Payment recorded');
      } else if (initial) {
        await apiPatch(`/api/payments/${initial.id}`, payload);
        toast.success('Payment updated');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New payment' : 'Edit payment'}</DialogTitle>
          <DialogDescription>Record an invoice, mark partial payments, or set up a recurring billing.</DialogDescription>
        </DialogHeader>

        {companies.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Add a company first.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="companyId">Company</Label>
                <SelectNative id="companyId" value={form.companyId} onChange={set('companyId')}>
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amountPaid">Amount paid</Label>
                <Input id="amountPaid" type="number" min="0" step="0.01" value={form.amountPaid} onChange={set('amountPaid')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <SelectNative id="currency" value={form.currency} onChange={set('currency')}>
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" type="date" value={form.dueDate} onChange={set('dueDate')} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="datePaid">Date paid</Label>
                <Input id="datePaid" type="date" value={form.datePaid} onChange={set('datePaid')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber">Invoice #</Label>
                <Input id="invoiceNumber" value={form.invoiceNumber} onChange={set('invoiceNumber')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service">Service</Label>
                <Input id="service" value={form.service} onChange={set('service')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="method">Method</Label>
                <SelectNative id="method" value={form.method} onChange={set('method')}>
                  <option value="">—</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="transfer">Bank transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" value={form.status} onChange={set('status')}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </SelectNative>
              </div>

              <div className="col-span-2 mt-1 rounded-lg border border-border bg-muted/30 p-3">
                <label htmlFor="recurring" className="flex items-center gap-2 text-sm font-medium">
                  <input id="recurring" type="checkbox" checked={form.recurring} onChange={set('recurring')} className="h-4 w-4 rounded border-border" />
                  Make this a recurring payment
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  When you mark this as paid, BusinessOS will automatically create the next one on the next cycle date.
                </p>
                {form.recurring && (
                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="recurrenceCycle">Cycle</Label>
                    <SelectNative id="recurrenceCycle" value={form.recurrenceCycle} onChange={set('recurrenceCycle')}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </SelectNative>
                  </div>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={set('notes')} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : mode === 'create' ? 'Record payment' : 'Save changes'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
