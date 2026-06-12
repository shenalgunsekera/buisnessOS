'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Download, Save, Trash2, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectNative } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/badge';
import { LineItemsEditor } from '@/components/documents/line-items-editor';
import { TotalsSummary } from '@/components/documents/totals-summary';
import { apiDelete, apiGet, apiPatch, apiPost, apiUrl } from '@/lib/api';
import { toDateInputValue } from '@/lib/format';
import type { Company, Invoice, LineItem, Quotation } from '@/lib/types';

type Mode = 'create' | 'edit';
export type DocKind = 'quotation' | 'invoice';

type Props =
  | { kind: 'quotation'; mode: Mode; id?: string; asTemplate?: boolean }
  | { kind: 'invoice'; mode: Mode; id?: string };

type CommonState = {
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  notes: string;
  currency: string;
  discountPercent: string;
  taxPercent: string;
  status: string;
  companyId: string;
  items: LineItem[];
};

const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'converted'];
const INVOICE_STATUSES = ['pending', 'paid', 'partial', 'overdue', 'cancelled'];

export function DocumentEditor(props: Props) {
  const router = useRouter();
  const isQuotation = props.kind === 'quotation';
  const isCreate = props.mode === 'create';
  const asTemplate = isQuotation && (props as { asTemplate?: boolean }).asTemplate === true;
  const basePath = isQuotation ? '/quotations' : '/invoices';
  const api = isQuotation ? '/api/quotations' : '/api/invoices';
  const [isTemplate, setIsTemplate] = React.useState<boolean>(asTemplate);
  const [templateName, setTemplateName] = React.useState<string>('');

  const [loading, setLoading] = React.useState(!isCreate);
  const [submitting, setSubmitting] = React.useState(false);
  const [companies, setCompanies] = React.useState<Pick<Company, 'id' | 'name'>[]>([]);
  const [number, setNumber] = React.useState<string>('');
  const [date, setDate] = React.useState<string>(toDateInputValue(new Date()));
  const [validUntilOrDue, setValidUntilOrDue] = React.useState<string>(
    isQuotation ? '' : toDateInputValue(new Date(Date.now() + 30 * 86_400_000)),
  );
  const [amountPaid, setAmountPaid] = React.useState<string>('0');
  const [related, setRelated] = React.useState<{ id: string; number: string } | null>(null);

  const [form, setForm] = React.useState<CommonState>({
    customerName: '',
    customerEmail: '',
    customerAddress: '',
    notes: '',
    currency: 'LKR',
    discountPercent: '0',
    taxPercent: '0',
    status: isQuotation ? 'draft' : 'pending',
    companyId: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  });

  React.useEffect(() => {
    apiGet<Company[]>('/api/companies')
      .then((list) => setCompanies(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (isCreate || !('id' in props) || !props.id) return;
    setLoading(true);
    apiGet<Quotation | Invoice>(`${api}/${props.id}`)
      .then((d) => {
        setNumber(d.number);
        setDate(toDateInputValue(d.date));
        setForm({
          customerName: d.customerName,
          customerEmail: d.customerEmail ?? '',
          customerAddress: d.customerAddress ?? '',
          notes: d.notes ?? '',
          currency: d.currency ?? 'LKR',
          discountPercent: String(d.discountPercent),
          taxPercent: String(d.taxPercent),
          status: d.status,
          companyId: d.companyId ?? '',
          items: d.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        });
        if ('validUntil' in d) {
          const qd = d as Quotation;
          setValidUntilOrDue(toDateInputValue(qd.validUntil ?? null));
          setRelated(qd.invoice ?? null);
          setIsTemplate(qd.isTemplate);
          setTemplateName(qd.templateName ?? '');
        } else {
          setValidUntilOrDue(toDateInputValue((d as Invoice).dueDate));
          setAmountPaid(String((d as Invoice).amountPaid));
          setRelated((d as Invoice).quotation ?? null);
        }
      })
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [api, isCreate, props]);

  const set =
    (k: keyof CommonState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildPayload = () => {
    const items = form.items
      .filter((it) => it.description.trim() !== '' || it.quantity > 0 || it.unitPrice > 0)
      .map((it, i) => ({
        description: it.description.trim() || '—',
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        position: i,
      }));
    const base = {
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail || undefined,
      customerAddress: form.customerAddress || undefined,
      notes: form.notes || undefined,
      currency: form.currency,
      discountPercent: Number(form.discountPercent) || 0,
      taxPercent: Number(form.taxPercent) || 0,
      status: form.status,
      companyId: form.companyId || undefined,
      date,
      items,
    };
    if (isQuotation) {
      return {
        ...base,
        validUntil: validUntilOrDue || undefined,
        isTemplate,
        templateName: isTemplate ? templateName || form.customerName : undefined,
      };
    }
    return { ...base, dueDate: validUntilOrDue, amountPaid: Number(amountPaid) || 0 };
  };

  const save = async () => {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!isQuotation && !validUntilOrDue) {
      toast.error('Due date is required');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (isCreate) {
        const created = await apiPost<{ id: string }>(api, payload);
        toast.success(`${isQuotation ? 'Quotation' : 'Invoice'} created`);
        router.replace(`${basePath}/edit/?id=${created.id}`);
      } else if ('id' in props && props.id) {
        await apiPatch(`${api}/${props.id}`, payload);
        toast.success('Saved');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!('id' in props) || !props.id) return;
    if (!window.confirm(`Delete ${isQuotation ? 'quotation' : 'invoice'} ${number}?`)) return;
    try {
      await apiDelete(`${api}/${props.id}`);
      toast.success('Deleted');
      router.replace(basePath);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openPdf = () => {
    if (!('id' in props) || !props.id) return;
    const url = apiUrl(`${api}/${props.id}/pdf`);
    window.open(url, '_blank');
  };

  const convert = async () => {
    if (!('id' in props) || !props.id) return;
    if (!window.confirm('Create an invoice from this quotation?')) return;
    try {
      const inv = await apiPost<{ id: string; number: string }>(`${api}/${props.id}/convert`, {});
      toast.success(`Invoice ${inv.number} created`);
      router.push(`/invoices/edit/?id=${inv.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => router.push(basePath)}
            className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Back to list
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isCreate ? `New ${isQuotation ? 'quotation' : 'invoice'}` : number}
          </h1>
          {related && !isCreate && (
            <p className="text-xs text-muted-foreground">
              {isQuotation ? 'Converted to invoice ' : 'Created from quotation '}
              <a
                href={isQuotation ? `/invoices/edit/?id=${related.id}` : `/quotations/edit/?id=${related.id}`}
                className="text-foreground underline-offset-2 hover:underline"
              >
                {related.number}
              </a>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isCreate && (
            <Button variant="outline" onClick={openPdf}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          )}
          {isQuotation && !isCreate && form.status === 'accepted' && !related && !isTemplate && (
            <Button variant="outline" onClick={convert}>
              <FileSignature className="h-4 w-4" /> Convert to invoice
            </Button>
          )}
          {!isCreate && (
            <Button variant="ghost" onClick={remove} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={save} disabled={submitting}>
            <Save className="h-4 w-4" /> {submitting ? 'Saving…' : isCreate ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {isQuotation && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isTemplate} onChange={(e) => setIsTemplate(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Save this as a reusable template
          </label>
          {isTemplate && (
            <div className="mt-3 grid max-w-md gap-1.5">
              <Label htmlFor="templateName">Template name</Label>
              <Input id="templateName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Standard hosting quote" />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Customer</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="companyId">Linked company (optional)</Label>
                <SelectNative id="companyId" value={form.companyId} onChange={set('companyId')}>
                  <option value="">— none —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="customerName">Customer name</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={set('customerName')}
                  required
                  autoFocus={isCreate}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerEmail">Customer email</Label>
                <Input id="customerEmail" type="email" value={form.customerEmail} onChange={set('customerEmail')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerAddress">Address</Label>
                <Input id="customerAddress" value={form.customerAddress} onChange={set('customerAddress')} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Line items</h2>
            </div>
            <LineItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              className="mt-2"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Terms, payment instructions…"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">Details</h2>
            <div className="space-y-3">
              {!isCreate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Number</span>
                  <Badge>{number}</Badge>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <SelectNative id="status" value={form.status} onChange={set('status')}>
                  {(isQuotation ? QUOTATION_STATUSES : INVOICE_STATUSES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueOrValid">{isQuotation ? 'Valid until' : 'Due date'}</Label>
                <Input
                  id="dueOrValid"
                  type="date"
                  value={validUntilOrDue}
                  onChange={(e) => setValidUntilOrDue(e.target.value)}
                  required={!isQuotation}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <SelectNative id="currency" value={form.currency} onChange={set('currency')}>
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </SelectNative>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="discountPercent">Discount %</Label>
                  <Input
                    id="discountPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.discountPercent}
                    onChange={set('discountPercent')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taxPercent">Tax %</Label>
                  <Input
                    id="taxPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.taxPercent}
                    onChange={set('taxPercent')}
                  />
                </div>
              </div>
              {!isQuotation && (
                <div className="space-y-1.5">
                  <Label htmlFor="amountPaid">Amount paid</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <TotalsSummary
            items={form.items}
            discountPercent={Number(form.discountPercent) || 0}
            taxPercent={Number(form.taxPercent) || 0}
            amountPaid={isQuotation ? undefined : Number(amountPaid) || 0}
            currency={form.currency}
          />
        </div>
      </div>
    </div>
  );
}
