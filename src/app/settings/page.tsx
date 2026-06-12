'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPatch } from '@/lib/api';
import type { Settings } from '@/lib/types';

const empty: Settings = {
  businessName: 'BusinessOS',
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  defaultCurrency: 'LKR',
  taxPercent: 0,
  emailServiceId: '',
  emailPaymentTemplateId: '',
  emailSubscriptionTemplateId: '',
  emailPublicKey: '',
  emailPrivateKey: '',
};

export default function SettingsPage() {
  const [s, setS] = React.useState<Settings>(empty);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiGet<Settings>('/api/settings').then((d) => setS({ ...empty, ...d })).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setS((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<Settings> = {
        businessName: s.businessName,
        businessEmail: s.businessEmail ?? undefined,
        businessPhone: s.businessPhone ?? undefined,
        businessAddress: s.businessAddress ?? undefined,
        defaultCurrency: s.defaultCurrency,
        taxPercent: Number(s.taxPercent) || 0,
        emailServiceId: s.emailServiceId ?? undefined,
        emailPaymentTemplateId: s.emailPaymentTemplateId ?? undefined,
        emailSubscriptionTemplateId: s.emailSubscriptionTemplateId ?? undefined,
        emailPublicKey: s.emailPublicKey ?? undefined,
        emailPrivateKey: s.emailPrivateKey ?? undefined,
      };
      const updated = await apiPatch<Settings>('/api/settings', payload);
      setS({ ...empty, ...updated });
      toast.success('Settings saved');
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Business info, currency, and reminder email keys.</p>
        </div>
        <Button type="submit" disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-sm font-semibold">Business</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="businessName">Business name</Label><Input id="businessName" value={s.businessName} onChange={set('businessName')} /></div>
          <div className="space-y-1.5"><Label htmlFor="businessEmail">Email</Label><Input id="businessEmail" type="email" value={s.businessEmail ?? ''} onChange={set('businessEmail')} /></div>
          <div className="space-y-1.5"><Label htmlFor="businessPhone">Phone</Label><Input id="businessPhone" value={s.businessPhone ?? ''} onChange={set('businessPhone')} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="businessAddress">Address</Label><Textarea id="businessAddress" rows={2} value={s.businessAddress ?? ''} onChange={set('businessAddress')} /></div>
          <div className="space-y-1.5"><Label htmlFor="defaultCurrency">Default currency</Label><Input id="defaultCurrency" value={s.defaultCurrency} onChange={set('defaultCurrency')} /></div>
          <div className="space-y-1.5"><Label htmlFor="taxPercent">Default tax %</Label><Input id="taxPercent" type="number" min="0" max="100" step="0.01" value={String(s.taxPercent)} onChange={set('taxPercent')} /></div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="mb-4">
          <h2 className="text-sm font-semibold">EmailJS reminders</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Fill these in to send automated payment + subscription reminders. Find values in your EmailJS dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="emailServiceId">Service ID</Label><Input id="emailServiceId" value={s.emailServiceId ?? ''} onChange={set('emailServiceId')} placeholder="service_xxxxxxx" /></div>
          <div className="space-y-1.5"><Label htmlFor="emailPaymentTemplateId">Payment template ID</Label><Input id="emailPaymentTemplateId" value={s.emailPaymentTemplateId ?? ''} onChange={set('emailPaymentTemplateId')} placeholder="template_xxxxxxx" /></div>
          <div className="space-y-1.5"><Label htmlFor="emailSubscriptionTemplateId">Subscription template ID</Label><Input id="emailSubscriptionTemplateId" value={s.emailSubscriptionTemplateId ?? ''} onChange={set('emailSubscriptionTemplateId')} placeholder="template_xxxxxxx" /></div>
          <div className="space-y-1.5"><Label htmlFor="emailPublicKey">Public key</Label><Input id="emailPublicKey" value={s.emailPublicKey ?? ''} onChange={set('emailPublicKey')} /></div>
          <div className="space-y-1.5"><Label htmlFor="emailPrivateKey">Private key</Label><Input id="emailPrivateKey" type="password" value={s.emailPrivateKey ?? ''} onChange={set('emailPrivateKey')} placeholder="paste to change" /></div>
        </div>
      </div>
    </form>
  );
}
