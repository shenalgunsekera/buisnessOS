'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, ListTodo, Check } from 'lucide-react';
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
import type { Task } from '@/lib/types';

type FormState = { title: string; description: string; priority: string; status: string; dueDate: string };
const empty: FormState = { title: '', description: '', priority: 'medium', status: 'pending', dueDate: '' };

function priorityTone(p: string): 'danger' | 'warning' | 'muted' {
  if (p === 'high') return 'danger';
  if (p === 'medium') return 'warning';
  return 'muted';
}
function statusTone(s: string): 'success' | 'info' | 'warning' {
  if (s === 'completed') return 'success';
  if (s === 'in_progress') return 'info';
  return 'warning';
}

export default function TasksPage() {
  const [rows, setRows] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [form, setForm] = React.useState<FormState>(empty);
  const [submitting, setSubmitting] = React.useState(false);
  const [tab, setTab] = React.useState<'open' | 'all'>('open');

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Task[]>('/api/tasks').then(setRows).catch((e) => toast.error((e as Error).message)).finally(() => setLoading(false));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (!open) return;
    if (editing) setForm({ title: editing.title, description: editing.description ?? '', priority: editing.priority, status: editing.status, dueDate: toDateInputValue(editing.dueDate) });
    else setForm(empty);
  }, [open, editing]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      const payload = { title: form.title.trim(), description: form.description || undefined, priority: form.priority, status: form.status, dueDate: form.dueDate || undefined };
      if (editing) await apiPatch(`/api/tasks/${editing.id}`, payload);
      else await apiPost('/api/tasks', payload);
      toast.success(editing ? 'Task updated' : 'Task added');
      setOpen(false); load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const toggleDone = async (t: Task) => {
    const newStatus = t.status === 'completed' ? 'pending' : 'completed';
    try { await apiPatch(`/api/tasks/${t.id}`, { status: newStatus }); load(); }
    catch (err) { toast.error((err as Error).message); }
  };

  const onDelete = async (t: Task) => {
    if (!window.confirm(`Delete task "${t.title}"?`)) return;
    try { await apiDelete(`/api/tasks/${t.id}`); toast.success('Deleted'); load(); }
    catch (err) { toast.error((err as Error).message); }
  };

  const filtered = tab === 'open' ? rows.filter((r) => r.status !== 'completed') : rows;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">What needs to happen and when.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> New task</Button>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-card">
        {(['open', 'all'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'open' ? 'Open' : 'All'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1" />
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                <ListTodo className="mx-auto mb-2 h-5 w-5" />{rows.length === 0 ? 'No tasks yet.' : 'Nothing open. Nice.'}</TableCell></TableRow>
            ) : filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <button onClick={() => toggleDone(t)} className={`flex h-5 w-5 items-center justify-center rounded border ${t.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background hover:border-foreground'}`}>
                    {t.status === 'completed' && <Check className="h-3.5 w-3.5" />}
                  </button>
                </TableCell>
                <TableCell>
                  <div className={`font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div>
                  {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                </TableCell>
                <TableCell><Badge tone={priorityTone(t.priority)}>{t.priority}</Badge></TableCell>
                <TableCell><Badge tone={statusTone(t.status)}>{t.status.replace('_', ' ')}</Badge></TableCell>
                <TableCell>{t.dueDate ? formatDate(t.dueDate) : '—'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(t)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit task' : 'New task'}</DialogTitle><DialogDescription>What to do, by when.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" value={form.title} onChange={set('title')} required /></div>
              <div className="space-y-1.5"><Label htmlFor="priority">Priority</Label>
                <SelectNative id="priority" value={form.priority} onChange={set('priority')}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </SelectNative>
              </div>
              <div className="space-y-1.5"><Label htmlFor="status">Status</Label>
                <SelectNative id="status" value={form.status} onChange={set('status')}>
                  <option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option>
                </SelectNative>
              </div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="dueDate">Due date</Label><Input id="dueDate" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
              <div className="col-span-2 space-y-1.5"><Label htmlFor="description">Description</Label><Textarea id="description" rows={3} value={form.description} onChange={set('description')} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Save' : 'Add task'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
