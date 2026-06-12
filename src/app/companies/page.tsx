'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompanyFormDialog } from '@/components/companies/company-form-dialog';
import { apiDelete, apiGet } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { Company, CompanyListItem } from '@/lib/types';

export default function CompaniesPage() {
  const [rows, setRows] = React.useState<CompanyListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Company | null>(null);
  const [query, setQuery] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CompanyListItem[]>('/api/companies');
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (c: CompanyListItem) => {
    if (!window.confirm(`Delete "${c.name}" and all its payments?`)) return;
    try {
      await apiDelete(`/api/companies/${c.id}`);
      toast.success('Company deleted');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const filtered = rows.filter((r) =>
    query.trim() === ''
      ? true
      : [r.name, r.contactPerson, r.email, r.phone, r.services]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="text-sm text-muted-foreground">Clients, services, and outstanding balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New company
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Services</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-5 w-5" />
                    {rows.length === 0
                      ? 'No companies yet. Add your first one to start tracking payments.'
                      : 'No companies match your search.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{c.name}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                  </TableCell>
                  <TableCell>
                    <div>{c.contactPerson || '—'}</div>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.services || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.monthlyAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={c.outstanding > 0 ? 'font-medium text-amber-700' : 'text-muted-foreground'}>
                      {formatCurrency(c.outstanding)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={c.status === 'active' ? 'success' : 'muted'}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(c)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CompanyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editing ? 'edit' : 'create'}
        initial={editing}
        onSaved={load}
      />
    </div>
  );
}
