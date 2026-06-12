'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, FileText, Copy, FileSignature, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import { buttonVariants, Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { computeTotals } from '@/lib/totals';
import type { Quotation } from '@/lib/types';

function tone(s: string): 'success' | 'warning' | 'info' | 'danger' | 'muted' {
  if (s === 'accepted' || s === 'converted') return 'success';
  if (s === 'sent') return 'info';
  if (s === 'draft') return 'warning';
  if (s === 'rejected') return 'danger';
  return 'muted';
}

export default function QuotationsPage() {
  const [tab, setTab] = React.useState<'quotes' | 'templates'>('quotes');
  const [rows, setRows] = React.useState<Quotation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    apiGet<Quotation[]>(tab === 'templates' ? '/api/quotations?template=true' : '/api/quotations')
      .then(setRows)
      .catch((err) => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [tab]);

  React.useEffect(() => { load(); }, [load]);

  const duplicate = async (q: Quotation, e: React.MouseEvent, asTemplate = false) => {
    e.stopPropagation();
    try {
      const created = await apiPost<{ id: string; number: string }>(`/api/quotations/${q.id}/duplicate`, { asTemplate });
      toast.success(asTemplate ? 'Saved as template' : `Duplicated as ${created.number}`);
      load();
    } catch (err) { toast.error((err as Error).message); }
  };

  const useTemplate = async (q: Quotation, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const created = await apiPost<{ id: string }>(`/api/quotations/${q.id}/use-template`, {});
      toast.success('Created quotation from template');
      window.location.href = `/quotations/edit/?id=${created.id}`;
    } catch (err) { toast.error((err as Error).message); }
  };

  const filtered = rows.filter((r) =>
    query.trim() === '' ? true : [r.number, r.customerName, r.customerEmail, r.templateName].filter(Boolean).some((v) => (v as string).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">Drafts, sent proposals, and accepted quotes. Save quotations as templates for reuse.</p>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          {tab === 'templates' ? (
            <Link href="/quotations/new?template=1" className={buttonVariants()}><FilePlus className="h-4 w-4" /> New template</Link>
          ) : (
            <Link href="/quotations/new" className={buttonVariants()}><Plus className="h-4 w-4" /> New quotation</Link>
          )}
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-card">
        {(['quotes', 'templates'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'quotes' ? 'Quotations' : 'Templates'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tab === 'templates' ? 'Template' : 'Number'}</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>{tab === 'templates' ? '' : 'Valid until'}</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
                    <FileText className="h-5 w-5" />
                    {rows.length === 0
                      ? (tab === 'templates' ? 'No templates yet. Save any quotation as a template to reuse it.' : 'No quotations yet.')
                      : 'No matches.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((q) => {
                const t = computeTotals(q.items, q.discountPercent, q.taxPercent);
                return (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => { window.location.href = `/quotations/edit/?id=${q.id}`; }}>
                    <TableCell className="font-medium">{q.isTemplate ? (q.templateName ?? q.customerName) : q.number}</TableCell>
                    <TableCell>{q.customerName}</TableCell>
                    <TableCell>{formatDate(q.date)}</TableCell>
                    <TableCell>{q.isTemplate ? '' : formatDate(q.validUntil)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(t.total, q.currency)}</TableCell>
                    <TableCell><Badge tone={tone(q.status)}>{q.isTemplate ? 'template' : q.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {q.isTemplate ? (
                          <Button size="icon" variant="ghost" onClick={(e) => useTemplate(q, e)} aria-label="Use as template" title="Create quotation from this template">
                            <FileSignature className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={(e) => duplicate(q, e, false)} aria-label="Duplicate"><Copy className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={(e) => duplicate(q, e, true)} aria-label="Save as template" title="Save as template">
                              <FilePlus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
