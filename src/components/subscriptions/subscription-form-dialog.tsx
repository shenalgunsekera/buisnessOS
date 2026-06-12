'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import { apiPatch, apiPost } from '@/lib/api';
import { toDateInputValue } from '@/lib/format';
import type { Subscription } from '@/lib/types';

type Mode = 'create' | 'edit';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  initial?: Subscription | null;
  onSaved: () => void;
};

type FormState = {
  provider: string;
  cost: string;
  currency: string;
  purchaseDate: string;
  expiryDate: string;
  renewalCycle: string;
  reminderDays: string;
  autoRenew: boolean;
  status: string;
  email: string;
  notes: string;
};

const empty: FormState = {
  provider: '',
  cost: '0',
  currency: 'LKR',
  purchaseDate: '',
  expiryDate: toDateInputValue(new Date()),
  renewalCycle: 'monthly',
  reminderDays: '7',
  autoRenew: false,
  status: 'active',
  email: '',
  notes: '',
};

function fromSubscription(s: Subscription): FormState {
  return {
    provider: s.provider,
    cost: String(s.cost),
    currency: s.currency,
    purchaseDate: toDateInputValue(s.purchaseDate),
    expiryDate: toDateInputValue(s.expiryDate),
    renewalCycle: s.renewalCycle,
    reminderDays: String(s.reminderDays),
    autoRenew: s.autoRenew,
    status: s.status,
    email: s.email ?? '',
    notes: s.notes ?? '',
  };
}

export function SubscriptionFormDialog({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(mode === 'edit' && initial ? fromSubscription(initial) : empty);
  }, [open, mode, initial]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [k]: value }));
    };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.provider.trim()) {
      toast.error('Provider is required');
      return;
    }
    if (!form.expiryDate) {
      toast.error('Expiry date is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        provider: form.provider.trim(),
        cost: Number(form.cost) || 0,
        currency: form.currency || 'LKR',
        purchaseDate: form.purchaseDate || undefined,
        expiryDate: form.expiryDate,
        renewalCycle: form.renewalCycle,
        reminderDays: Number(form.reminderDays) || 0,
        autoRenew: form.autoRenew,
        status: form.status,
        email: form.email || undefined,
        notes: form.notes || undefined,
      };
      if (mode === 'create') {
        await apiPost('/api/subscriptions', payload);
        toast.success('Subscription added');
      } else if (initial) {
        await apiPatch(`/api/subscriptions/${initial.id}`, payload);
        toast.success('Subscription updated');
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
          <DialogTitle>{mode === 'create' ? 'New subscription' : 'Edit subscription'}</DialogTitle>
          <DialogDescription>
            Track recurring software, hosting, and license expenses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Input
                id="provider"
                value={form.provider}
                onChange={set('provider')}
                placeholder="OpenAI, Vercel, Cloudflare…"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost</Label>
              <Input id="cost" type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <SelectNative id="currency" value={form.currency} onChange={set('currency')}>
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
              </SelectNative>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate">Purchase date</Label>
              <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={set('purchaseDate')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input id="expiryDate" type="date" value={form.expiryDate} onChange={set('expiryDate')} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="renewalCycle">Renewal cycle</Label>
              <SelectNative id="renewalCycle" value={form.renewalCycle} onChange={set('renewalCycle')}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </SelectNative>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reminderDays">Reminder days before</Label>
              <Input
                id="reminderDays"
                type="number"
                min="0"
                max="365"
                value={form.reminderDays}
                onChange={set('reminderDays')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <SelectNative id="status" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </SelectNative>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="autoRenew"
                type="checkbox"
                checked={form.autoRenew}
                onChange={set('autoRenew')}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="autoRenew" className="cursor-pointer">
                Auto-renews
              </Label>
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="email">Notification email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="Used for renewal reminders"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={set('notes')} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Add subscription' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
