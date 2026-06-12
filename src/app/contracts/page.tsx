'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, FileSignature } from 'lucide-react';
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
import { formatDate, toDateInputValue } from '@/lib/format';
import type { Contract } from '@/lib/types';

type FormState = { name: string; partyName: string; startDate: string; expiryDate: string; renewalDate: string; fileUrl: string; notes: string; status: string };
const empty: FormState = { name: '', partyName: '', startDate: '', expiryDate: '', renewalDate: '', fileUrl: '', notes: '', status: 'active' };

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((t - today.getTime()) / 86_400_000);
}

function tone(days: number | null, status: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (status !== 'active') return 'muted';
  if (days === null) return 'muted';
  if (days < 0 || days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

export default function ContractsPage() {
  const [rows, setRows] = React.useState<Contract[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contract | null>(null);
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Contract[]>('/api/contracts').then(setRows).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        partyName: editing.partyName ?? '',
        startDate: toDateInputValue(editing.startDate),
        expiryDate: toDateInputValue(editing.expiryDate),
        renewalDate: toDateInputValue(editing.renewalDate),
        fileUrl: editing.fileUrl ?? '',
        notes: editing.notes ?? '',
        status: editing.status,
      });
    } else setForm(empty);
  }, [open, editing]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        partyName: form.partyName || undefined,
        startDate: form.startDate || undefined,
        expiryDate: form.expiryDate || undefined,
        renewalDate: form.renewalDate || undefined,
        fileUrl: form.fileUrl || undefined,
        notes: form.notes || undefined,
        status: form.status,
      };
      if (editing) await apiPatch(`/api/contracts/${editing.id}`, payload);
      else await apiPost('/api/contracts', payload);
      toast.success(editing ? 'Contract updated' : 'Contract added');
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const onDelete = async (c: Contract) => {
    if (!window.confirm(`Delete contract "${c.name}"?`)) return;
    try { await apiDelete(`/api/contracts/${c.id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
          <p className="text-sm text-muted-foreground">Agreements and expiry tracking.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New contract</Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                <FileSignature className="mx-auto mb-2 h-5 w-5" />No contracts yet.</TableCell></TableRow>
            ) : rows.map((c) => {
              const d = daysUntil(c.expiryDate);
              const label = c.status !== 'active' ? c.status : d === null ? '—' : d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'expires today' : `${d}d left`;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.partyName ?? '—'}</TableCell>
                  <TableCell>{formatDate(c.expiryDate)}</TableCell>
                  <TableCell><Badge tone={tone(d, c.status)}>{label}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(c)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit contract' : 'New contract'}</DialogTitle><DialogDescription>Track agreement dates.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={set('name')} required /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="partyName">Party</Label><Input id="partyName" value={form.partyName} onChange={set('partyName')} placeholder="Counterparty / vendor" /></div>
              <div className="space-y-1.5"><Label htmlFor="startDate">Start date</Label><Input id="startDate" type="date" value={form.startDate} onChange={set('startDate')} /></div>
              <div className="space-y-1.5"><Label htmlFor="expiryDate">Expiry date</Label><Input id="expiryDate" type="date" value={form.expiryDate} onChange={set('expiryDate')} /></div>
              <div className="space-y-1.5"><Label htmlFor="renewalDate">Renewal date</Label><Input id="renewalDate" type="date" value={form.renewalDate} onChange={set('renewalDate')} /></div>
              <div className="space-y-1.5"><Label htmlFor="status">Status</Label>
                <SelectNative id="status" value={form.status} onChange={set('status')}>
                  <option value="active">Active</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option>
                </SelectNative>
              </div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="fileUrl">File link</Label><Input id="fileUrl" value={form.fileUrl} onChange={set('fileUrl')} placeholder="C:\path\to\contract.pdf or https://..." /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save' : 'Add contract'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
