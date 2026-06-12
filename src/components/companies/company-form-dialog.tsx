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
import type { Company } from '@/lib/types';

type Mode = 'create' | 'edit';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  initial?: Company | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  services: string;
  monthlyAmount: string;
  status: string;
  notes: string;
};

const empty: FormState = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  services: '',
  monthlyAmount: '0',
  status: 'active',
  notes: '',
};

function fromCompany(c: Company): FormState {
  return {
    name: c.name,
    contactPerson: c.contactPerson ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    website: c.website ?? '',
    services: c.services ?? '',
    monthlyAmount: String(c.monthlyAmount ?? 0),
    status: c.status ?? 'active',
    notes: c.notes ?? '',
  };
}

export function CompanyFormDialog({ open, onOpenChange, mode, initial, onSaved }: Props) {
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm(mode === 'edit' && initial ? fromCompany(initial) : empty);
  }, [open, mode, initial]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        website: form.website || undefined,
        services: form.services || undefined,
        notes: form.notes || undefined,
        monthlyAmount: Number(form.monthlyAmount) || 0,
        status: form.status,
      };
      if (mode === 'create') {
        await apiPost('/api/companies', payload);
        toast.success('Company created');
      } else if (initial) {
        await apiPatch(`/api/companies/${initial.id}`, payload);
        toast.success('Company updated');
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
          <DialogTitle>{mode === 'create' ? 'New company' : 'Edit company'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a company to start tracking payments and services.' : 'Update company details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" value={form.contactPerson} onChange={set('contactPerson')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={set('website')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={set('address')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monthlyAmount">Monthly Amount</Label>
              <Input
                id="monthlyAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.monthlyAmount}
                onChange={set('monthlyAmount')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <SelectNative id="status" value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectNative>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="services">Services</Label>
              <Input id="services" value={form.services} onChange={set('services')} placeholder="Hosting, Domain, SEO…" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={set('notes')} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
